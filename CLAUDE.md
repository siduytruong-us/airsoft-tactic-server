# CLAUDE.md — AirsoftTac Node.js Server
> Migrated from Spring Boot 3.3.4 (Kotlin) → NestJS 10 (TypeScript)
> Last updated: 2026-06-12

## Role
Bạn là **senior Node.js backend developer** chuyên về:
- Realtime systems (WebSocket, pub/sub, room-based broadcasting)
- Map / GeoJSON / PostGIS integration
- Migrating Java/Spring Boot projects sang Node.js/NestJS
- TypeScript strict-mode, NestJS architecture patterns

Trước khi viết bất kỳ dòng code nào, đọc CLAUDE.md này từ đầu đến cuối. Đặc biệt Section 7 (Code Rules) và Section 5 (WebSocket Protocol).

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | 5.x, strict mode |
| Framework | NestJS | 10.x |
| Runtime | Node.js | 20 LTS |
| ORM | TypeORM | 0.3.x |
| Database | PostgreSQL 16 + PostGIS 3.4 | Không đổi schema |
| Auth | `@nestjs/jwt` + `jsonwebtoken` | HS512 algorithm |
| Password | `bcrypt` | rounds=12 |
| WebSocket | NestJS `@WebSocketGateway` + `ws` adapter | Custom JSON protocol |
| HTTP Client | `axios` | Google token verify |
| Validation | `class-validator` + `class-transformer` | |
| Config | `@nestjs/config` | `.env` + `.env.local` |
| Package manager | `pnpm` | |

**Dependencies cần install:**
```bash
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/websockets @nestjs/platform-ws
pnpm add @nestjs/typeorm typeorm pg
pnpm add @nestjs/jwt @nestjs/config @nestjs/mapped-types
pnpm add class-validator class-transformer
pnpm add bcrypt axios
pnpm add -D @types/node @types/bcrypt @types/ws typescript ts-node
```

---

## 2. Architecture

**Pattern:** `Controller → Service → Repository` (giống Spring Boot)

```
Request → JwtAuthGuard → Controller → Service → TypeORM Repository → PostgreSQL
                                         ↕
                              MatchEventPublisher → WsGateway → broadcast()
```

- **Controller:** validate request (DTO + class-validator), gọi Service, return `ApiResponse<T>`
- **Service:** business logic, map Entity ↔ DTO, inject Repository + EventPublisher
- **Repository:** TypeORM `Repository<Entity>` — không có logic
- **Entity:** không expose ra ngoài — luôn map sang DTO trong Service
- **WsGateway:** quản lý rooms, auth tại JOIN_MATCH, dispatch events

**Module structure:**
```
AppModule
├── AuthModule        — Google/Apple OAuth, JWT, refresh tokens
├── AdminModule       — admin auth, field/user management
├── UserModule        — player profile, stats, device tokens
├── FieldModule       — sân chơi
├── MatchModule       — match lifecycle, hit, ping, area (PostGIS)
├── EventModule       — sự kiện/giải đấu
├── GameModeModule    — template (public, read-only)
├── HealthModule      — /api/v1/health
├── WsModule          — WebSocket gateway + event publisher
└── DatabaseModule    — TypeORM config
```

---

## 3. Project Structure

```
src/
├── main.ts                         — bootstrap NestJS app
├── app.module.ts
│
├── common/
│   ├── guards/
│   │   ├── jwt.guard.ts            — JwtAuthGuard (thay Spring Security filter)
│   │   └── admin.guard.ts          — AdminGuard (check role === 'admin')
│   ├── decorators/
│   │   └── current-user.decorator.ts  — @CurrentUser() → { userId, email, role }
│   ├── filters/
│   │   └── http-exception.filter.ts   — wrap lỗi thành ApiResponse<null>
│   ├── interceptors/
│   │   └── response.interceptor.ts    — wrap response thành ApiResponse<T>
│   └── utils/
│       └── jwt.util.ts             — sign/verify HS512
│
├── websocket/
│   ├── ws.gateway.ts               — @WebSocketGateway('/ws')
│   ├── ws.types.ts                 — WsSession, IncomingMessage, MessageType
│   └── match-event.publisher.ts    — broadcast() service (inject vào MatchService)
│
├── auth/
│   ├── auth.controller.ts          — /v1/auth/google|apple|refresh|logout
│   ├── auth.service.ts
│   ├── dto/
│   └── auth.module.ts
│
├── admin/
│   ├── admin-auth.controller.ts    — /v1/admin/auth/login|bootstrap|create
│   ├── admin-field.controller.ts   — /v1/admin/fields CRUD
│   ├── admin-user.controller.ts    — /v1/admin/users
│   ├── admin-auth.service.ts
│   ├── admin-management.service.ts
│   ├── dto/
│   └── admin.module.ts
│
├── users/
│   ├── users.controller.ts         — /v1/users/me, device-token, stats, matches
│   ├── users.service.ts
│   ├── dto/
│   └── users.module.ts
│
├── fields/
│   ├── fields.controller.ts        — /v1/fields
│   ├── fields.service.ts
│   ├── dto/
│   └── fields.module.ts
│
├── matches/
│   ├── matches.controller.ts       — /v1/matches/**
│   ├── matches.service.ts          — core business logic
│   ├── areas.service.ts            — PostGIS game areas
│   ├── dto/
│   └── matches.module.ts
│
├── events/
│   ├── events.controller.ts        — /v1/events
│   ├── events.service.ts
│   ├── dto/
│   └── events.module.ts
│
├── game-modes/
│   ├── game-modes.controller.ts    — /api/game-modes (public)
│   ├── game-modes.service.ts
│   └── game-modes.module.ts
│
├── health/
│   └── health.controller.ts        — /api/v1/health (public)
│
└── database/
    ├── database.module.ts          — TypeORM config
    └── entities/
        ├── user.entity.ts
        ├── admin-account.entity.ts
        ├── refresh-token.entity.ts
        ├── device-token.entity.ts
        ├── field.entity.ts
        ├── game-mode.entity.ts
        ├── game-match.entity.ts
        ├── team.entity.ts
        ├── match-player.entity.ts
        ├── game-area.entity.ts     — PostGIS polygon
        ├── hit-event.entity.ts
        ├── ping-event.entity.ts    — PostGIS point
        ├── player-stats.entity.ts
        ├── event.entity.ts
        └── rsvp.entity.ts
```

---

## 4. Database Schema

**Không thay đổi schema.** Dùng TypeORM với `synchronize: false` — Flyway migrations V1→V9 đã apply sẵn.

| Bảng | Entity | Ghi chú |
|---|---|---|
| `users` | `User` | Player (Google/Apple OAuth) |
| `admin_accounts` | `AdminAccount` | username + bcrypt |
| `refresh_tokens` | `RefreshToken` | UUID token, 30d expiry |
| `device_tokens` | `DeviceToken` | FCM/APNs |
| `fields` | `Field` | lat/lng, isActive, is_verified (badge, default false, set bởi admin) |
| `game_modes` | `GameMode` | teamCount, respawnDelaySeconds |
| `game_matches` | `GameMatch` | WAITING→IN_PROGRESS→ENDED |
| `teams` | `Team` | auto-created khi tạo match |
| `match_players` | `MatchPlayer` | join: user ↔ team ↔ match |
| `game_areas` | `GameArea` | `geometry(POLYGON, 4326)` — raw SQL |
| `hit_events` | `HitEvent` | self-reported, idempotent |
| `ping_events` | `PingEvent` | `geometry(POINT, 4326)` — raw SQL |
| `player_stats` | `PlayerStats` | aggregate, 1:1 với users |
| `events` | `Event` | sự kiện/giải đấu |
| `rsvps` | `Rsvp` | player đăng ký event |
| `field_hours` | `FieldHour` | giờ mở cửa 7 ngày/tuần, UNIQUE(field_id, day_of_week) |

**PostGIS — dùng raw SQL qua DataSource:**
```typescript
// Đọc polygon
const rows = await this.ds.query(
  `SELECT id, name, ST_AsGeoJSON(boundary)::json AS geojson FROM game_areas WHERE match_id = $1`,
  [matchId]
);

// Ghi polygon
await this.ds.query(
  `INSERT INTO game_areas (id, match_id, name, boundary)
   VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))`,
  [id, matchId, name, JSON.stringify(geojson)]
);

// isAlive check
const hit = await this.ds.query(
  `SELECT 1 FROM hit_events WHERE match_id=$1 AND user_id=$2 AND respawn_at > NOW() LIMIT 1`,
  [matchId, userId]
);
const isAlive = hit.length === 0;
```

---

## 5. WebSocket Protocol

**Endpoint:** `ws://host/ws`

### 5.1 Client → Server

```typescript
// Xác thực + join phòng (sau khi WS connected)
{ type: 'JOIN_MATCH', matchId: string, teamId: string, token: string }  // token = "Bearer eyJ..."

// Gửi location realtime
{ type: 'LOCATION', matchId: string, latitude: number, longitude: number }

// Self-revive (sau 10s hold trong WOUNDED state)
{ type: 'SELF_REVIVE', matchId: string }
```

### 5.2 Server → Client

```typescript
// Join thành công
{ event: 'CONNECTED', matchId: string, userId: string }

// Lỗi
{ event: 'ERROR', code: string, message: string }

// Events broadcast (payload KHÔNG ĐỔI so với Spring Boot)
{ event: 'PLAYER_JOINED', matchId, teamId, player: { userId, displayName, avatarUrl, joinedAt } }
{ event: 'PLAYER_LEFT', matchId, teamId, userId }
{ event: 'MATCH_STARTED', matchId, startedAt }
{ event: 'MATCH_ENDED', matchId, endedAt, winningTeamId? }
{ event: 'HIT_REPORTED', matchId, userId, respawnAt }
{ event: 'PING_SENT', matchId, pingId, userId, displayName, latitude, longitude, pingType, createdAt, expiresAt }
{ event: 'LOCATION_UPDATE', matchId, userId, teamId, displayName, latitude, longitude, isAlive, respawnAt: string|null, updatedAt }
```

### 5.3 Room Architecture

```typescript
// WsGateway quản lý 2 loại room:
matchRooms: Map<matchId, Set<WebSocket>>            // nhận lobby + game events
teamRooms:  Map<`${matchId}:${teamId}`, Set<WebSocket>>  // nhận location updates

// MatchEventPublisher.broadcast():
broadcastToMatch(matchId, payload)                  // → lobby, game events
broadcastToTeam(matchId, teamId, payload)           // → location updates
```

### 5.4 Auth Flow tại WS

```
1. Client connect ws://host/ws  → chưa auth, chờ JOIN_MATCH
2. Client gửi JOIN_MATCH { token, matchId, teamId }
3. Server validate JWT → extract userId
4. Server verify userId là member của matchId + teamId (DB query)
5. Server add client vào matchRooms[matchId] và teamRooms[matchId:teamId]
6. Server reply { event: 'CONNECTED', matchId, userId }
7. Client gửi LOCATION → server extract userId từ session
```

### 5.5 Disconnect Cleanup

```typescript
handleDisconnect(client: WebSocket) {
  const session = this.sessions.get(client);
  if (!session) return;
  // Xóa khỏi tất cả rooms
  this.matchRooms.get(session.matchId)?.delete(client);
  this.teamRooms.get(`${session.matchId}:${session.teamId}`)?.delete(client);
  this.sessions.delete(client);
}
```

---

## 6. REST API

### Public (không cần JWT)
```
POST /v1/auth/google               body: { idToken }
POST /v1/auth/apple                body: { identityToken, displayName?, email? }
POST /v1/auth/refresh              body: { refreshToken }
POST /v1/auth/logout               body: { refreshToken }
GET  /api/game-modes
GET  /api/v1/health
POST /v1/admin/auth/login          body: { username, password }
POST /v1/admin/auth/bootstrap      (no body — upsert admin:Admin123@)
```

### Player (JWT required, role=player|admin)
```
GET    /v1/users/me
PATCH  /v1/users/me                body: { displayName?, avatarUrl? }
PUT    /v1/users/me/device-token   body: { token, platform }
GET    /v1/users/{id}/stats
GET    /v1/users/me/matches
GET    /v1/fields
GET    /v1/fields/{id}
GET    /v1/matches/active
GET    /v1/matches/{id}
POST   /v1/matches/{id}/join       body: { teamId }
DELETE /v1/matches/{id}/leave
POST   /v1/matches/{id}/hit
POST   /v1/matches/{id}/ping       body: { latitude, longitude, pingType }
GET    /v1/matches/{id}/my-status           → { isAlive: boolean, respawnAt: string|null }
GET    /v1/matches/{id}/areas
GET    /v1/matches/{id}/areas/{areaId}
GET    /v1/events
GET    /v1/events/{id}
POST   /v1/events/{id}/rsvp
DELETE /v1/events/{id}/rsvp
```

### Admin (JWT required, role=admin)
```
POST   /v1/admin/auth/create       body: { username, password, displayName }
GET    /v1/admin/stats
GET    /v1/admin/users
PATCH  /v1/admin/users/{id}/role   body: { role }
POST   /v1/admin/fields            body: { name, description, latitude, longitude, ... }
GET    /v1/admin/fields/{id}
PUT    /v1/admin/fields/{id}
DELETE /v1/admin/fields/{id}
POST   /v1/admin/fields/{id}/game-modes
DELETE /v1/admin/fields/{id}/game-modes/{gmId}
GET    /v1/admin/fields/{id}/matches
POST   /v1/matches                 body: { fieldId, gameModeId } ← admin tạo match
POST   /v1/matches/{id}/start
POST   /v1/matches/{id}/end        body: { winningTeamId? }
POST   /v1/matches/{id}/areas      body: { name, geojson }
PUT    /v1/matches/{id}/areas/{aId}
DELETE /v1/matches/{id}/areas/{aId}
POST   /v1/events                  body: { fieldId, name, startAt, endAt, ... }
PUT    /v1/admin/fields/{id}/hours body: { hours: [{ dayOfWeek, openTime, closeTime, isClosed }] }
POST   /v1/admin/fields/{id}/cover-image  multipart/form-data, field "file" → { coverImageUrl }
POST   /v1/admin/maps/{id}/cover-image    multipart/form-data, field "file" → { coverImageUrl }
```

### Response Format (bất biến)
```typescript
// Luôn trả về shape này — dùng ResponseInterceptor để wrap tự động
interface ApiResponse<T> {
  status: 'ok' | 'created' | 'error';
  data: T | null;
  message: string | null;
  code: string | null;    // error code, null khi success
}
```

---

## 7. Code Rules

### TypeScript
- `strict: true` trong tsconfig — không bypass với `any`
- Không dùng `as any` — dùng type guard hoặc proper typing
- Prefer `interface` cho DTOs/responses, `type` cho unions
- `readonly` cho fields không được mutate

### NestJS patterns
- Mỗi module tự import những gì nó cần (không import tất cả vào AppModule)
- Guard: `@UseGuards(JwtAuthGuard)` ở controller level, không ở từng method
- `@CurrentUser()` decorator để lấy userId từ request — không đọc `req.user` thủ công
- Exception: throw `NotFoundException`, `ForbiddenException`, `ConflictException`, `UnprocessableEntityException` — filter sẽ tự wrap thành ApiResponse error
- DTO validation: luôn dùng `@IsUUID()`, `@IsString()`, `@IsNumber()`, `@IsNotEmpty()` từ `class-validator`

### TypeORM
- `synchronize: false` — không bao giờ để TypeORM tự đổi schema
- PostGIS: raw SQL qua `DataSource.query()` — không dùng TypeORM geometry column
- Repository: inject qua `@InjectRepository(Entity)` — không dùng `EntityManager` trực tiếp
- Transaction: `dataSource.transaction(async manager => { ... })` khi cần atomic

### WebSocket
- Tất cả WS logic nằm trong `WsGateway` và `MatchEventPublisher`
- `MatchService` không biết gì về WebSocket — chỉ gọi `this.eventPublisher.xxx()`
- Không throw exception trong WS handlers — send `{ event: 'ERROR', ... }` và return
- Luôn cleanup rooms trong `handleDisconnect`
- Async ping save: `setImmediate(() => this.pingRepo.save(ping).catch(err => logger.error(err)))`

### Auth
- JWT algorithm: **HS512** — explicit trong cả sign và verify
- WS auth: validate tại `JOIN_MATCH` message, không phải tại connection time
- `userId` luôn là UUID string — validate bằng `isUUID(v4)`

### Naming conventions
- Files: `kebab-case.ts` (e.g., `match-event.publisher.ts`)
- Classes: `PascalCase`
- Methods/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DTOs: suffix `Dto` (e.g., `CreateMatchDto`, `MatchResponseDto`)
- Entities: suffix `Entity` không bắt buộc nhưng consistent trong project

### Không làm
- Không expose Entity trực tiếp từ Controller
- Không dùng `@Body() body: any` — luôn có DTO typed
- Không hardcode credentials — dùng `@nestjs/config`
- Không `console.log` — dùng NestJS `Logger`

---

## 8. Environment Variables

```env
# Database — luôn là Supabase Postgres (không có local DB, kể cả khi dev local)
# Dùng IPv4 transaction pooler (Supavisor) — direct host db.<ref>.supabase.co là
# IPv6-only và ECONNREFUSED trên network IPv4-only. Lấy connection string từ
# Supabase Dashboard > Connect > ORM.
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.<project-ref>
DB_PASSWORD=<supabase-db-password>
# Supabase Postgres yêu cầu SSL. Mặc định true, chỉ set false nếu thật cần.
DB_SSL=true

# JWT (cùng secret với Spring Boot — token cũ vẫn valid)
JWT_SECRET=<SUPABASE_JWT_SECRET>
JWT_EXPIRES_IN=3600

# App
PORT=8080
NODE_ENV=local

# CORS
CORS_ORIGIN=http://localhost:3000
```

`DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_SSL` đều có default trong `database.module.ts`
(default host = production Supabase project), nên `.env.local` chỉ cần set `DB_PASSWORD`
(lấy từ Supabase Dashboard > Project Settings > Database > Connection string).

### Staging / Production

2 environments, cùng point đến 1 production Supabase project (budget setup).
`ConfigModule.forRoot` chọn env file theo `NODE_ENV`:
`NODE_ENV=staging` → `.env.staging` (+ `.env.staging.local`), `NODE_ENV=production` → `.env.production`
(+ `.env.production.local`), fallback `.env.local`/`.env`.

- `.env.staging.example` / `.env.production.example` — templates (copy → `.env.staging` / `.env.production`, không commit).
- `CORS_ORIGIN` hỗ trợ comma-separated list (nhiều admin origin).
- Scripts: `npm run start:staging` / `start:production`, `build:staging` / `build:production`.
- Staging CORS_ORIGIN mặc định: `https://admin-staging.airtac.app`; Production: `https://admin.airtac.app`.

### Supabase Storage (server-side upload proxy)

```env
# Project URL + service_role key — dùng cho server-side cover image upload proxy
# SUPABASE_SERVICE_ROLE_KEY KHÔNG BAO GIỜ expose ra client (khác với NEXT_PUBLIC_SUPABASE_ANON_KEY ở admin)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
```

- Set cho staging + production qua `flyctl secrets set -c fly.staging.toml SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...` (tương tự `-c fly.production.toml`)
- Buckets hiện có trên Supabase: `field-covers`, `map-covers` (public read, upload qua service_role)
- Object key xác định theo entity: `field-{fieldId}.{ext}`, `map-{mapId}.{ext}` — upload với `x-upsert: true` để tự đè ảnh cũ

### Deploy — Fly.io

- 2 Fly apps, mỗi app = 1 environment: `airtac-staging`, `airsoft-tactic-server-production`
- Config: `fly.staging.toml` / `fly.production.toml` (region `sin`, `shared-cpu-1x`/256mb, `min_machines_running = 1` để giữ WebSocket connections sống)
- `[build]` dùng `Dockerfile` hiện có — không cần thay đổi
- Secrets (DB_*, JWT_SECRET, CORS_ORIGIN...) set qua `flyctl secrets set -c fly.staging.toml KEY=value` (không dùng `.env` file trong image)
- CI/CD: `.github/workflows/deploy.yml`
  - **build-and-test**: luôn chạy (lint + build + test)
  - **deploy-staging**: auto khi push `develop`, hoặc `workflow_dispatch` với `environment=staging`
  - **deploy-production**: CHỈ chạy qua `workflow_dispatch` với `environment=production` (manual)
  - Cần GitHub secret `FLY_API_TOKEN` (tạo bằng `flyctl tokens create deploy -x 999999h`), set trong Settings → Environments → staging & production
- Setup lần đầu (1 lần per app):
  ```bash
  flyctl auth login
  flyctl apps create airtac-staging
  flyctl apps create airsoft-tactic-server-production
  flyctl secrets set -c fly.staging.toml DB_HOST=... DB_PASSWORD=... JWT_SECRET=... CORS_ORIGIN=...
  flyctl secrets set -c fly.production.toml DB_HOST=... DB_PASSWORD=... JWT_SECRET=... CORS_ORIGIN=...
  ```
- Domain: gắn custom domain qua `flyctl certs add api-staging.airtac.app -c fly.staging.toml` (tương tự cho production)

---

## 9. Development Setup

```bash
# Không cần DB local — server luôn connect Supabase Postgres.
# Chỉ cần set DB_PASSWORD (Supabase) trong .env.local trước khi chạy.

# Install dependencies
cd airsoft-tactic-nodejs
pnpm install

# Dev với hot-reload
pnpm run start:dev

# Build production
pnpm run build
pnpm run start:prod
```

**Port:** `8080` (giống Spring Boot — không cần đổi config mobile/admin)

---

## 10. Migration Reference — Spring Boot → NestJS

| Spring Boot | NestJS equivalent |
|---|---|
| `@RestController` | `@Controller` |
| `@RequestMapping` | `@Controller('/path')` |
| `@GetMapping` | `@Get(':id')` |
| `@Service` | `@Injectable()` |
| `@Repository` | `@InjectRepository(Entity)` |
| `@Transactional` | `dataSource.transaction()` |
| `ResponseEntity<ApiResponse<T>>` | return `T` → interceptor wrap |
| `@PreAuthorize("hasRole('ADMIN')")` | `@UseGuards(AdminGuard)` |
| `SimpMessagingTemplate.convertAndSend()` | `MatchEventPublisher.broadcastToMatch()` |
| `@MessageMapping("/match/{id}/location")` | WsGateway `case 'LOCATION':` handler |
| `CompletableFuture.runAsync()` | `setImmediate(() => ...)` |
| `AppException.notFound()` | `throw new NotFoundException('message')` |
| `AppException.forbidden()` | `throw new ForbiddenException('message')` |
| `AppException.conflict()` | `throw new ConflictException('message')` |
| `AppException.unprocessable()` | `throw new UnprocessableEntityException({ message, code })` |
| `JwtUtil.generateAccessToken()` | `JwtUtil.sign({ sub, email, role }, { algorithm: 'HS512' })` |
| `BCryptPasswordEncoder(12)` | `bcrypt.hash(password, 12)` |
| `WebClient` (Google verify) | `axios.get('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=...')` |
| `ST_AsGeoJSON` via Hibernate Spatial | `dataSource.query('SELECT ST_AsGeoJSON(...)::json')` |

---

## 11. Key Business Logic (đọc kỹ trước khi implement)

### Match flow
```
WAITING → [admin POST /start] → IN_PROGRESS → [admin POST /end] → ENDED
```

### joinTeam logic
1. Match phải `WAITING`
2. User chưa join match này (`match_players` check)
3. Team phải thuộc match này
4. Chưa đạt `maxPlayers`
5. Save `MatchPlayer` → broadcast `PLAYER_JOINED`

### reportHit (idempotent)
- Check `hit_events` WHERE `match_id=? AND user_id=? AND reported_at > now() - respawnDelay`
- Nếu có → return existing (không tạo mới)
- Nếu chưa → tạo `HitEvent { respawnAt = now() + respawnDelaySeconds }`

### sendPing
- Validate user trong match + match `IN_PROGRESS`
- Broadcast `PING_SENT` qua WS ngay lập tức
- Save `PingEvent` vào DB **bất đồng bộ** (`setImmediate`) — không block WS response

### updateLocation (WS STOMP SEND → WS LOCATION message)
- Nhận từ WS gateway khi client gửi `{ type: 'LOCATION', ... }`
- Validate match `IN_PROGRESS`, user là member
- Tính `isAlive`: check `hit_events WHERE match_id=? AND user_id=? AND respawn_at > NOW()`
- Broadcast `LOCATION_UPDATE` tới `teamRooms[matchId:teamId]`
- **Không lưu location vào DB**

### createMatch (admin)
- Tạo `GameMatch`
- Auto-create N teams (N = `gameMode.teamCount`) với tên Alpha/Bravo/Charlie...

### endMatch
- Update status → ENDED
- Gọi `updatePlayerStats()` — tính wins/losses/draws cho tất cả players trong match

---

## 12. Role Report

*(Thêm vào đây sau mỗi task hoàn thành)*

### 2026-06-12 — Server-side cover image upload proxy (field/map covers via Supabase)

**Files tạo mới:**
- `src/uploads/uploads.module.ts` — `UploadsModule`, export `UploadsService`
- `src/uploads/uploads.service.ts` — `UploadsService`:
  - `validateCoverImage(file)`: kiểm tra mimetype (chỉ `image/jpeg|png|webp`) + size ≤ 5MB → `BadRequestException(400)` nếu fail, trả về extension tương ứng
  - `uploadCoverImage(bucket, objectKey, file)`: gọi Supabase Storage REST API bằng native `fetch`, header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` + `x-upsert: true`; trả public URL; throw `InternalServerErrorException(500)` nếu Supabase fail (không update DB trong trường hợp này)
- `src/uploads/dto/cover-image-response.dto.ts` — `CoverImageResponseDto { coverImageUrl: string }`

**Files sửa:**
- `src/admin/admin.module.ts` — import `UploadsModule`
- `src/admin/admin-field.controller.ts` — thêm `POST fields/:id/cover-image` (FileInterceptor('file')); validate field tồn tại (404 nếu không) → validate file → upload bucket `field-covers` key `field-{fieldId}.{ext}` → update `fields.cover_image_url` → return `{ coverImageUrl }`
- `src/admin/admin-management.service.ts` — thêm `updateFieldCoverImage(fieldId, coverImageUrl)`
- `src/admin/maps/maps.controller.ts` — thêm `POST maps/:id/cover-image` (FileInterceptor('file')); cùng pattern, bucket `map-covers` key `map-{mapId}.{ext}`
- `src/admin/maps/maps.service.ts` — thêm `updateMapCoverImage(mapId, coverImageUrl)`
- `package.json` — thêm devDependency `@types/multer`
- `.env.example`, `.env.staging.example`, `.env.production.example` — thêm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (placeholder)
- `CLAUDE.md` — section 6 (API map) thêm 2 endpoints, section 8 (Environment Variables) thêm sub-section "Supabase Storage"

**Endpoint thực tế (lưu ý khác path trong original spec):**
```
POST /v1/admin/fields/{fieldId}/cover-image   (JwtAuthGuard + AdminGuard)
POST /v1/admin/maps/{mapId}/cover-image       (JwtAuthGuard + AdminGuard)
Content-Type: multipart/form-data, field name "file"
Response: { coverImageUrl: string }
```
Spec gốc đề `/v1/fields/{fieldId}/cover-image` và `/v1/maps/{mapId}/cover-image` (không prefix `/admin`), nhưng cả 2 controller hiện tại (`AdminFieldController`, `MapsController`) đều mount ở `v1/admin` với `@UseGuards(JwtAuthGuard, AdminGuard)` — giữ nguyên prefix `/v1/admin` để nhất quán với toàn bộ admin CRUD pattern hiện có (admin field/map management vốn đã ở dưới `/v1/admin`). Admin team cần update FE để gọi đúng `/v1/admin/...`.

**Cần devops/admin làm thủ công:**
- Set `SUPABASE_SERVICE_ROLE_KEY` (và `SUPABASE_URL` nếu chưa có) qua `flyctl secrets set -c fly.staging.toml ...` và `-c fly.production.toml ...`
- Đảm bảo bucket `field-covers` và `map-covers` đã tồn tại trên Supabase Storage (đã có, giữ tên cũ)
- Admin dashboard (airsoft-tactic-admin) cần đổi flow upload: gọi `POST /v1/admin/fields/{id}/cover-image` / `POST /v1/admin/maps/{id}/cover-image` (multipart, field "file") thay vì upload trực tiếp lên Supabase bằng `NEXT_PUBLIC_SUPABASE_ANON_KEY`; có thể remove `uploadFieldCover`/`uploadMapCover`/`listMapCovers`/`NEXT_PUBLIC_SUPABASE_*` khỏi `airsoft-tactic-admin/src/lib/supabase.ts` sau khi migrate (out of scope cho task này — chỉ làm phía server)

**Notes:**
- `listMapCovers` (gallery ảnh cũ) KHÔNG implement lại — out of scope theo yêu cầu
- Không validate file ở `ValidationPipe` (multipart không qua class-validator) — validate thủ công trong `UploadsService.validateCoverImage`
- Multer dùng memory storage mặc định (`FileInterceptor` không config storage) → `file.buffer` available, phù hợp để forward trực tiếp lên Supabase qua `fetch`
- Thứ tự xử lý: kiểm tra field/map tồn tại (404) → validate file (400) → upload Supabase (500 nếu fail, KHÔNG update DB) → update DB → return URL

### 2026-06-12 — Remove local Postgres, always connect to Supabase

**Files sửa:**
- `src/database/database.module.ts` — `TypeOrmModule.forRootAsync` factory: `DB_HOST` default đổi từ local sang `db.ycqcvjpqdvlsoqclstht.supabase.co`; thêm `DB_SSL` config (default `true`) → `ssl: sslEnabled ? { rejectUnauthorized: false } : false`; log connection có thêm `(ssl=...)`; error log sửa thành "Check DB_HOST / DB_PORT / DB_PASSWORD (Supabase) in .env.local"
- `.env.local` — DB section đổi từ local Postgres sang Supabase (`DB_HOST=db.ycqcvjpqdvlsoqclstht.supabase.co`, `DB_SSL=true`, `DB_PASSWORD` placeholder)
- `.env.staging` — DB section đổi từ `DB_HOST=localhost` sang Supabase (cùng project, `DB_SSL=true`, `DB_PASSWORD` placeholder)
- `.env.example`, `.env.production` — thêm `DB_SSL=true`
- `CLAUDE.md` — section 8: bỏ ví dụ `DB_HOST=localhost` và block "`.env.local` override cho Docker PostgreSQL local"; document `DB_SSL`; section 9: bỏ bước `docker compose up -d`

**Notes:**
- Server (local dev, staging, production) đều connect cùng 1 Supabase Postgres project (`ycqcvjpqdvlsoqclstht`) — không còn DB local nào, không có docker-compose file trong repo (đã confirm)
- Cần điền thủ công (secret, KHÔNG commit giá trị thật):
  - `.env.local`: `DB_PASSWORD` (Supabase Dashboard > Project Settings > Database > Connection string), `SUPABASE_SERVICE_ROLE_KEY`
  - `.env.staging`: `DB_PASSWORD`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_SSL` có default trong code → nếu không set trong `.env.*`, server vẫn connect được Supabase (chỉ thiếu `DB_PASSWORD` sẽ fail auth)

### 2026-06-12 — Fix missing `game_matches`/`maps`/`field_hours` schema via new migration V17

**Vấn đề:** `column GameMatch.team_count does not exist` — cùng root cause với V16 (xem entry
dưới), nhưng lần này là V10–V13 (match flow refactor, maps/map_areas tables, field_hours
table, game_areas constraint, maps.cover_image_url) bị mark "applied" mà chưa thực sự chạy
trên Supabase.

**Files tạo mới:**
- `src/migrations/V17__resync_match_flow_and_maps.sql` — bản idempotent của V10–V13:
  `ADD COLUMN IF NOT EXISTS` cho `game_matches` (team_count, respawn_enabled,
  respawn_delay_seconds, scheduled_end_at, map_id), `CREATE TABLE IF NOT EXISTS`
  cho `maps`/`map_areas`/`field_hours`, FK `fk_game_matches_map` wrap trong
  `DO $$ ... IF NOT EXISTS (pg_constraint) $$`, `CREATE INDEX IF NOT EXISTS`,
  `DROP CONSTRAINT IF EXISTS game_areas_area_type_check`,
  `maps.cover_image_url ADD COLUMN IF NOT EXISTS`.
- Là version mới (V17) → tự chạy ở lần start server tiếp theo, không cần SQL thủ công.

**Lưu ý:** V1–V9 (base schema) CHƯA được verify lại — nếu Supabase snapshot ban đầu predates
cả những migration đó, có thể còn lỗi "column does not exist" khác xuất hiện dần khi gọi
các endpoint chưa test. Pattern xử lý giống nhau: tạo migration version mới với nội dung
idempotent (`IF NOT EXISTS`/`DO` block check `pg_constraint`), KHÔNG sửa file migration cũ.

### 2026-06-12 — Fix missing `fields` columns (phone/website/...) via new migration V16

**Vấn đề:** `POST /v1/admin/fields` → `QueryFailedError: column "phone" of relation "fields" does not exist`.
Root cause: khi server connect Supabase DB lần đầu, `schema_migrations` rỗng nhưng table
`fields` đã tồn tại (restore từ snapshot cũ) → bootstrap logic trong `database.module.ts`
đánh dấu TẤT CẢ migration files (kể cả V14/V15) là "applied" mà KHÔNG thực sự chạy →
cột `phone`, `website`, `min_age`, `entry_fee`, `entry_fee_currency`, `rental_available`,
`is_verified` chưa tồn tại trên Supabase dù entity/DTO đã expect.

**Files tạo mới:**
- `src/migrations/V16__resync_field_columns.sql` — re-apply nội dung V14 + V15
  (toàn bộ `ADD COLUMN IF NOT EXISTS`, idempotent). Vì là version MỚI (V16), chưa có
  trong `schema_migrations` → tự chạy ở lần start server tiếp theo, không cần SQL thủ công.

**Notes / cảnh báo cho tương lai:**
- Bootstrap logic (`DatabaseHealthService.runMigrations`) hiện chỉ check table `fields`
  có tồn tại không để quyết định "DB đã setup, mark hết migrations = applied". Nếu DB
  được restore từ snapshot ở version cũ hơn HEAD, các migration sau đó sẽ bị mark applied
  sai → cần thêm migration mới (version cao hơn) với `IF NOT EXISTS`/idempotent để tự
  resync, KHÔNG sửa lại file migration cũ đã đánh version thấp hơn (vì đã bị mark applied).

### 2026-06-12 — Fix DB connection: use Supabase IPv4 transaction pooler

**Vấn đề:** `npm run start:dev` báo `ECONNREFUSED <ipv6-address>:5432` — direct host
`db.<ref>.supabase.co` chỉ resolve sang IPv6, network local không có route IPv6 tới
Supabase nên connect fail.

**Fix:** Đổi sang Supabase Connection Pooler (Supavisor, IPv4) — transaction mode, port 6543,
username dạng `postgres.<project-ref>`.

**Files sửa:**
- `src/database/database.module.ts` — default `DB_HOST=aws-1-us-east-1.pooler.supabase.com`,
  `DB_PORT=6543`, `DB_USER=postgres.ycqcvjpqdvlsoqclstht`
- `.env.local`, `.env.staging`, `.env.production`, `.env.example` — cùng đổi
  `DB_HOST`/`DB_PORT`/`DB_USER` sang pooler
- `CLAUDE.md` — section 8 cập nhật hướng dẫn lấy connection string từ Connect > ORM

**Notes:**
- Transaction pooler (6543) không support session-level features (advisory locks, LISTEN/NOTIFY,
  prepared statements) — TypeORM với query parameterized thông thường + `synchronize: false` hoạt
  động bình thường. Nếu sau này cần session features, đổi `DB_PORT=5432` (session pooler) cùng host.
- Region pooler host (`aws-1-us-east-1`) lấy từ Supabase "Connect" dialog của project — nếu project
  region khác, cần lấy lại connection string đúng region.

### 2026-06-12 — CI/CD: Pipeline stages + switch deploy to Fly.io

**Files tạo mới:**
- `fly.staging.toml` — Fly app `airtac-staging`, region `sin`, shared-cpu-1x/256mb, `min_machines_running=1`
- `fly.production.toml` — Fly app `airsoft-tactic-server-production`, cùng cấu hình

**Files sửa:**
- `.github/workflows/deploy.yml` — viết lại 3 stage rõ ràng:
  - `build-and-test`: npm ci + lint + build + test, chạy trên mọi push/PR/dispatch
  - `deploy-staging`: auto khi push `develop` (hoặc dispatch `environment=staging`), `flyctl deploy -c fly.staging.toml`
  - `deploy-production`: CHỈ qua `workflow_dispatch` với `environment=production` (manual), `flyctl deploy -c fly.production.toml`
  - Bỏ GHCR build-and-push + SSH/Docker deploy (VPS) — thay bằng Fly.io
- `package.json` — thêm script `test` placeholder (chưa có test suite thật)
- `CLAUDE.md` — thêm section "Deploy — Fly.io" trong mục 8 (Environment Variables)

**Cần làm thủ công (Claude không tự tạo được):**
- `flyctl apps create airtac-staging` và `-production`
- `flyctl secrets set -c fly.staging.toml ...` / `fly.production.toml` cho DB_*, JWT_SECRET, CORS_ORIGIN
- Tạo GitHub secret `FLY_API_TOKEN` (Settings → Environments → staging & production)
- (Optional) `flyctl certs add` để gắn domain `api-staging.airtac.app` / `api.airtac.app`

**Notes:**
- Dockerfile hiện có (npm-based) dùng được trực tiếp cho Fly build — không cần sửa
- `.env.staging`/`.env.production` KHÔNG dùng trên Fly — toàn bộ config qua `flyctl secrets` + `[env]` trong fly.toml

### 2026-06-07 — Feature: Opening Hours

**Files tạo mới:**
- `src/migrations/V11__field_hours.sql` — tạo bảng `field_hours` với UNIQUE(field_id, day_of_week), index on field_id
- `src/database/entities/field-hour.entity.ts` — `FieldHour` entity, ManyToOne Field, columns: dayOfWeek/openTime/closeTime/isClosed
- `src/admin/dto/update-field-hours.dto.ts` — `FieldHourItemDto` + `UpdateFieldHoursDto` với class-validator

**Files sửa:**
- `src/fields/dto/field-response.dto.ts` — thêm `OpeningHourDto` interface + `openingHours?: OpeningHourDto[]` vào `FieldResponseDto`
- `src/fields/fields.service.ts` — inject `FieldHourRepo`, `toDetail()` load hours và map sang `OpeningHourDto[]` (format "HH:mm" qua substring(0,5))
- `src/admin/admin-management.service.ts` — inject `FieldHourRepo`, thêm `upsertFieldHours()` (delete + re-insert strategy)
- `src/admin/admin-field.controller.ts` — thêm `PUT fields/:id/hours` endpoint
- `src/fields/fields.module.ts` — thêm `FieldHour` vào `TypeOrmModule.forFeature`
- `src/admin/admin.module.ts` — thêm `FieldHour` vào `TypeOrmModule.forFeature`

**Notes:**
- `toSummary()` (GET /v1/fields list) KHÔNG load openingHours — chỉ `toDetail()` (GET /v1/fields/:id)
- `openingHours` trả về `[]` nếu chưa set (không bao giờ null/undefined từ toDetail)
- openTime/closeTime format "HH:mm" (Postgres TIME trả "HH:mm:ss", substring 0..5)
- Upsert strategy: delete toàn bộ hours của field → insert lại (đơn giản hơn ON CONFLICT với UNIQUE constraint)

### 2026-06-07 — Bug fix: locationUpdate missing respawnAt

**Files sửa:**
- `src/matches/matches.service.ts` — `updateLocation()`: mở rộng query isAlive để lấy thêm `respawn_at`, pass `respawnAt: string | null` vào `eventPublisher.locationUpdate()`

### 2026-06-11 — Field Verified Badge

**Files tạo mới:**
- `src/migrations/V15__field_verified.sql` — `ALTER TABLE fields ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false`

**Files sửa:**
- `src/database/entities/field.entity.ts` — thêm `isVerified: boolean` column (`is_verified`, default false)
- `src/fields/dto/field-response.dto.ts` — thêm `isVerified: boolean` vào `FieldResponseDto`
- `src/fields/fields.service.ts` — `toSummary()` và `toDetail()` map `isVerified: field.isVerified`
- `src/admin/dto/update-field.dto.ts` — thêm `@IsBoolean() @IsOptional() isVerified?: boolean`
- `src/admin/admin-management.service.ts` — `FieldResponseDto` interface thêm `isVerified: boolean`; `updateField()` set `field.isVerified` nếu dto có giá trị; `toFieldDto()` map `isVerified: f.isVerified`

**Notes:**
- `CreateFieldDto` KHÔNG có `isVerified` — field mới luôn default false, chỉ admin update sau khi tạo mới set verified
- GET /v1/fields, /v1/fields/:id và admin field DTO đều trả về `isVerified`

**Notes:**
- Lỗi TS2345: `locationUpdate()` yêu cầu `respawnAt` nhưng caller không truyền
- Fix: join thêm subquery lấy `respawn_at` của active hit event trong cùng 1 query, convert sang ISO string hoặc null

### 2026-06-07 — Enhanced Hit Flow (server side)

**Files sửa:**
- `src/websocket/ws.types.ts` — thêm `SelfReviveMessage`, thêm `SELF_REVIVE` vào `MessageType` + `IncomingMessage`, thêm `respawnAt: string | null` vào `LOCATION_UPDATE` WsEvent type
- `src/websocket/match-event.publisher.ts` — thêm `respawnAt: string | null` vào `locationUpdate()` params + payload
- `src/websocket/ws.gateway.ts` — import `SelfReviveMessage`, thêm `case 'SELF_REVIVE'` → `handleSelfRevive()` (optimistic in-memory + fire-and-forget DB update), update `handleLocation` để pass `respawnAt` từ session
- `src/matches/matches.service.ts` — thêm `selfRevive(matchId, userId)` (raw SQL UPDATE respawn_at=NOW()), thêm `getMyStatus(matchId, userId)` (query hit_events + member check)
- `src/matches/matches.controller.ts` — thêm `GET :id/my-status` endpoint

**Notes:**
- `SELF_REVIVE` WS handler: optimistic in-memory (session.isAlive=true, session.respawnAt=null) → `setImmediate` DB update → silent on error
- `selfRevive` service method dùng `UPDATE ... WHERE respawn_at > NOW()` (idempotent, không throw)
- `LOCATION_UPDATE` payload giờ có `respawnAt` (null khi isAlive=true)
- `GET /my-status` trả 403 nếu user không phải member của match

### 2026-06-06 — Project Init
- Tạo CLAUDE.md từ migration spec (`MIGRATION_SPEC_SpringBoot_to_NodeJS.md`)
- Reference server: `airsoft-tactic-server/` (Spring Boot Kotlin)
- WS protocol: STOMP removed → JSON over raw WebSocket
- DB: cùng PostgreSQL, không đổi schema

### 2026-06-06 — Agent 2: UsersModule + FieldsModule + GameModesModule + EventsModule

**Files tạo mới:**
- `src/users/dto/user-response.dto.ts` — UserResponseDto, StatsResponseDto (match Spring Boot StatsResponse shape: userId, displayName, winRate, totalKills, totalDeaths)
- `src/users/dto/update-profile.dto.ts` — class-validator: @IsOptional @IsString
- `src/users/dto/device-token.dto.ts` — @IsIn(['ios','android'])
- `src/users/dto/pagination.dto.ts` — PaginatedResponseDto<T> interface
- `src/users/users.service.ts` — getMe, updateProfile, upsertDeviceToken (delete old then insert new), getStats, getMyMatches (join mp.match relation, filter status=ENDED)
- `src/users/users.controller.ts` — @UseGuards(JwtAuthGuard) class-level, 5 routes
- `src/users/users.module.ts` — forFeature: [User, PlayerStats, DeviceToken, MatchPlayer, Team]
- `src/fields/dto/field-response.dto.ts` — FieldResponseDto, GameModeResponseDto, MatchSummaryDto, TeamSummaryDto
- `src/fields/fields.service.ts` — getFields (active only), getField, getLiveFields; toDetail dùng riêng teamRepo + matchPlayerRepo (GameMatch entity không có relations)
- `src/fields/fields.controller.ts` — GET /v1/fields, GET /v1/fields/:id
- `src/fields/fields.module.ts` — forFeature: [Field, GameMode, GameMatch, Team, MatchPlayer]
- `src/game-modes/game-modes.service.ts` — getAll, getByField(fieldId)
- `src/game-modes/game-modes.controller.ts` — GET /api/game-modes?fieldId= (PUBLIC, không guard)
- `src/game-modes/game-modes.module.ts` — forFeature: [GameMode]
- `src/events/dto/event-response.dto.ts` — match Spring Boot EventResponse (title, fieldName, organizerName, startTime, endTime, maxCapacity, status, isRsvped)
- `src/events/dto/create-event.dto.ts` — @IsDateString startAt/endAt, name/description/fieldId
- `src/events/events.service.ts` — getEvents, getEvent, createEvent (load relations after save), rsvp (check status/duplicate/capacity), cancelRsvp
- `src/events/events.controller.ts` — POST /v1/events @UseGuards(JwtAuthGuard, AdminGuard)
- `src/events/events.module.ts` — forFeature: [Event, Rsvp, Field]

**app.module.ts cập nhật:** uncomment UsersModule, FieldsModule, EventsModule, GameModesModule

**Key decisions:**
- `DeviceToken.upsertDeviceToken`: delete by userId+platform → insert new (tránh unique constraint)
- `MatchPlayer` query dùng `mp.match` (không phải `mp.gameMatch`) — khớp entity relation name
- `GameMatch` entity không có `teams`/`matchPlayers` OneToMany — FieldsService dùng riêng `teamRepo.find({where:{matchId}})` và `matchPlayerRepo.find({where:{matchId}})`
- EventsService.createEvent: save → findOne với relations (reload) để trả đủ fieldName/organizerName
- Response shape `EventResponseDto` dùng `title` (không phải `name`) — khớp DB column `events.title`

### 2026-06-06 — Agent 1: TypeORM Entities + AuthModule + AdminModule

**NHÓM 1 — 15 TypeORM Entities** (`src/database/entities/`):
- `user.entity.ts` — bảng `users`, google_id/apple_id/email/display_name/avatar_url/role/last_seen_at/deleted_at
- `admin-account.entity.ts` — bảng `admin_accounts`, username/password_hash/is_active/last_login_at
- `refresh-token.entity.ts` — bảng `refresh_tokens`, token unique, FK→users CASCADE, userId column
- `device-token.entity.ts` — bảng `device_tokens`, FK→users CASCADE, userId column
- `field.entity.ts` — bảng `fields`, name/location/description/cover_image_url/lat/lng/is_active
- `game-mode.entity.ts` — bảng `game_modes`, FK→fields, teamCount/maxPlayers/respawnEnabled/respawnDelaySeconds/rules
- `game-match.entity.ts` — bảng `game_matches`, FK→fields+game_modes, status/maxPlayers/createdById/createdByDisplayName/startedAt/endedAt/winningTeamId
- `team.entity.ts` — bảng `teams`, FK→game_matches, name/colorHex/objectives/respawnBase
- `match-player.entity.ts` — bảng `match_players`, FK→game_matches+teams+users, joinedAt
- `game-area.entity.ts` — bảng `game_areas`, KHÔNG map geometry column (raw SQL via DataSource.query()), description/colorHex/areaType
- `hit-event.entity.ts` — bảng `hit_events`, FK→game_matches+users, reportedAt/respawnAt
- `ping-event.entity.ts` — bảng `ping_events`, KHÔNG map geometry column, latitude/longitude/pingType
- `player-stats.entity.ts` — bảng `player_stats`, PrimaryColumn user_id, totalMatches/wins/losses/draws/totalKills/totalDeaths, @UpdateDateColumn
- `event.entity.ts` — bảng `events`, FK→fields(nullable, SET NULL)+users(organizer), title/startTime/endTime/maxCapacity/status
- `rsvp.entity.ts` — bảng `rsvps`, FK→events+users, @Unique(['eventId','userId'])

**Quy tắc:** `synchronize: false`, snake_case column names explicit, `@CreateDateColumn` cho created_at, `onDelete: 'CASCADE'` cho tất cả FKs, không lazy relations, expose FK column id cạnh relation.

**NHÓM 2 — AuthModule** (`src/auth/`):
- DTOs: `google-auth.dto.ts`, `apple-auth.dto.ts`, `refresh-token.dto.ts`, `logout.dto.ts`, `auth-response.dto.ts`
- `auth.service.ts`: googleSignIn (verify qua googleapis tokeninfo API), appleSignIn (base64url JWT decode phần [1]), refresh (findByToken + check expiresAt → delete old → buildAuthResponse), logout (delete by token), buildAuthResponse (HS512 JWT + crypto.randomUUID()-crypto.randomUUID() refreshToken, 30 ngày)
- `auth.controller.ts`: POST /v1/auth/google|apple|refresh|logout — tất cả public, không guard
- `auth.module.ts`: TypeOrmModule.forFeature([User, RefreshToken, PlayerStats]), providers: [AuthService, JwtUtil]

**NHÓM 3 — AdminModule** (`src/admin/`):
- DTOs: AdminLoginDto, CreateAdminDto, CreateFieldDto, UpdateFieldDto, CreateGameModeDto, UpdateUserRoleDto, AdminLoginResponseDto, AdminInfoDto, AdminStatsDto
- `admin-auth.service.ts`: login (bcrypt.compare rounds=12, JWT role=admin), bootstrap (upsert admin:Admin123@), createAdmin (hash + ConflictException nếu duplicate username)
- `admin-management.service.ts`: CRUD fields (soft-delete isActive=false), createGameMode/deleteGameMode, createMatch (auto-create N teams từ TEAM_NAMES/TEAM_COLORS constants), startMatch (WAITING→IN_PROGRESS), endMatch (IN_PROGRESS→ENDED + setImmediate updatePlayerStats), getUsers (findAndCount paginated), updateUserRole, getAdminStats (count queries), updatePlayerStats (wins/losses/draws per MatchPlayer)
- `admin-auth.controller.ts`: POST /v1/admin/auth/login|bootstrap (public), POST /v1/admin/auth/create (@UseGuards(JwtAuthGuard, AdminGuard))
- `admin-field.controller.ts`: @UseGuards class-level, CRUD /v1/admin/fields, /v1/admin/fields/:id/game-modes, GET /v1/admin/fields/:id/matches, GET /v1/admin/stats
- `admin-user.controller.ts`: @UseGuards class-level, GET /v1/admin/users (page+size query), PATCH /v1/admin/users/:id/role
- `admin.module.ts`: TypeOrmModule.forFeature([AdminAccount, GameMatch, Team, Field, GameMode, User, MatchPlayer, PlayerStats]), exports: [AdminManagementService]

**app.module.ts**: Enabled AuthModule + AdminModule imports.

**Lưu ý kỹ thuật:**
- Không dùng `uuid` npm package (chưa install) → dùng `crypto.randomUUID()` Node.js built-in
- Không dùng `@nestjs/mapped-types` (chưa install) → UpdateFieldDto viết tay với `@IsOptional()`
- JwtUtil inject thủ công vào AuthModule/AdminModule providers (không phải global module)
- `autoLoadEntities: true` trong DatabaseModule → entities tự đăng ký khi forFeature() được import
- AdminManagementService export → sẵn sàng import vào MatchesModule (Agent 3) cho createMatch/startMatch/endMatch

### 2026-06-06 — Agent 3: MatchesModule + WsGateway wiring + AppModule

**Files tạo mới (`src/matches/`):**
- `dto/match-response.dto.ts` — MatchResponseDto, TeamDetailDto, PlayerInTeamDto interfaces
- `dto/join-team.dto.ts` — @IsUUID('4')
- `dto/end-match.dto.ts` — @IsOptional @IsUUID('4')
- `dto/ping-request.dto.ts` — lat/lng range validation, @IsString pingType
- `dto/ping-response.dto.ts` — PingResponseDto interface
- `dto/area-request.dto.ts` — CreateAreaDto, UpdateAreaDto (GeoJSON Feature/Geometry input)
- `dto/area-response.dto.ts` — AreaResponseDto interface
- `dto/create-match.dto.ts` — @IsUUID fieldId + gameModeId
- `matches.service.ts` — Business logic 1:1 Spring Boot MatchService; raw SQL cho idempotency/count checks; tránh N+1 bằng 1 query + groupBy in-memory; updatePlayerStats via raw SQL UPSERT; isPlayerInMatch() cho WsGateway
- `areas.service.ts` — PostGIS CRUD: ST_AsGeoJSON, ST_GeomFromGeoJSON, ST_SetSRID; accept GeoJSON Feature hoặc Geometry; validateArea thuộc đúng match (anti-IDOR)
- `matches.controller.ts` — Tất cả endpoints per spec; @UseGuards(JwtAuthGuard) class-level; admin endpoints thêm AdminGuard
- `matches.module.ts` — forwardRef(WsModule) resolve circular dep

**Files cập nhật:**
- `src/websocket/ws.gateway.ts` — Inject MatchesService via forwardRef(); handleJoin gọi isPlayerInMatch() (non-blocking); handleLocation gọi updateLocation() (fire-and-forget)
- `src/websocket/ws.module.ts` — Import forwardRef(MatchesModule); export MatchEventPublisher
- `src/app.module.ts` — Uncomment tất cả modules (WsModule, AuthModule, AdminModule, UsersModule, FieldsModule, MatchesModule, EventsModule, GameModesModule); thêm HealthController vào controllers[]

**Business logic contracts:**
- `joinTeam`: WAITING-only, duplicate via raw SQL COUNT, team-in-match check, capacity check trước save
- `reportHit`: idempotent — check `reported_at > NOW() - INTERVAL '${delay} seconds'` trả existing nếu trong window
- `sendPing`: broadcast trước (đồng bộ), setImmediate() DB save (bất đồng bộ, lỗi chỉ log)
- `updateLocation`: silent return khi match không IN_PROGRESS hoặc user không là member; broadcast to teamRoom; không lưu DB
- `createMatch`: auto N teams Alpha/Bravo/Charlie...; colors #3B82F6/#EF4444/#22C55E/#F59E0B/#8B5CF6/#EC4899
- `endMatch`: updatePlayerStats raw SQL UPSERT với wins/losses/draws đúng theo winningTeamId
- WS auth: JOIN_MATCH → verify JWT → isPlayerInMatch() check (non-fatal, allow lobby access); LOCATION → session lookup → updateLocation

**Circular dependency resolution:**
- MatchesModule `imports: [forwardRef(() => WsModule)]`
- WsModule `imports: [forwardRef(() => MatchesModule)]`
- WsGateway `@Inject(forwardRef(() => MatchesService))`
