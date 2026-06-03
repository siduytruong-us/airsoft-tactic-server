# CLAUDE.md — Airsoft Tactic Server

> **Last updated:** 2026-06-04  
> File này là nguồn sự thật duy nhất về rules, architecture, và system flow. Đọc kỹ trước khi thêm code mới.

---

## 1. STACK

| Layer | Technology |
|-------|-----------|
| Language | Kotlin (JVM 21) |
| Framework | Spring Boot 3.3.4 |
| Build | Gradle Groovy DSL |
| Database | Supabase PostgreSQL (JDBC trực tiếp) |
| ORM | Spring Data JPA + Hibernate 6 |
| Migrations | Flyway (V1 → V7) |
| Spatial | Hibernate Spatial + PostGIS + JTS |
| Auth | Custom JWT (JJWT 0.12.6) — **không dùng Supabase Auth** |
| Security | Spring Security (Stateless, JWT filter) |
| Realtime | WebSocket STOMP (SockJS endpoint `/ws`) |
| GeoJSON | wololo/jts2geojson 0.18.1 |

---

## 2. ARCHITECTURE

```
┌──────────────┐     HTTP/WS      ┌─────────────────────────────┐
│  Mobile App  │ ◄──────────────► │  Spring Boot Server :8080   │
│  (KMP)       │                  │                             │
└──────────────┘                  │  JwtAuthFilter              │
                                  │       ↓                     │
┌──────────────┐     HTTP         │  Controller (REST)          │
│ Admin Web    │ ◄──────────────► │       ↓                     │
│ (Next.js)    │                  │  Service (Business Logic)   │
└──────────────┘                  │       ↓                     │
                                  │  Repository (JPA)           │
                                  │       ↓                     │
                                  └─────────────────────────────┘
                                               ↓
                                  ┌─────────────────────────────┐
                                  │  Supabase PostgreSQL        │
                                  │  + PostGIS extension        │
                                  └─────────────────────────────┘
```

**Pattern:** `Controller → Service → Repository`  
- Controller: nhận/validate request, trả `ResponseEntity<ApiResponse<T>>`  
- Service: toàn bộ business logic, mapping Entity ↔ DTO  
- Repository: Spring Data JPA interface, không có custom query phức tạp trong service  
- Entity **không bao giờ** lộ ra ngoài API — luôn map sang DTO  

---

## 3. PACKAGE STRUCTURE

```
com.airsoft.tactic/
  ├── admin/
  │   ├── controller/       # AdminAuthController, AdminFieldController, AdminUserController
  │   ├── dto/              # AdminLoginRequest/Response, CreateFieldRequest, CreateGameModeRequest
  │   └── service/          # AdminAuthService, AdminManagementService
  │
  ├── config/               # SecurityConfig, WebSocketConfig, SupabaseConfig
  ├── controller/           # AuthController, FieldController, MatchController,
  │                         #   UserController, EventController, GameModeController,
  │                         #   AreaController, HealthController
  ├── dto/
  │   ├── request/          # CreateMatchRequest, JoinTeamRequest, UpdateProfileRequest,
  │   │                     #   DeviceTokenRequest, CreateAreaRequest, UpdateAreaRequest, ...
  │   └── response/         # MatchResponse, FieldResponse, AreaResponse, UserResponse,
  │                         #   AuthResponse, StatsResponse, EventResponse, PageResponse<T>
  ├── entity/               # User, Field, GameMode, GameMatch, Team, MatchPlayer,
  │                         #   GameArea, HitEvent, PlayerStats, RefreshToken,
  │                         #   DeviceToken, Event, Rsvp, AdminAccount
  ├── exception/            # ApiResponse<T>, AppException, GlobalExceptionHandler,
  │                         #   ResourceNotFoundException
  ├── repository/           # *Repository interfaces (Spring Data JPA)
  ├── security/             # JwtAuthFilter
  ├── service/              # AuthService, FieldService, MatchService, UserService,
  │                         #   EventService, AreaService, HealthService
  ├── util/                 # JwtUtil, GeoJsonUtil
  └── websocket/            # MatchEventPublisher
```

---

## 4. SECURITY MODEL

### 4.1. Hai hệ thống auth song song

| Loại | Table | Login | Token |
|------|-------|-------|-------|
| **Player** | `users` | Google OAuth / Apple Sign-In | JWT (sub = userId, role = "player"\|"admin") |
| **Admin** | `admin_accounts` | Username + BCrypt password | JWT (sub = adminId, role = "admin") |

### 4.2. JWT Structure

```
Header: HS512
Payload:
  sub:   UUID (userId hoặc adminId)
  email: string
  role:  "player" | "admin"
  iat:   unix timestamp
  exp:   iat + 3600 (1 giờ)
```

Secret: `SUPABASE_JWT_SECRET` env var  
Refresh token: UUID lưu trong bảng `refresh_tokens`, hết hạn sau 30 ngày

### 4.3. Public endpoints (không cần Bearer)

```
POST /v1/auth/google
POST /v1/auth/apple
POST /v1/auth/refresh
POST /v1/admin/auth/login
POST /v1/admin/auth/bootstrap
GET  /api/game-modes/**
GET  /api/v1/health
WS   /ws/**
```

### 4.4. Authorization

- **Player endpoints** (`/v1/users/*`, `/v1/matches/*`, ...): cần JWT hợp lệ  
- **Admin endpoints** (`/v1/admin/*`): cần JWT với `role = "admin"` — kiểm tra qua `@PreAuthorize("hasRole('ADMIN')")` hoặc manual check trong Controller  
- `ROLE_` prefix được thêm tự động bởi `JwtAuthFilter` (`ROLE_ADMIN`, `ROLE_PLAYER`)

---

## 5. DATABASE SCHEMA

### 5.1. Entity Relationship

```
fields ──< game_modes
fields ──< game_matches
fields ──< events

game_modes ──< game_matches
game_matches ──< teams ──< match_players >── users
game_matches ──< hit_events >── users
game_matches ──< game_areas           ← PostGIS polygon (V7)
game_matches >── teams (winning_team_id)

events ──< rsvps >── users

users ──── player_stats (1:1)
users ──< refresh_tokens
users ──< device_tokens

admin_accounts (standalone — không liên quan users)
```

### 5.2. Bảng chính & mục đích

| Bảng | Mục đích |
|------|---------|
| `users` | Player accounts — auth via Google/Apple |
| `admin_accounts` | Admin accounts — auth via username/password |
| `refresh_tokens` | JWT refresh token rotation |
| `device_tokens` | FCM/APNs tokens cho push notification |
| `fields` | Sân chơi airsoft (lat/lng, isActive) |
| `game_modes` | Template chế độ chơi của sân (rules, respawn config) |
| `game_matches` | Trận đấu thực tế (WAITING → IN_PROGRESS → ENDED) |
| `teams` | Đội trong một match (auto-created khi tạo match) |
| `match_players` | Bảng join user ↔ team ↔ match |
| `game_areas` | Vùng polygon PostGIS của match (V7) |
| `hit_events` | Self-reported HIT events trong game |
| `player_stats` | Aggregate stats của player |
| `events` | Sự kiện/giải đấu |
| `rsvps` | Đăng ký tham dự event |

### 5.3. Match Status Flow

```
WAITING  ──[admin start]──►  IN_PROGRESS  ──[admin end]──►  ENDED
   │                              │
   └──[player join/leave]         └──[player report HIT]
                                  └──[WS broadcast realtime]
```

### 5.4. game_areas (PostGIS — V7)

```sql
game_areas (
  id          UUID PK,
  match_id    UUID FK → game_matches (CASCADE DELETE),
  name        TEXT NOT NULL,
  description TEXT,
  color_hex   TEXT DEFAULT '#FF5733',
  area_type   TEXT CHECK (IN 'SPAWN','OBJECTIVE','BOUNDARY','DANGER','ZONE'),
  polygon     geometry(POLYGON, 4326),   -- SRID 4326 = WGS84
  created_at  TIMESTAMPTZ
)
-- Indexes: btree(match_id), GIST(polygon)
```

Coordinate order: `[longitude, latitude]` — GeoJSON RFC 7946.

---

## 6. API ENDPOINT MAP

### Player APIs

```
# Auth
POST   /v1/auth/google                      → AuthResponse
POST   /v1/auth/apple                       → AuthResponse
POST   /v1/auth/refresh                     → AuthResponse
POST   /v1/auth/logout                      → 204

# User / Profile
GET    /v1/users/me                         → UserResponse (+ stats)
PATCH  /v1/users/me                         → UserResponse
PUT    /v1/users/me/device-token            → 204
GET    /v1/users/me/matches                 → Page<MatchResponse>
GET    /v1/users/{userId}/stats             → StatsResponse

# Fields
GET    /v1/fields                           → Page<FieldResponse>
GET    /v1/fields/{fieldId}                 → FieldResponse (+ gameModes + currentGame)

# Matches
GET    /v1/matches/active                   → MatchResponse | 204
GET    /v1/matches/{matchId}                → MatchResponse (+ teams + players)
GET    /v1/matches/{matchId}/detail         → MatchResponse (alias)
POST   /v1/matches/{matchId}/join           → JoinTeamResponse  [body: {teamId}]
DELETE /v1/matches/{matchId}/leave          → 204
POST   /v1/matches/{matchId}/hit            → HitReportResponse (idempotent)
POST   /v1/matches/{matchId}/ping           → PingResponse  [body: {latitude, longitude, pingType}]

# Areas (read-only cho player)
GET    /v1/matches/{matchId}/areas          → List<AreaResponse>
GET    /v1/matches/{matchId}/areas/{id}     → AreaResponse

# Events
GET    /v1/events                           → Page<EventResponse>
GET    /v1/events/{eventId}                 → EventResponse
POST   /v1/events/{eventId}/rsvp            → 201
DELETE /v1/events/{eventId}/rsvp            → 204

# Legacy
GET    /api/game-modes                      → List<GameModeResponse>  (public)
GET    /api/game-modes/{id}                 → GameModeResponse        (public)
```

### Admin APIs

```
# Auth
POST   /v1/admin/auth/bootstrap             → AdminInfo  (chỉ khi chưa có admin)
POST   /v1/admin/auth/login                 → AdminLoginResponse
POST   /v1/admin/auth/create                → AdminInfo  [ROLE_ADMIN required]

# Stats
GET    /v1/admin/stats                      → Map<String,Any>

# Fields (ROLE_ADMIN)
POST   /v1/admin/fields                     → FieldResponse
PUT    /v1/admin/fields/{fieldId}           → FieldResponse
DELETE /v1/admin/fields/{fieldId}           → 204  (soft delete: isActive=false)
POST   /v1/admin/fields/{fieldId}/game-modes → GameModeResponse
DELETE /v1/admin/fields/game-modes/{gmId}   → 204
GET    /v1/admin/fields/{fieldId}/matches   → List<MatchResponse>

# Users (ROLE_ADMIN)
GET    /v1/admin/users                      → Page<UserSummary>
PATCH  /v1/admin/users/{userId}/role        → UserSummary

# Matches (ROLE_ADMIN — qua MatchController + requireAdmin())
POST   /v1/matches                          → MatchResponse
POST   /v1/matches/{matchId}/start          → MatchResponse
POST   /v1/matches/{matchId}/end            → MatchResponse  [body: {winningTeamId}?]

# Areas (ROLE_ADMIN)
POST   /v1/matches/{matchId}/areas          → AreaResponse
PUT    /v1/matches/{matchId}/areas/{id}     → AreaResponse
DELETE /v1/matches/{matchId}/areas/{id}     → 204

# Events (ROLE_ADMIN)
POST   /v1/events                           → EventResponse
```

---

## 7. RESPONSE WRAPPER

**Mọi API** đều trả về `ResponseEntity<ApiResponse<T>>`:

```kotlin
// Success
ApiResponse(data = T, status = 200|201, timestamp = Instant.now())

// Error (từ GlobalExceptionHandler)
ApiResponse(status = 4xx|5xx, code = "ERROR_CODE", message = "...", path = "...", timestamp = ...)
```

**Pagination** dùng `PageResponse<T>`:
```kotlin
PageResponse(content, page, size, totalElements, totalPages, last)
// Wrapped: ApiResponse<PageResponse<T>>
```

---

## 8. WEBSOCKET / REALTIME

**Endpoint:** `ws://host/ws` (SockJS fallback)  
**Protocol:** STOMP

### Topics

| Topic | Khi subscribe | Events |
|-------|--------------|--------|
| `/topic/match/{matchId}/lobby` | Vào lobby / waiting room | `PLAYER_JOINED`, `PLAYER_LEFT`, `MATCH_STARTED`, `MATCH_ENDED` |
| `/topic/match/{matchId}/game` | Sau khi match IN_PROGRESS | `HIT_REPORTED`, `PING_SENT` |

### Event Payloads

```json
// PLAYER_JOINED
{ "event": "PLAYER_JOINED", "matchId": "...", "teamId": "...",
  "player": { "userId": "...", "displayName": "...", "avatarUrl": "...", "joinedAt": "..." } }

// PLAYER_LEFT
{ "event": "PLAYER_LEFT", "matchId": "...", "teamId": "...", "userId": "..." }

// MATCH_STARTED
{ "event": "MATCH_STARTED", "matchId": "...", "startedAt": "..." }

// MATCH_ENDED
{ "event": "MATCH_ENDED", "matchId": "...", "endedAt": "...", "winningTeamId": "..." }

// HIT_REPORTED
{ "event": "HIT_REPORTED", "matchId": "...", "userId": "...", "respawnAt": "..." }

// PING_SENT
{ "event": "PING_SENT", "matchId": "...", "pingId": "...", "userId": "...",
  "displayName": "...", "latitude": 10.123, "longitude": 106.456,
  "pingType": "ENEMY_SPOTTED", "createdAt": "...", "expiresAt": "..." }
```

---

## 9. COMPLETE SYSTEM FLOW

### Flow 1: Player Onboarding

```
Mobile App
  → POST /v1/auth/google  { idToken }
      Backend: verify Google ID token via Google API
               upsert user vào bảng users
               generate JWT (1h) + refreshToken (30d)
  ← AuthResponse { accessToken, refreshToken, user { isNewUser } }
  → isNewUser == true → show onboarding screen
  → PUT /v1/users/me/device-token  { token, "android"|"ios" }
```

### Flow 2: Browse Fields → Join Match

```
Player
  → GET /v1/fields?page=0&size=20
  ← Page<FieldResponse> { isLive, activeMatchId, gameModes[] }
  
  → GET /v1/fields/{fieldId}
  ← FieldResponse { currentGame { teams[], playerCount } }
  
  → GET /v1/matches/{activeMatchId}
  ← MatchResponse { canJoin, teams[{ id, name, colorHex, players[] }] }
  
  → POST /v1/matches/{matchId}/join  { teamId }
  ← JoinTeamResponse
  
  WS: subscribe /topic/match/{matchId}/lobby
      ← PLAYER_JOINED events từ player khác
```

### Flow 3: Admin Creates & Starts Match

```
Admin
  → POST /v1/matches  { fieldId, gameModeId }
      Backend: tạo GameMatch status=WAITING
               auto-create N teams (theo gameMode.teamCount)
               teams: Alpha/Bravo/... với màu sắc khác nhau
  ← MatchResponse

  → POST /v1/admin/fields/{fieldId}/areas  (draw on map)
  → POST /v1/matches/{matchId}/areas  { name, areaType, geometry: GeoJSON }
      Backend: parse GeoJSON → JTS Polygon
               validate polygon (isValid, ≥4 points)
               lưu geometry(POLYGON,4326) vào game_areas
  ← AreaResponse

  → POST /v1/matches/{matchId}/start
      Backend: status = IN_PROGRESS, startedAt = now()
      WS broadcast: MATCH_STARTED → /topic/match/{matchId}/lobby
  ← MatchResponse
```

### Flow 4: Gameplay (In-Progress Match)

```
Player (trong match)
  → GET /v1/matches/{matchId}/areas
  ← List<AreaResponse> { geometry: GeoJSON Polygon }
  Mobile: render polygon overlay trên bản đồ
  
  WS: subscribe /topic/match/{matchId}/game
  
  [Bị bắn]
  → POST /v1/matches/{matchId}/hit
      Backend: idempotent — check hit gần nhất trong respawnDelay giây
               nếu chưa: tạo HitEvent, respawnAt = now() + respawnDelaySeconds
               WS broadcast HIT_REPORTED
  ← HitReportResponse { respawnAt }
  Mobile: countdown timer đến respawnAt
```

### Flow 5: End Match & Stats Update

```
Admin
  → POST /v1/matches/{matchId}/end  { winningTeamId? }
      Backend: status = ENDED, endedAt = now()
               tính durationSeconds
               cập nhật player_stats (wins/losses/draws/kills/deaths)
      WS broadcast: MATCH_ENDED → /topic/match/{matchId}/lobby
  ← MatchResponse { winningTeamId, winningTeamName, durationSeconds }
  
Player
  → GET /v1/users/{userId}/stats
  ← StatsResponse { totalMatches, wins, winRate, totalKills, totalDeaths }
```

### Flow 6: Token Refresh

```
Mobile (khi nhận 401 Unauthorized)
  → POST /v1/auth/refresh  { refreshToken }
      Backend: validate refresh token còn hạn trong DB
               generate JWT mới + refreshToken mới (rotation)
               vô hiệu hóa refreshToken cũ
  ← AuthResponse { accessToken, refreshToken }
  Mobile: update stored tokens, retry original request
```

---

## 10. CODE RULES

### Bắt buộc
- **Mọi DTO** dùng `@field:NotNull`, `@field:NotBlank`, v.v. (Kotlin annotation syntax)
- **Mọi response** qua `ResponseEntity<ApiResponse<T>>` — không return raw object
- **Entity không expose** — luôn map sang DTO trong Service layer
- **Service có `@Transactional`** khi write (create/update/delete)
- **Repository** chỉ là interface Spring Data JPA — không business logic
- **Exception** dùng `AppException.notFound()`, `.conflict()`, `.unprocessable()`, `.forbidden()`
- **GeoJSON geometry** xử lý qua `GeoJsonUtil` — không parse thủ công
- **Sau mỗi task hoàn thành**, bắt buộc cập nhật file CLAUDE.md này:
  - Cập nhật `Last updated` ở đầu file.
  - Nếu có API mới: bổ sung vào **Section 6 (API Endpoint Map)**.
  - Nếu có WS event mới: bổ sung vào **Section 8 (WebSocket)** — cả bảng Topics lẫn Event Payloads.
  - Nếu có entity/bảng mới: bổ sung vào **Section 5 (Database Schema)**.
  - Nếu có package/file mới: cập nhật **Section 3 (Package Structure)**.
  - Nếu có migration mới: ghi chú số version hiện tại (VD: Flyway V1 → V8).

### Naming conventions
- Branch: `feat/<feature>`, `fix/<bug>`, `chore/<task>`
- Migration: `V{n}__{description}.sql` — tăng version, không sửa file cũ
- Entity file: `UpperCamelCase.kt`
- DTO file: `[Purpose][Request|Response].kt` (VD: `CreateAreaRequest`, `AreaResponse`)

### Kotlin style
- Dùng `data class` cho DTO
- Entity dùng `class` (không `data class`) — Hibernate yêu cầu mutable
- `allOpen` plugin đã cấu hình cho `@Entity`, `@Transactional`, `@RestController`
- Không dùng Lombok (Kotlin không cần)
- Null safety: prefer `?.let`, `?: throw AppException.notFound()`

---

## 11. DEPENDENCIES KEY

```groovy
// Core
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-security
spring-boot-starter-validation
spring-boot-starter-websocket
spring-boot-starter-webflux       // WebClient cho Google/Apple token verify

// Database
org.postgresql:postgresql
org.flywaydb:flyway-core
org.flywaydb:flyway-database-postgresql
org.hibernate.orm:hibernate-spatial  // PostGIS + JTS geometry
org.wololo:jts2geojson:0.18.1        // GeoJSON ↔ JTS convert

// Auth
io.jsonwebtoken:jjwt-api:0.12.6
io.jsonwebtoken:jjwt-impl:0.12.6
io.jsonwebtoken:jjwt-jackson:0.12.6

// Kotlin
kotlin-reflect, kotlin-stdlib
jackson-module-kotlin
```

---

## 12. ENVIRONMENT VARIABLES

```bash
# Database (Supabase)
SUPABASE_DB_URL=jdbc:postgresql://db.<ref>.supabase.co:5432/postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<password>

# JWT
SUPABASE_JWT_SECRET=<min-32-char-secret>

# Supabase API (optional — dùng cho storage nếu cần)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # NEVER expose client-side

# Server
PORT=8080
SPRING_PROFILE=dev|prod
```

---

## 13. COMMON COMMANDS

```bash
./gradlew bootRun                    # Run dev (profile=dev)
./gradlew test                       # Run tests
./gradlew bootJar                    # Build JAR
java -jar build/libs/*.jar           # Run JAR

# Docker
docker-compose up -d                 # Start với docker-compose.yml
docker build -t airsoft-tactic .     # Build image
```

---

## 14. FILE MAP

| File | Mục đích |
|------|---------|
| `CLAUDE.md` | Rules + system flow (file này) |
| `SPEC.md` | Product spec + User Stories |
| `ADMIN_API_CONTRACT_PROMPT.md` | API contract cho Admin Dashboard (Next.js) |
| `ADMIN_DASHBOARD_PROMPT.md` | System prompt cho Admin frontend developer |
| `ADMIN_AREAS_PROMPT.md` | Addendum: Areas feature cho Admin Dashboard |
| `KMP_MOBILE_API_PROMPT.md` | Full API contract + KMP integration guide cho mobile |
| `README.md` | Setup guide |
| `SYSTEM_DESIGN.md` | Detailed system design document |
| `AirsoftTac.postman_collection.json` | Postman collection — test API |
