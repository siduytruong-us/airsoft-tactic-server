# CLAUDE.md — Airsoft Tactic Server
> Last updated: 2026-06-05 (Realtime Teammate Location — LocationController, updateLocation, locationUpdate)

## Stack

| Layer | Technology |
|---|---|
| Language | Kotlin / JVM 21 |
| Framework | Spring Boot 3.3.4 |
| ORM | Spring Data JPA + Hibernate 6 + Hibernate Spatial |
| Database | Supabase PostgreSQL + PostGIS · Flyway V1→V8 |
| Auth | Custom JWT (JJWT 0.12.6, HS512) — không dùng Supabase Auth |
| Realtime | WebSocket STOMP — SockJS endpoint `/ws` |
| GeoJSON | wololo/jts2geojson 0.18.1 |

---

## Architecture

**Pattern:** `Controller → Service → Repository`
- Controller: validate request → trả `ResponseEntity<ApiResponse<T>>`
- Service: business logic + map Entity ↔ DTO + `@Transactional` khi write
- Repository: Spring Data JPA interface only — không có logic
- Entity **không expose** ra ngoài — luôn map sang DTO trong Service

**Auth — 2 hệ thống song song:**
- Player: Google/Apple OAuth → JWT (`role=player`)
- Admin: username/bcrypt → JWT (`role=admin`)
- JWT: HS512, 1h expiry, `SUPABASE_JWT_SECRET` env var
- Refresh token: UUID trong `refresh_tokens`, 30d

**Public endpoints:** `/v1/auth/**`, `/v1/admin/auth/login`, `/api/game-modes/**`, `/api/v1/health`, `/ws/**`

---

## Database (Flyway V1→V8)

**Match flow:** `WAITING` →[admin start]→ `IN_PROGRESS` →[admin end]→ `ENDED`

| Bảng | Mục đích |
|---|---|
| `users` | Player accounts (Google/Apple) |
| `admin_accounts` | Admin accounts (username/bcrypt) |
| `refresh_tokens` | JWT rotation (30d) |
| `device_tokens` | FCM/APNs tokens |
| `fields` | Sân chơi (lat/lng, isActive) |
| `game_modes` | Template: team count, respawn config |
| `game_matches` | Trận đấu: WAITING→IN_PROGRESS→ENDED |
| `teams` | Đội trong match (auto-created) |
| `match_players` | Join: user ↔ team ↔ match |
| `game_areas` | Polygon PostGIS V7 (SRID 4326) |
| `hit_events` | Self-reported HIT (idempotent) |
| `ping_events` | Realtime enemy pings V8 |
| `player_stats` | Aggregate stats (1:1 users) |
| `events` | Sự kiện/giải đấu |
| `rsvps` | Player đăng ký event |

`game_areas` + `ping_events` dùng `geometry(POLYGON/POINT, 4326)`. Coordinate order: `[lng, lat]`.

---

## API Endpoints

```
# Auth (public)
POST /v1/auth/google|apple|refresh  POST /v1/auth/logout

# Player
GET/PATCH /v1/users/me              GET /v1/users/{id}/stats
PUT /v1/users/me/device-token       GET /v1/users/me/matches
GET /v1/fields                      GET /v1/fields/{id}
GET /v1/matches/active              GET /v1/matches/{id}[/detail]
POST /v1/matches/{id}/join          DELETE /v1/matches/{id}/leave
POST /v1/matches/{id}/hit           POST /v1/matches/{id}/ping
GET /v1/matches/{id}/areas[/{aId}]
GET /v1/events[/{id}]               POST/DELETE /v1/events/{id}/rsvp

# Admin (ROLE_ADMIN)
POST /v1/admin/auth/login|bootstrap|create
GET /v1/admin/stats
POST/PUT/DELETE /v1/admin/fields[/{id}]
POST/DELETE /v1/admin/fields/{id}/game-modes[/{gmId}]
GET /v1/admin/fields/{id}/matches
GET /v1/admin/users                 PATCH /v1/admin/users/{id}/role
POST /v1/matches                    POST /v1/matches/{id}/start|end
POST/PUT/DELETE /v1/matches/{id}/areas[/{aId}]
POST /v1/events
```

---

## WebSocket

**Endpoint:** `ws://host/ws` (SockJS)  **Protocol:** STOMP

| Topic | Events |
|---|---|
| `/topic/match/{matchId}/lobby` | `PLAYER_JOINED`, `PLAYER_LEFT`, `MATCH_STARTED`, `MATCH_ENDED` |
| `/topic/match/{matchId}/game` | `HIT_REPORTED`, `PING_SENT` |
| `/topic/match/{matchId}/team/{teamId}` | `LOCATION_UPDATE` |

**PING_SENT payload:**
```json
{ "event":"PING_SENT", "matchId":"...", "pingId":"...", "userId":"...", "displayName":"...",
  "latitude":10.1, "longitude":106.4, "pingType":"ENEMY_SPOTTED",
  "createdAt":"...", "expiresAt":"..." }
```

**LOCATION_UPDATE payload** (broadcast tới `/topic/match/{matchId}/team/{teamId}`):
```json
{ "event":"LOCATION_UPDATE", "matchId":"uuid", "userId":"uuid", "teamId":"uuid",
  "displayName":"string", "latitude":10.1, "longitude":106.4, "isAlive":true, "updatedAt":"ISO8601" }
```

**WS SEND từ client (location):**
```
SEND
destination:/app/match/{matchId}/location
content-type:application/json

{"latitude": 10.1, "longitude": 106.4}
```

**isAlive logic:** `false` nếu tồn tại `hit_event` với `respawnAt > now()`. Không lưu location vào DB.

---

## Code Rules

- DTO: `@field:NotNull`, `@field:NotBlank` (Kotlin annotation syntax)
- Response: luôn `ResponseEntity<ApiResponse<T>>` — không return raw object
- Exception: `AppException.notFound()` / `.conflict()` / `.unprocessable()` / `.forbidden()`
- GeoJSON: qua `GeoJsonUtil` — không parse thủ công
- DTO: `data class` · Entity: `class` (Hibernate mutable) · không dùng Lombok
- Migration: `V{n}__desc.sql` — tăng version, không sửa file cũ
- Null safety: `?.let`, `?: throw AppException.notFound()`
- **Sau mỗi task:** cập nhật `Last updated`, API map, WS section, DB schema, package structure nếu có thay đổi.

---

## Role Report

### 2026-06-05 — Realtime Teammate Location (server side)

**Files tạo mới:**
- `src/main/kotlin/com/airsoft/tactic/dto/request/LocationRequest.kt` — payload DTO `{ latitude, longitude }`
- `src/main/kotlin/com/airsoft/tactic/websocket/LocationController.kt` — `@Controller` với `@MessageMapping("/match/{matchId}/location")`, extract userId từ `SimpMessageHeaderAccessor.user.name`, gọi `MatchService.updateLocation`

**Files sửa:**
- `src/main/kotlin/com/airsoft/tactic/service/MatchService.kt` — thêm `updateLocation()`: validate `IN_PROGRESS`, validate player trong match, tính `isAlive` qua `hitEventRepository.existsActiveHitForPlayer`, gọi `eventPublisher.locationUpdate()`
- `src/main/kotlin/com/airsoft/tactic/websocket/MatchEventPublisher.kt` — thêm `locationUpdate()`: broadcast tới `/topic/match/{matchId}/team/{teamId}` với đủ payload LOCATION_UPDATE
- `src/main/kotlin/com/airsoft/tactic/repository/HitEventRepository.kt` — thêm query `existsActiveHitForPlayer(matchId, userId, now)` kiểm tra `respawnAt > now`

**Không thay đổi:** `WebSocketConfig.kt` (`/app` prefix đã có sẵn).

**Constraints tuân thủ:** silent return thay vì throw trong WS context; không lưu location vào DB; không tạo REST endpoint.
