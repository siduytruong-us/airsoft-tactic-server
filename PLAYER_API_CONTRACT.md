# API CONTRACT SPEC: AIRSOFT TACTIC MOBILE APP (PLAYER API)

Tài liệu này định nghĩa chi tiết API Backend dành cho Mobile Developer (sử dụng Flutter/React Native/Swift/Kotlin) để xây dựng ứng dụng cho người chơi (Player).

Hãy đọc kỹ các Request và Response để map data model một cách chính xác.

---

## 1. CẤU TRÚC PHẢN HỒI CHUNG (BASE RESPONSE WRAPPER)
Hầu hết các API thành công (trừ một số endpoint trả về 204 No Content) đều bọc kết quả trong cấu trúc sau:

```json
{
  "success": true,
  "message": "Success message",
  "data": { ... } // Payload chính
}
```

Đối với API phân trang:
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "content": [ ... ], // Danh sách item
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5,
    "last": false
  }
}
```

---

## 2. API CONTRACTS CHI TIẾT

### 2.1. XÁC THỰC (AUTHENTICATION)

**A. Đăng nhập bằng Google**
- **Method:** `POST`
- **URL:** `/v1/auth/google`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "idToken": "google_id_token_string"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Success",
    "data": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "def456...",
      "expiresIn": 86400,
      "tokenType": "Bearer",
      "user": {
        "id": "user-uuid",
        "displayName": "Player Name",
        "email": "player@example.com",
        "role": "PLAYER",
        "isNewUser": true
      }
    }
  }
  ```

**B. Đăng nhập bằng Apple**
- **Method:** `POST`
- **URL:** `/v1/auth/apple`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "identityToken": "apple_identity_token_string",
    "displayName": "Player Name", // (Optional) Chỉ có trong lần đăng nhập đầu tiên
    "email": "player@example.com"  // (Optional)
  }
  ```
- **Response:** Tương tự Đăng nhập Google.

**C. Cấp lại Token (Refresh Token)**
- **Method:** `POST`
- **URL:** `/v1/auth/refresh`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "refreshToken": "def456..."
  }
  ```
- **Response:** Tương tự Đăng nhập Google (trả về access token mới).

**D. Đăng xuất**
- **Method:** `POST`
- **URL:** `/v1/auth/logout`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "refreshToken": "def456..."
  }
  ```
- **Response Success:** `204 No Content` (Không có body).

---

### 2.2. HỒ SƠ NGƯỜI DÙNG (USER PROFILE)

**A. Lấy thông tin bản thân**
- **Method:** `GET`
- **URL:** `/v1/users/me`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Success",
    "data": {
      "id": "user-uuid",
      "displayName": "Pro Sniper",
      "email": "sniper@example.com",
      "avatarUrl": "https://...",
      "role": "PLAYER",
      "createdAt": "2023-01-01T00:00:00Z",
      "stats": {
        "totalMatches": 50,
        "wins": 30,
        "losses": 15,
        "draws": 5,
        "winRate": 0.6
      }
    }
  }
  ```

**B. Cập nhật thông tin bản thân**
- **Method:** `PATCH`
- **URL:** `/v1/users/me`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "displayName": "New Name",
    "avatarUrl": "https://new-url..."
  }
  ```
- **Response:** Trả về User object đã cập nhật.

**C. Đăng ký Device Token (Push Notification FCM)**
- **Method:** `PUT`
- **URL:** `/v1/users/me/device-token`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "token": "fcm_token_string",
    "platform": "android" // hoặc "ios"
  }
  ```
- **Response Success:** `204 No Content`

**D. Lấy lịch sử trận đấu của bản thân (Phân trang)**
- **Method:** `GET`
- **URL:** `/v1/users/me/matches?page=0&size=20`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response:** Trả về danh sách MatchResponse (xem mục Trận Đấu).

**E. Lấy thống kê của User khác (Public Stats)**
- **Method:** `GET`
- **URL:** `/v1/users/{userId}/stats`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Success",
    "data": {
      "totalMatches": 100,
      "wins": 60,
      "losses": 40,
      "draws": 0,
      "winRate": 0.6
    }
  }
  ```

---

### 2.3. SÂN CHƠI & CHẾ ĐỘ CHƠI (FIELDS & GAME MODES)

**A. Lấy danh sách sân chơi (Phân trang)**
- **Method:** `GET`
- **URL:** `/v1/fields?page=0&size=20`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Success",
    "data": {
      "content": [
        {
          "id": "field-uuid",
          "name": "Jungle Alpha",
          "location": "District 9",
          "lat": 10.8,
          "lng": 106.8,
          "coverImageUrl": "...",
          "isLive": true,
          "activeMatchId": "match-uuid",
          "gameModes": [ ... ]
        }
      ],
      "page": 0, ...
    }
  }
  ```

**B. Lấy chi tiết sân chơi**
- **Method:** `GET`
- **URL:** `/v1/fields/{fieldId}`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response:** Trả về Field object chi tiết, bao gồm `currentGame` nếu `isLive` là true.

**C. Lấy danh sách tất cả Game Modes (Global)**
- **Method:** `GET`
- **URL:** `/api/game-modes`
- *(Lưu ý: Endpoint này không bọc trong `ApiResponse`, trả về trực tiếp Array)*
- **Response Success (200 OK):**
  ```json
  [
    {
      "id": "gm-uuid",
      "name": "Team Deathmatch",
      "description": "...",
      "rules": ["rule 1"],
      "maxPlayers": 40,
      "teamCount": 2,
      "respawnEnabled": true,
      "respawnDelaySeconds": 30
    }
  ]
  ```

---

### 2.4. SỰ KIỆN (EVENTS)

**A. Lấy danh sách sự kiện (Phân trang)**
- **Method:** `GET`
- **URL:** `/v1/events?page=0&size=20`
- **Headers:** `Authorization: Bearer <accessToken>` (Optional, nhưng truyền vào sẽ trả về thuộc tính `isRsvped`)
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "content": [
        {
          "id": "event-uuid",
          "title": "Sunday Skirmish",
          "fieldId": "field-uuid",
          "fieldName": "Jungle Alpha",
          "startTime": "2024-01-01T08:00:00Z",
          "endTime": "2024-01-01T17:00:00Z",
          "rsvpCount": 15,
          "status": "UPCOMING",
          "isRsvped": true
        }
      ]
    }
  }
  ```

**B. Tham gia / Đăng ký sự kiện (RSVP)**
- **Method:** `POST`
- **URL:** `/v1/events/{eventId}/rsvp`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success:** `201 Created`

**C. Hủy tham gia sự kiện**
- **Method:** `DELETE`
- **URL:** `/v1/events/{eventId}/rsvp`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success:** `204 No Content`

---

### 2.5. TRẬN ĐẤU (MATCHES) - DÀNH CHO PLAYER

*Ghi chú: Việc TẠO, BẮT ĐẦU và KẾT THÚC trận đấu chỉ dành cho ADMIN. Player chỉ có thể THAM GIA, RỜI KHỎI và BÁO HIT.*

**A. Kiểm tra trận đấu đang tham gia (khi mở app)**
- **Method:** `GET`
- **URL:** `/v1/matches/active`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success:** 
  - Nếu có trận đang tham gia: `200 OK` trả về chi tiết trận đấu (MatchResponse).
  - Nếu không có: `204 No Content`.

**B. Lấy chi tiết / Trạng thái sảnh chờ (Lobby)**
- **Method:** `GET`
- **URL:** `/v1/matches/{matchId}` hoặc `/v1/matches/{matchId}/detail`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "match-uuid",
      "status": "WAITING", // WAITING, IN_PROGRESS, ENDED
      "gameModeName": "Team Deathmatch",
      "playerCount": 10,
      "maxPlayers": 20,
      "canJoin": true,
      "myTeamId": null, // UUID nếu user đã join 1 team, null nếu chưa
      "teams": [
        {
          "id": "team-alpha",
          "name": "Alpha",
          "colorHex": "#3B82F6",
          "players": [
            { "userId": "uuid", "displayName": "Player 1", "avatarUrl": "..." }
          ]
        },
        {
          "id": "team-bravo",
          "name": "Bravo", ...
        }
      ]
    }
  }
  ```

**C. Chọn team / Tham gia trận đấu**
- **Method:** `POST`
- **URL:** `/v1/matches/{matchId}/join`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "teamId": "team-alpha-uuid"
  }
  ```
- **Response Success:** `201 Created`

**D. Rời khỏi team / trận đấu (Chỉ khi status = WAITING)**
- **Method:** `DELETE`
- **URL:** `/v1/matches/{matchId}/leave`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success:** `204 No Content`

**E. Báo Hit (Bị bắn trúng) (Chỉ khi status = IN_PROGRESS)**
- **Method:** `POST`
- **URL:** `/v1/matches/{matchId}/hit`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "hit-event-uuid",
      "matchId": "match-uuid",
      "userId": "user-uuid",
      "reportedAt": "2024-01-01T08:15:00Z",
      "respawnAt": "2024-01-01T08:15:30Z" // Thời gian được phép hồi sinh
    }
  }
  ```

---
*Về phần giao tiếp Real-time trong lúc trận đấu diễn ra, ứng dụng cần kết nối WebSocket (hoặc Supabase Realtime nếu được cấu hình) để nhận các event (MatchStarted, PlayerJoined, HitReported, MatchEnded).*