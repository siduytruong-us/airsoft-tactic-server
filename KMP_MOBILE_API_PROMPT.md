# KMP MOBILE API INTEGRATION PROMPT — AIRSOFT TACTIC

> **Target:** Kotlin Multiplatform (KMP) developer tích hợp toàn bộ API cho mobile (Android/iOS).  
> **Base URL:** `http://localhost:8080` (dev) — cấu hình qua `BuildConfig` / `Platform`.  
> **Auth:** JWT Bearer token — mọi request (trừ `/v1/auth/*`) đều cần header `Authorization: Bearer <accessToken>`.  
> **Đọc kỹ Section 1 trước** để hiểu cấu trúc response wrapper trước khi implement.

---

## 1. BASE RESPONSE WRAPPER

Backend **luôn** trả về cấu trúc sau. Tất cả `data` class KMP phải wrap qua generic này:

```kotlin
@Serializable
data class ApiResponse<T>(
    val data: T? = null,
    val status: Int,
    val timestamp: String,
    // Chỉ có khi lỗi:
    val code: String? = null,
    val message: String? = null,
    val path: String? = null
)
```

### Pagination Response (dùng cho list APIs)
```kotlin
@Serializable
data class PageResponse<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val last: Boolean
)
// Ví dụ: ApiResponse<PageResponse<FieldResponse>>
```

### HTTP Error codes hay gặp
| Status | code | Ý nghĩa |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body sai format/validation |
| 401 | `TOKEN_EXPIRED` / `INVALID_TOKEN` | Token hết hạn → refresh |
| 403 | `INSUFFICIENT_ROLE` | Không đủ quyền |
| 404 | `NOT_FOUND` | Resource không tồn tại |
| 409 | `ALREADY_EXISTS` | Conflict (VD: đã join team) |
| 422 | `MATCH_NOT_JOINABLE` / `CAPACITY_FULL` / `INVALID_POLYGON` | Business logic lỗi |

---

## 2. RECOMMENDED KMP STACK

```kotlin
// build.gradle.kts (shared module)
commonMain.dependencies {
    // Network
    implementation("io.ktor:ktor-client-core:2.3.x")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.x")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.x")
    implementation("io.ktor:ktor-client-logging:2.3.x")
    implementation("io.ktor:ktor-client-auth:2.3.x")

    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.x")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.x")

    // DI (optional)
    implementation("io.insert-koin:koin-core:3.5.x")

    // DateTime
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.x")

    // WebSocket (STOMP)
    implementation("io.ktor:ktor-client-websockets:2.3.x")
}
androidMain.dependencies {
    implementation("io.ktor:ktor-client-okhttp:2.3.x")
}
iosMain.dependencies {
    implementation("io.ktor:ktor-client-darwin:2.3.x")
}
```

---

## 3. NETWORK LAYER — KTOR CLIENT SETUP

### 3.1. HttpClient Factory

```kotlin
// shared/src/commonMain/kotlin/network/HttpClientFactory.kt

object HttpClientFactory {
    fun create(
        baseUrl: String,
        tokenStorage: TokenStorage   // interface lấy/lưu token
    ): HttpClient = HttpClient {

        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
                coerceInputValues = true
            })
        }

        install(Logging) {
            level = LogLevel.BODY
            logger = Logger.DEFAULT
        }

        // Tự động gắn Bearer token vào mọi request
        install(DefaultRequest) {
            url(baseUrl)
            header(HttpHeaders.ContentType, ContentType.Application.Json)
        }

        // Tự động refresh khi nhận 401
        install(Auth) {
            bearer {
                loadTokens {
                    val access  = tokenStorage.getAccessToken()
                    val refresh = tokenStorage.getRefreshToken()
                    if (access != null && refresh != null)
                        BearerTokens(access, refresh)
                    else null
                }
                refreshTokens {
                    // Gọi API refresh → lưu token mới
                    val old = tokenStorage.getRefreshToken() ?: return@refreshTokens null
                    val res = client.post("/v1/auth/refresh") {
                        contentType(ContentType.Application.Json)
                        setBody(mapOf("refreshToken" to old))
                        markAsRefreshTokenRequest()
                    }.body<ApiResponse<AuthResponse>>()

                    val newTokens = res.data ?: return@refreshTokens null
                    tokenStorage.save(newTokens.accessToken, newTokens.refreshToken)
                    BearerTokens(newTokens.accessToken, newTokens.refreshToken)
                }
            }
        }

        HttpResponseValidator {
            validateResponse { response ->
                if (!response.status.isSuccess()) {
                    val err = runCatching { response.body<ApiResponse<Unit>>() }.getOrNull()
                    throw ApiException(
                        httpStatus = response.status.value,
                        code       = err?.code ?: "UNKNOWN",
                        message    = err?.message ?: response.status.description
                    )
                }
            }
        }
    }
}

// Custom exception
class ApiException(
    val httpStatus: Int,
    val code: String,
    override val message: String
) : Exception(message)

// Token storage interface (implement riêng cho Android/iOS)
interface TokenStorage {
    fun getAccessToken(): String?
    fun getRefreshToken(): String?
    fun save(accessToken: String, refreshToken: String)
    fun clear()
}
```

---

## 4. DATA MODELS

Tạo file `shared/src/commonMain/kotlin/model/`:

### 4.1. Auth Models

```kotlin
// model/Auth.kt
@Serializable
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long,
    val tokenType: String = "Bearer",
    val user: UserResponse?
)

@Serializable
data class GoogleAuthRequest(val idToken: String)

@Serializable
data class AppleAuthRequest(
    val identityToken: String,
    val displayName: String? = null,
    val email: String? = null
)

@Serializable
data class RefreshTokenRequest(val refreshToken: String)

@Serializable
data class LogoutRequest(val refreshToken: String)
```

### 4.2. User Models

```kotlin
// model/User.kt
@Serializable
data class UserResponse(
    val id: String,
    val displayName: String?,
    val email: String?,
    val avatarUrl: String?,
    val role: String?,               // "player" | "admin"
    val createdAt: String?,
    val lastSeenAt: String?,
    val isNewUser: Boolean?,
    val stats: StatsResponse?
)

@Serializable
data class StatsResponse(
    val userId: String,
    val displayName: String?,
    val totalMatches: Int,
    val wins: Int,
    val losses: Int,
    val draws: Int,
    val winRate: Double,
    val totalKills: Int,
    val totalDeaths: Int,
    val updatedAt: String?
)

@Serializable
data class UpdateProfileRequest(
    val displayName: String? = null,
    val avatarUrl: String? = null
)

@Serializable
data class DeviceTokenRequest(
    val token: String,
    val platform: String   // "android" | "ios"
)
```

### 4.3. Field Models

```kotlin
// model/Field.kt
@Serializable
data class FieldResponse(
    val id: String,
    val name: String,
    val location: String?,
    val lat: Double?,
    val lng: Double?,
    val coverImageUrl: String?,
    val description: String?,
    val isLive: Boolean,
    val activeMatchId: String?,
    val gameModes: List<GameModeResponse>?,
    val currentGame: MatchSummaryResponse?
)

@Serializable
data class GameModeResponse(
    val id: String,
    val name: String,
    val description: String?,
    val rules: List<String>?,
    val maxPlayers: Int,
    val teamCount: Int,
    val respawnEnabled: Boolean,
    val respawnDelaySeconds: Int
)
```

### 4.4. Match Models

```kotlin
// model/Match.kt
@Serializable
data class MatchResponse(
    val id: String,
    val fieldId: String,
    val fieldName: String,
    val gameModeId: String,
    val gameModeName: String,
    val status: String,          // "WAITING" | "IN_PROGRESS" | "ENDED"
    val maxPlayers: Int,
    val playerCount: Int,
    val startedAt: String?,
    val endedAt: String?,
    val winningTeamId: String?,
    val winningTeamName: String?,
    val durationSeconds: Long?,
    val myTeamId: String?,       // null nếu chưa join
    val canJoin: Boolean,
    val teams: List<TeamDetailResponse>?,
    val result: String?          // "WIN" | "LOSE" | "DRAW" | null
)

@Serializable
data class MatchSummaryResponse(
    val id: String,
    val status: String,
    val gameModeName: String,
    val maxPlayers: Int,
    val playerCount: Int,
    val teams: List<TeamSummaryResponse>?
)

@Serializable
data class TeamDetailResponse(
    val id: String,
    val name: String,
    val colorHex: String?,
    val objectives: List<String>?,
    val respawnBase: String?,
    val players: List<PlayerInTeamResponse>?,
    val isWinner: Boolean?
)

@Serializable
data class TeamSummaryResponse(
    val id: String,
    val name: String,
    val colorHex: String?,
    val playerCount: Int
)

@Serializable
data class PlayerInTeamResponse(
    val userId: String,
    val displayName: String?,
    val avatarUrl: String?,
    val joinedAt: String?,
    val killCount: Int?,
    val deathCount: Int?
)

@Serializable
data class JoinTeamRequest(val teamId: String)

@Serializable
data class JoinTeamResponse(
    val matchId: String,
    val teamId: String,
    val userId: String,
    val joinedAt: String
)

@Serializable
data class HitReportResponse(
    val id: String,
    val matchId: String,
    val userId: String,
    val reportedAt: String,
    val respawnAt: String    // ISO8601 — frontend dùng countdown timer
)
```

### 4.5. Area Models

```kotlin
// model/Area.kt

// GeoJSON Polygon — coordinate order: [longitude, latitude]
@Serializable
data class GeoJsonPolygon(
    val type: String = "Polygon",
    val coordinates: List<List<List<Double>>>  // [outerRing, ...holes]
)

@Serializable
data class AreaResponse(
    val id: String,
    val matchId: String,
    val name: String,
    val description: String?,
    val colorHex: String,
    val areaType: String,   // "SPAWN" | "OBJECTIVE" | "BOUNDARY" | "DANGER" | "ZONE"
    val geometry: GeoJsonPolygon,
    val createdAt: String?
)
```

### 4.6. Event Models

```kotlin
// model/Event.kt
@Serializable
data class EventResponse(
    val id: String,
    val title: String,
    val description: String?,
    val fieldId: String,
    val fieldName: String,
    val organizerId: String,
    val organizerName: String,
    val startTime: String,
    val endTime: String,
    val maxCapacity: Int?,
    val rsvpCount: Int,
    val status: String,        // "upcoming" | "ongoing" | "cancelled" | "completed"
    val isRsvped: Boolean
)
```

---

## 5. API CONTRACTS & REPOSITORIES

### 5.1. AuthRepository

```kotlin
// repository/AuthRepository.kt
class AuthRepository(private val client: HttpClient) {

    /**
     * Đăng nhập bằng Google ID Token (từ Firebase Auth / Google Sign-In SDK).
     * POST /v1/auth/google
     *
     * Request: { "idToken": "eyJhbGci..." }
     * Response 200: ApiResponse<AuthResponse>
     */
    suspend fun signInWithGoogle(idToken: String): AuthResponse {
        return client.post("/v1/auth/google") {
            setBody(GoogleAuthRequest(idToken))
        }.body<ApiResponse<AuthResponse>>().data!!
    }

    /**
     * Đăng nhập bằng Apple Identity Token.
     * POST /v1/auth/apple
     *
     * Request: { "identityToken": "...", "displayName": "John", "email": "j@example.com" }
     * Response 200: ApiResponse<AuthResponse>
     *
     * NOTE: displayName và email chỉ gửi lần đầu tiên (Apple chỉ cung cấp 1 lần).
     */
    suspend fun signInWithApple(
        identityToken: String,
        displayName: String? = null,
        email: String? = null
    ): AuthResponse {
        return client.post("/v1/auth/apple") {
            setBody(AppleAuthRequest(identityToken, displayName, email))
        }.body<ApiResponse<AuthResponse>>().data!!
    }

    /**
     * Refresh access token.
     * POST /v1/auth/refresh
     *
     * Request: { "refreshToken": "..." }
     * Response 200: ApiResponse<AuthResponse> — accessToken và refreshToken MỚI
     *
     * NOTE: Ktor Auth plugin tự gọi endpoint này khi 401. Gọi thủ công khi app mở lại.
     */
    suspend fun refresh(refreshToken: String): AuthResponse {
        return client.post("/v1/auth/refresh") {
            setBody(RefreshTokenRequest(refreshToken))
        }.body<ApiResponse<AuthResponse>>().data!!
    }

    /**
     * Logout — invalidate refresh token phía server.
     * DELETE /v1/auth/logout
     * Auth: Bearer required
     *
     * Response 204: No content
     */
    suspend fun logout(refreshToken: String) {
        client.post("/v1/auth/logout") {
            setBody(LogoutRequest(refreshToken))
        }
    }
}
```

**Response mẫu:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "3db7335b-3025-40cf-a958-707412fcd88e",
      "displayName": "Player One",
      "email": "player@example.com",
      "avatarUrl": null,
      "role": "player",
      "isNewUser": true,
      "stats": null
    }
  },
  "status": 200,
  "timestamp": "2026-06-03T10:00:00Z"
}
```

---

### 5.2. UserRepository

```kotlin
// repository/UserRepository.kt
class UserRepository(private val client: HttpClient) {

    /**
     * Lấy profile của user hiện tại.
     * GET /v1/users/me
     * Auth: Bearer required
     */
    suspend fun getMe(): UserResponse =
        client.get("/v1/users/me").body<ApiResponse<UserResponse>>().data!!

    /**
     * Cập nhật profile.
     * PATCH /v1/users/me
     * Auth: Bearer required
     *
     * Request: { "displayName": "New Name", "avatarUrl": "https://..." }
     * Chỉ gửi field cần thay đổi.
     */
    suspend fun updateMe(displayName: String? = null, avatarUrl: String? = null): UserResponse =
        client.patch("/v1/users/me") {
            setBody(UpdateProfileRequest(displayName, avatarUrl))
        }.body<ApiResponse<UserResponse>>().data!!

    /**
     * Đăng ký/cập nhật FCM/APNs token để nhận push notification.
     * PUT /v1/users/me/device-token
     * Auth: Bearer required
     *
     * Request: { "token": "fcm-token-abc123", "platform": "android" }
     * Response 204: No content
     *
     * Gọi sau khi login thành công và sau khi token push được cấp.
     */
    suspend fun upsertDeviceToken(token: String, platform: String) {
        client.put("/v1/users/me/device-token") {
            setBody(DeviceTokenRequest(token, platform))
        }
    }

    /**
     * Lấy lịch sử match của user hiện tại.
     * GET /v1/users/me/matches?page=0&size=20
     * Auth: Bearer required
     */
    suspend fun getMyMatches(page: Int = 0, size: Int = 20): PageResponse<MatchResponse> =
        client.get("/v1/users/me/matches") {
            parameter("page", page)
            parameter("size", size)
        }.body<ApiResponse<PageResponse<MatchResponse>>>().data!!

    /**
     * Lấy stats của bất kỳ user nào (public).
     * GET /v1/users/{userId}/stats
     * Auth: Bearer required
     */
    suspend fun getStats(userId: String): StatsResponse =
        client.get("/v1/users/$userId/stats")
            .body<ApiResponse<StatsResponse>>().data!!
}
```

**Response mẫu `/v1/users/me`:**
```json
{
  "data": {
    "id": "3db7335b-3025-40cf-a958-707412fcd88e",
    "displayName": "Player One",
    "email": "player@example.com",
    "avatarUrl": "https://cdn.example.com/avatar.jpg",
    "role": "player",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastSeenAt": "2026-06-03T10:00:00Z",
    "isNewUser": false,
    "stats": {
      "userId": "3db7335b-...",
      "totalMatches": 42,
      "wins": 20,
      "losses": 18,
      "draws": 4,
      "winRate": 0.476,
      "totalKills": 150,
      "totalDeaths": 120,
      "updatedAt": "2026-06-03T09:00:00Z"
    }
  },
  "status": 200,
  "timestamp": "2026-06-03T10:00:00Z"
}
```

---

### 5.3. FieldRepository

```kotlin
// repository/FieldRepository.kt
class FieldRepository(private val client: HttpClient) {

    /**
     * Lấy danh sách sân chơi (paginated, sort by name).
     * GET /v1/fields?page=0&size=20
     * Auth: Không cần (public endpoint)
     */
    suspend fun listFields(page: Int = 0, size: Int = 20): PageResponse<FieldResponse> =
        client.get("/v1/fields") {
            parameter("page", page)
            parameter("size", size)
        }.body<ApiResponse<PageResponse<FieldResponse>>>().data!!

    /**
     * Lấy chi tiết một sân chơi.
     * GET /v1/fields/{fieldId}
     * Auth: Optional — nếu có token sẽ trả thêm thông tin cá nhân hóa
     *
     * Response bao gồm:
     * - gameModes: danh sách chế độ chơi của sân
     * - currentGame: match đang diễn ra (nếu có)
     * - isLive: sân có đang có trận không
     * - activeMatchId: UUID của match đang active
     */
    suspend fun getField(fieldId: String): FieldResponse =
        client.get("/v1/fields/$fieldId")
            .body<ApiResponse<FieldResponse>>().data!!
}
```

**Response mẫu `/v1/fields`:**
```json
{
  "data": {
    "content": [
      {
        "id": "db7a38f6-bac3-485c-af83-f54fc1411bf6",
        "name": "Jungle Zone Alpha",
        "location": "Thu Duc, HCMC",
        "lat": 10.8231,
        "lng": 106.6297,
        "coverImageUrl": "https://cdn.example.com/field1.jpg",
        "description": "Dense jungle terrain",
        "isLive": true,
        "activeMatchId": "match-uuid-1",
        "gameModes": [
          {
            "id": "c4233a78-b88b-440c-b8f0-f002438a3e67",
            "name": "Team Deathmatch",
            "description": "Last team standing wins",
            "rules": ["Call HIT when shot", "No blind firing"],
            "maxPlayers": 20,
            "teamCount": 2,
            "respawnEnabled": true,
            "respawnDelaySeconds": 30
          }
        ],
        "currentGame": null
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1,
    "last": true
  },
  "status": 200,
  "timestamp": "2026-06-03T10:00:00Z"
}
```

---

### 5.4. MatchRepository

```kotlin
// repository/MatchRepository.kt
class MatchRepository(private val client: HttpClient) {

    /**
     * Lấy match đang active của user hiện tại.
     * GET /v1/matches/active
     * Auth: Bearer required
     *
     * Response 200: ApiResponse<MatchResponse>
     * Response 204: No content — user không có match nào active
     *
     * Gọi ngay khi app mở để check xem user có đang trong match không.
     */
    suspend fun getActiveMatch(): MatchResponse? {
        val response = client.get("/v1/matches/active")
        return if (response.status == HttpStatusCode.NoContent) null
        else response.body<ApiResponse<MatchResponse>>().data
    }

    /**
     * Lấy chi tiết một match.
     * GET /v1/matches/{matchId}
     * Auth: Bearer required
     *
     * Response bao gồm:
     * - teams: danh sách đội với players
     * - myTeamId: đội của user hiện tại (null nếu chưa join)
     * - canJoin: user còn có thể join không
     * - result: "WIN" | "LOSE" | "DRAW" (chỉ có sau khi match ENDED)
     */
    suspend fun getMatch(matchId: String): MatchResponse =
        client.get("/v1/matches/$matchId")
            .body<ApiResponse<MatchResponse>>().data!!

    /**
     * Tham gia vào một đội trong match.
     * POST /v1/matches/{matchId}/join
     * Auth: Bearer required
     *
     * Request: { "teamId": "team-uuid" }
     * Response 201: ApiResponse<JoinTeamResponse>
     *
     * Errors:
     * - 409 ALREADY_EXISTS: đã ở trong một đội rồi
     * - 422 MATCH_NOT_JOINABLE: match không ở trạng thái WAITING
     * - 422 CAPACITY_FULL: match đã đầy người
     */
    suspend fun joinTeam(matchId: String, teamId: String): JoinTeamResponse =
        client.post("/v1/matches/$matchId/join") {
            setBody(JoinTeamRequest(teamId))
        }.body<ApiResponse<JoinTeamResponse>>().data!!

    /**
     * Rời khỏi match (chỉ khi match đang WAITING).
     * DELETE /v1/matches/{matchId}/leave
     * Auth: Bearer required
     *
     * Response 204: No content
     * Error 422 MATCH_NOT_JOINABLE: không thể rời khi match đang IN_PROGRESS
     */
    suspend fun leaveMatch(matchId: String) {
        client.delete("/v1/matches/$matchId/leave")
    }

    /**
     * Báo cáo bị bắn (self-report HIT).
     * POST /v1/matches/{matchId}/hit
     * Auth: Bearer required
     *
     * Response 201: ApiResponse<HitReportResponse>
     *
     * Logic backend:
     * - Nếu đã báo hit trong respawnDelay giây vừa qua → trả về hit cũ (idempotent)
     * - respawnAt = now + respawnDelaySeconds → frontend dùng làm countdown timer
     *
     * WebSocket cũng sẽ broadcast event HIT_REPORTED đến /topic/match/{matchId}/game
     */
    suspend fun reportHit(matchId: String): HitReportResponse =
        client.post("/v1/matches/$matchId/hit")
            .body<ApiResponse<HitReportResponse>>().data!!

    /**
     * Lấy danh sách match lịch sử của user.
     * GET /v1/users/me/matches?page=0&size=20
     * Auth: Bearer required
     * (Delegate sang UserRepository nếu muốn tách rõ)
     */
    suspend fun getMyMatches(page: Int = 0, size: Int = 20): PageResponse<MatchResponse> =
        client.get("/v1/users/me/matches") {
            parameter("page", page)
            parameter("size", size)
        }.body<ApiResponse<PageResponse<MatchResponse>>>().data!!
}
```

**Response mẫu `/v1/matches/{matchId}`:**
```json
{
  "data": {
    "id": "match-uuid-1",
    "fieldId": "field-uuid-1",
    "fieldName": "Jungle Zone Alpha",
    "gameModeId": "gamemode-uuid-1",
    "gameModeName": "Team Deathmatch",
    "status": "WAITING",
    "maxPlayers": 20,
    "playerCount": 4,
    "startedAt": null,
    "endedAt": null,
    "winningTeamId": null,
    "winningTeamName": null,
    "durationSeconds": null,
    "myTeamId": "team-alpha-uuid",
    "canJoin": true,
    "teams": [
      {
        "id": "team-alpha-uuid",
        "name": "Alpha",
        "colorHex": "#3B82F6",
        "objectives": null,
        "respawnBase": "Alpha Base",
        "isWinner": null,
        "players": [
          {
            "userId": "user-uuid-1",
            "displayName": "Player One",
            "avatarUrl": null,
            "joinedAt": "2026-06-03T10:00:00Z",
            "killCount": null,
            "deathCount": null
          }
        ]
      },
      {
        "id": "team-bravo-uuid",
        "name": "Bravo",
        "colorHex": "#EF4444",
        "objectives": null,
        "respawnBase": "Bravo Base",
        "isWinner": null,
        "players": []
      }
    ],
    "result": null
  },
  "status": 200,
  "timestamp": "2026-06-03T10:00:00Z"
}
```

---

### 5.5. AreaRepository

```kotlin
// repository/AreaRepository.kt
class AreaRepository(private val client: HttpClient) {

    /**
     * Lấy danh sách tất cả areas của một match.
     * GET /v1/matches/{matchId}/areas
     * Auth: Bearer required
     *
     * Gọi sau khi match bắt đầu để hiển thị overlay bản đồ.
     * Coordinate order: [longitude, latitude] — GeoJSON spec RFC 7946.
     */
    suspend fun listAreas(matchId: String): List<AreaResponse> =
        client.get("/v1/matches/$matchId/areas")
            .body<ApiResponse<List<AreaResponse>>>().data ?: emptyList()

    /**
     * Lấy chi tiết một area.
     * GET /v1/matches/{matchId}/areas/{areaId}
     * Auth: Bearer required
     */
    suspend fun getArea(matchId: String, areaId: String): AreaResponse =
        client.get("/v1/matches/$matchId/areas/$areaId")
            .body<ApiResponse<AreaResponse>>().data!!
}
```

**Response mẫu `/v1/matches/{matchId}/areas`:**
```json
{
  "data": [
    {
      "id": "area-uuid-1",
      "matchId": "match-uuid-1",
      "name": "Alpha Spawn",
      "description": "Điểm xuất phát đội Alpha",
      "colorHex": "#3B82F6",
      "areaType": "SPAWN",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [106.700, 10.800],
            [106.710, 10.800],
            [106.710, 10.810],
            [106.700, 10.810],
            [106.700, 10.800]
          ]
        ]
      },
      "createdAt": "2026-06-03T10:00:00Z"
    },
    {
      "id": "area-uuid-2",
      "matchId": "match-uuid-1",
      "name": "Objective A",
      "description": null,
      "colorHex": "#EF4444",
      "areaType": "OBJECTIVE",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [106.705, 10.805],
            [106.707, 10.805],
            [106.707, 10.807],
            [106.705, 10.807],
            [106.705, 10.805]
          ]
        ]
      },
      "createdAt": "2026-06-03T10:05:00Z"
    }
  ],
  "status": 200,
  "timestamp": "2026-06-03T10:10:00Z"
}
```

---

### 5.6. EventRepository

```kotlin
// repository/EventRepository.kt
class EventRepository(private val client: HttpClient) {

    /**
     * Lấy danh sách sự kiện (sort by startTime asc).
     * GET /v1/events?page=0&size=20
     * Auth: Optional — isRsvped chỉ có khi có token
     */
    suspend fun listEvents(page: Int = 0, size: Int = 20): PageResponse<EventResponse> =
        client.get("/v1/events") {
            parameter("page", page)
            parameter("size", size)
        }.body<ApiResponse<PageResponse<EventResponse>>>().data!!

    /**
     * Lấy chi tiết một sự kiện.
     * GET /v1/events/{eventId}
     * Auth: Optional
     */
    suspend fun getEvent(eventId: String): EventResponse =
        client.get("/v1/events/$eventId")
            .body<ApiResponse<EventResponse>>().data!!

    /**
     * RSVP tham dự sự kiện.
     * POST /v1/events/{eventId}/rsvp
     * Auth: Bearer required
     *
     * Response 201: ApiResponse<null>
     */
    suspend fun rsvp(eventId: String) {
        client.post("/v1/events/$eventId/rsvp")
    }

    /**
     * Hủy RSVP.
     * DELETE /v1/events/{eventId}/rsvp
     * Auth: Bearer required
     *
     * Response 204: No content
     */
    suspend fun cancelRsvp(eventId: String) {
        client.delete("/v1/events/$eventId/rsvp")
    }
}
```

---

## 6. WEBSOCKET — REALTIME MATCH EVENTS

### 6.1. Kết nối

```
Endpoint: ws://<host>/ws
Protocol: STOMP over SockJS
```

> **KMP note:** Ktor WebSocket client không hỗ trợ STOMP native. Dùng `krossbow` library hoặc implement STOMP frame parser thủ công.

```kotlin
// Recommended: krossbow (KMP STOMP client)
// implementation("org.hildan.krossbow:krossbow-stomp-core:x.x.x")
// implementation("org.hildan.krossbow:krossbow-websocket-ktor:x.x.x")
```

### 6.2. Subscribe Topics

| Topic | Khi nào subscribe | Mô tả |
|-------|------------------|-------|
| `/topic/match/{matchId}/lobby` | Khi vào màn hình match lobby | Nhận sự kiện join/leave/start/end |
| `/topic/match/{matchId}/game` | Sau khi match IN_PROGRESS | Nhận HIT events realtime |

### 6.3. Event Payloads

```kotlin
// Tất cả events đều có field "event" để phân biệt loại

// PLAYER_JOINED — /topic/match/{matchId}/lobby
{
    "event": "PLAYER_JOINED",
    "matchId": "match-uuid-1",
    "teamId": "team-alpha-uuid",
    "player": {
        "userId": "user-uuid-1",
        "displayName": "Player One",
        "avatarUrl": "",
        "joinedAt": "2026-06-03T10:00:00Z"
    }
}

// PLAYER_LEFT — /topic/match/{matchId}/lobby
{
    "event": "PLAYER_LEFT",
    "matchId": "match-uuid-1",
    "teamId": "team-alpha-uuid",
    "userId": "user-uuid-1"
}

// MATCH_STARTED — /topic/match/{matchId}/lobby
{
    "event": "MATCH_STARTED",
    "matchId": "match-uuid-1",
    "startedAt": "2026-06-03T10:05:00Z"
}

// MATCH_ENDED — /topic/match/{matchId}/lobby
{
    "event": "MATCH_ENDED",
    "matchId": "match-uuid-1",
    "endedAt": "2026-06-03T11:00:00Z",
    "winningTeamId": "team-alpha-uuid"   // có thể vắng mặt nếu hòa
}

// HIT_REPORTED — /topic/match/{matchId}/game
{
    "event": "HIT_REPORTED",
    "matchId": "match-uuid-1",
    "userId": "user-uuid-1",
    "respawnAt": "2026-06-03T10:06:30Z"  // dùng làm countdown
}
```

### 6.4. MatchWebSocketManager

```kotlin
// network/MatchWebSocketManager.kt
sealed class MatchEvent {
    data class PlayerJoined(val matchId: String, val teamId: String,
                            val userId: String, val displayName: String) : MatchEvent()
    data class PlayerLeft(val matchId: String, val teamId: String, val userId: String) : MatchEvent()
    data class MatchStarted(val matchId: String, val startedAt: String) : MatchEvent()
    data class MatchEnded(val matchId: String, val endedAt: String, val winningTeamId: String?) : MatchEvent()
    data class HitReported(val matchId: String, val userId: String, val respawnAt: String) : MatchEvent()
    data class Error(val message: String) : MatchEvent()
}

class MatchWebSocketManager(
    private val stompClient: StompClient,  // krossbow
    private val tokenStorage: TokenStorage
) {
    private val _events = MutableSharedFlow<MatchEvent>(replay = 0)
    val events: SharedFlow<MatchEvent> = _events.asSharedFlow()

    suspend fun connectToMatch(matchId: String) {
        val session = stompClient.connect(
            url = "ws://$HOST/ws",
            customStompConnectHeaders = mapOf(
                "Authorization" to "Bearer ${tokenStorage.getAccessToken()}"
            )
        )

        // Subscribe lobby events
        session.subscribeText("/topic/match/$matchId/lobby").collect { frame ->
            parseAndEmit(frame.body)
        }

        // Subscribe game events (realtime HIT)
        session.subscribeText("/topic/match/$matchId/game").collect { frame ->
            parseAndEmit(frame.body)
        }
    }

    private suspend fun parseAndEmit(json: String) {
        val map = Json.decodeFromString<Map<String, JsonElement>>(json)
        val event = map["event"]?.jsonPrimitive?.content ?: return

        val matchEvent = when (event) {
            "PLAYER_JOINED" -> MatchEvent.PlayerJoined(
                matchId     = map["matchId"]!!.jsonPrimitive.content,
                teamId      = map["teamId"]!!.jsonPrimitive.content,
                userId      = map["player"]!!.jsonObject["userId"]!!.jsonPrimitive.content,
                displayName = map["player"]!!.jsonObject["displayName"]!!.jsonPrimitive.content
            )
            "PLAYER_LEFT" -> MatchEvent.PlayerLeft(
                matchId = map["matchId"]!!.jsonPrimitive.content,
                teamId  = map["teamId"]!!.jsonPrimitive.content,
                userId  = map["userId"]!!.jsonPrimitive.content
            )
            "MATCH_STARTED" -> MatchEvent.MatchStarted(
                matchId   = map["matchId"]!!.jsonPrimitive.content,
                startedAt = map["startedAt"]!!.jsonPrimitive.content
            )
            "MATCH_ENDED" -> MatchEvent.MatchEnded(
                matchId       = map["matchId"]!!.jsonPrimitive.content,
                endedAt       = map["endedAt"]!!.jsonPrimitive.content,
                winningTeamId = map["winningTeamId"]?.jsonPrimitive?.content
            )
            "HIT_REPORTED" -> MatchEvent.HitReported(
                matchId    = map["matchId"]!!.jsonPrimitive.content,
                userId     = map["userId"]!!.jsonPrimitive.content,
                respawnAt  = map["respawnAt"]!!.jsonPrimitive.content
            )
            else -> null
        }
        matchEvent?.let { _events.emit(it) }
    }
}
```

---

## 7. COMPLETE USER FLOW — MOBILE APP

### Flow 1: Onboarding

```
App mở
  → checkToken() — có token hợp lệ?
      YES → getActiveMatch() — đang trong match?
              YES → navigate(MatchLobbyScreen)
              NO  → navigate(HomeScreen)
      NO  → navigate(LoginScreen)
               → signInWithGoogle(idToken) hoặc signInWithApple(...)
               → save tokens → upsertDeviceToken()
               → navigate(HomeScreen)
```

### Flow 2: Tìm sân & Vào match

```
HomeScreen
  → listFields(page=0)           — hiển thị danh sách sân, có pin trên map
  → [chọn sân] getField(fieldId) — xem chi tiết, isLive, currentGame
  → [sân đang có game] getMatch(activeMatchId)
      → canJoin == true → hiển thị danh sách teams
      → [chọn team] joinTeam(matchId, teamId)
      → navigate(MatchLobbyScreen)
          → connectWebSocket("/topic/match/{matchId}/lobby")
          → listen PLAYER_JOINED / PLAYER_LEFT
          → listen MATCH_STARTED → navigate(GameScreen)
```

### Flow 3: Trong game

```
GameScreen
  → getMatch(matchId)             — load areas + teams
  → listAreas(matchId)            — hiển thị polygon overlay trên map
  → connectWebSocket("/topic/match/{matchId}/game")
  → [bị bắn] reportHit(matchId)
      → response.respawnAt → CountdownTimer(respawnAt)
      → WS broadcast HIT_REPORTED → update UI các player khác
  → listen MATCH_ENDED → navigate(ResultScreen)
```

### Flow 4: Xem kết quả

```
ResultScreen
  → getMatch(matchId)    — result: "WIN" | "LOSE" | "DRAW"
  → getStats(userId)     — stats mới nhất sau khi match cập nhật
  → navigate(HomeScreen)
```

---

## 8. ERROR HANDLING PATTERN

```kotlin
// Wrapper kết quả — dùng thay vì throw/catch ở UI layer
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val code: String, val message: String, val httpStatus: Int) : Result<Nothing>()
}

// Extension function cho repository calls
suspend fun <T> safeApiCall(block: suspend () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: ApiException) {
    Result.Error(e.code, e.message, e.httpStatus)
} catch (e: Exception) {
    Result.Error("NETWORK_ERROR", e.message ?: "Unknown error", 0)
}

// Sử dụng trong ViewModel:
viewModelScope.launch {
    val result = safeApiCall { matchRepository.joinTeam(matchId, teamId) }
    when (result) {
        is Result.Success -> { /* navigate */ }
        is Result.Error   -> when (result.code) {
            "ALREADY_EXISTS"      -> showToast("Bạn đã ở trong đội rồi")
            "CAPACITY_FULL"       -> showToast("Match đã đầy")
            "MATCH_NOT_JOINABLE"  -> showToast("Match không thể join lúc này")
            "TOKEN_EXPIRED"       -> { /* Ktor Auth plugin tự refresh, retry */ }
            else                  -> showToast(result.message)
        }
    }
}
```

---

## 9. CHECKLIST TRƯỚC KHI TEST

- [ ] `BASE_URL` đúng — `http://10.0.2.2:8080` với Android emulator, `http://localhost:8080` với iOS simulator
- [ ] Ktor `Auth` plugin đã configure `refreshTokens` → không bị logout khi token hết hạn
- [ ] `ignoreUnknownKeys = true` trong JSON serializer — backend có thể thêm field mới
- [ ] STOMP headers có `Authorization` — backend kiểm tra khi connect WS
- [ ] `reportHit` là idempotent — safe khi gọi nhiều lần
- [ ] `getActiveMatch()` trả về `null` khi 204 (không throw exception)
- [ ] Coordinate order của GeoJSON: `[longitude, latitude]` — đúng thứ tự cho Mapbox/map SDK
- [ ] `upsertDeviceToken()` gọi cả sau khi token FCM/APNs được refresh (không chỉ sau login)
