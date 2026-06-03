# Airsoft Tactic Server — System Design Document

> **Status:** Draft  
> **Stack:** Kotlin / JVM 21 / Gradle  
> **Last updated:** 2026-06-01

---

## 1. Overview

`airsoft-tactic-server` is a backend server for managing real-time airsoft game tactics. It enables teams to plan, share, and coordinate tactical maneuvers during matches — think of it as a lightweight command-and-control backend for airsoft games.

### Core capabilities (proposed)
- Create and manage game sessions (matches)
- Define and share tactical maps and markers
- Real-time player position and status updates
- Team/squad management
- Match replay and debrief data

---

## 2. Requirements

### Functional
- Players can join a game session via a code or link
- Team leaders can draw tactics on a map and broadcast to teammates
- Real-time updates: player positions, objective status, alive/eliminated state
- Match lifecycle: lobby → in-progress → ended → debrief
- Persistent match history for post-game review

### Non-Functional
- **Latency:** < 200ms for real-time tactic updates
- **Availability:** 99.5% uptime (games typically last 30–90 min)
- **Concurrency:** Support 50–200 concurrent players per match, ~10 concurrent matches per server instance
- **Scalability:** Horizontally scalable; stateless HTTP + WebSocket
- **Cost:** Minimize infrastructure; target self-hosted or low-cost cloud (single VPS to start)

### Constraints
- Kotlin/JVM stack (existing project)
- Small team, rapid iteration expected
- No persistent user accounts required for MVP (session-based)

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
│  Mobile App / Web App  ←→  REST + WebSocket             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                  airsoft-tactic-server                  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  HTTP API    │  │  WebSocket   │  │  Match       │  │
│  │  (REST)      │  │  Handler     │  │  Engine      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│              ┌────────────▼────────────┐                │
│              │     Service Layer       │                │
│              │  SessionService         │                │
│              │  TeamService            │                │
│              │  TacticService          │                │
│              │  PlayerService          │                │
│              └────────────┬────────────┘                │
│                           │                             │
│         ┌─────────────────┼─────────────────┐           │
│         ▼                 ▼                 ▼           │
│   ┌───────────┐   ┌──────────────┐  ┌────────────┐     │
│   │ In-Memory │   │  PostgreSQL  │  │   Redis    │     │
│   │ State     │   │  (Matches /  │  │  (Session  │     │
│   │ (Live     │   │   History)   │  │   Cache /  │     │
│   │  State)   │   │              │  │   Pub-Sub) │     │
│   └───────────┘   └──────────────┘  └────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 4. API Design

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create a new game session |
| `GET` | `/sessions/{id}` | Get session details |
| `POST` | `/sessions/{id}/join` | Join session as a player |
| `POST` | `/sessions/{id}/start` | Start the match (host only) |
| `POST` | `/sessions/{id}/end` | End the match |
| `GET` | `/sessions/{id}/replay` | Get match replay data |
| `POST` | `/sessions/{id}/teams` | Create a team within a session |
| `POST` | `/sessions/{id}/tactics` | Save a tactic/drawing |
| `GET` | `/sessions/{id}/tactics` | List tactics for a session |

### WebSocket Events

Clients connect to `ws://<host>/sessions/{id}/ws`

**Client → Server:**
```json
{ "type": "POSITION_UPDATE", "x": 12.5, "y": 44.3, "bearing": 270 }
{ "type": "STATUS_UPDATE", "status": "ELIMINATED" }
{ "type": "TACTIC_DRAW", "shapes": [...] }
{ "type": "CHAT", "message": "Flanking right" }
```

**Server → Client (broadcast):**
```json
{ "type": "PLAYER_MOVED", "playerId": "abc", "x": 12.5, "y": 44.3 }
{ "type": "PLAYER_ELIMINATED", "playerId": "abc" }
{ "type": "TACTIC_UPDATE", "authorId": "xyz", "shapes": [...] }
{ "type": "MATCH_STARTED" }
{ "type": "MATCH_ENDED", "winner": "ALPHA" }
```

---

## 5. Data Model

### Session
```
Session {
  id: UUID
  code: String (6-char join code)
  status: LOBBY | IN_PROGRESS | ENDED
  mapId: String
  hostPlayerId: UUID
  createdAt: Instant
  startedAt: Instant?
  endedAt: Instant?
}
```

### Player
```
Player {
  id: UUID
  sessionId: UUID
  teamId: UUID?
  nickname: String
  role: HOST | MEMBER
  status: ALIVE | ELIMINATED | SPECTATING
  lastPosition: Point?
  connectedAt: Instant
}
```

### Team
```
Team {
  id: UUID
  sessionId: UUID
  name: String
  color: String (hex)
  playerIds: List<UUID>
}
```

### Tactic
```
Tactic {
  id: UUID
  sessionId: UUID
  authorId: UUID
  shapes: List<Shape>  // JSON: lines, circles, arrows, markers
  createdAt: Instant
  label: String?
}
```

---

## 6. Technology Choices

### Framework: Ktor
- Native Kotlin, lightweight, excellent WebSocket support
- Easy to embed in a single JAR for simple deployment
- Trade-off: less ecosystem vs Spring Boot, but lower overhead for this use case

### Database: PostgreSQL
- Persistent match history and tactic storage
- JSONB for flexible `shapes` data in Tactic
- Trade-off: overkill for MVP; could start with SQLite

### Cache / Pub-Sub: Redis
- In-memory live match state (player positions, alive status)
- Pub-Sub for broadcasting WebSocket events across multiple server instances
- Trade-off: adds infra complexity; for single-instance MVP, can skip and use JVM in-memory maps

### Serialization: kotlinx.serialization
- Native Kotlin, no reflection overhead
- Works well with Ktor

---

## 7. Real-Time Design

For live position/status updates, the server fans out every incoming WebSocket message to all other players in the same session.

**Single instance (MVP):**
```
Player A → WS → Server → broadcast to all players in session (in-memory ConcurrentHashMap)
```

**Multi-instance (scaled):**
```
Player A → WS → Instance 1 → publish to Redis channel "session:{id}"
                              ↓
Instance 2 subscribes → broadcasts to its connected players
Instance 3 subscribes → broadcasts to its connected players
```

Update frequency should be throttled client-side to ~10 Hz (100ms intervals) to avoid overloading the server.

---

## 8. Scaling & Reliability

### Load Estimation
- 200 players × 10 concurrent matches = 2,000 WebSocket connections
- Each player sends ~10 position updates/sec = 20,000 messages/sec at peak
- Each message ≈ 100 bytes → ~2 MB/s throughput — well within a single VPS

### Horizontal Scaling
- HTTP is stateless → scale behind a load balancer
- WebSocket sessions are sticky — use Redis pub-sub for cross-instance fan-out
- Match state is in Redis → any instance can serve any player

### Failover
- Redis with AOF persistence keeps live match state durable
- On server crash, players reconnect and re-sync state from Redis
- Matches in `IN_PROGRESS` are auto-expired after 4 hours (Redis TTL) to prevent ghost sessions

### Monitoring
- JVM metrics via Micrometer + Prometheus
- Alert on: WebSocket connection count, message latency p95, Redis lag

---

## 9. Security

- Join codes are short-lived (expire after match ends) and generated with SecureRandom
- No auth required for MVP (session-code is the credential)
- Rate-limit WebSocket messages per connection (e.g., max 30 msg/sec) to prevent flooding
- Validate all incoming shapes/coordinates to prevent injection into stored JSON
- HTTPS/WSS enforced in production via reverse proxy (nginx / Caddy)

---

## 10. Deployment (MVP)

```
Single VPS (2 vCPU, 4 GB RAM)
├── nginx (TLS termination, reverse proxy)
├── airsoft-tactic-server.jar (Ktor, port 8080)
├── PostgreSQL (port 5432)
└── Redis (port 6379)
```

Containerize with Docker Compose for reproducible local dev and easy VPS deploy.

---

## 11. Trade-off Summary

| Decision | Choice | Trade-off |
|----------|--------|-----------|
| Framework | Ktor | Less ecosystem vs Spring; lighter weight |
| Live state storage | Redis (or in-memory for MVP) | Redis adds infra; in-memory doesn't survive restarts |
| Auth | Session code only | Simpler UX; no user identity or persistent profiles |
| DB | PostgreSQL | SQLite simpler for MVP but harder to scale later |
| Real-time | WebSocket | Better than polling; requires sticky sessions at scale |

---

## 12. What to Revisit as the System Grows

- **User accounts:** persistent profiles, stats, match history per user
- **Map editor:** richer tactic drawing (SVG/canvas sync)
- **Spectator mode:** read-only WebSocket stream for coaches/referees
- **Mobile push notifications:** match invite, session starting
- **Replay system:** record all events server-side for full post-game debrief
- **Multi-region:** move to Kubernetes + managed Redis for global low latency
