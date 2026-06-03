# API CONTRACT SPEC: AIRSOFT TACTIC ADMIN DASHBOARD

Bạn là một AI Assistant chuyên viết code Frontend (React/Next.js/TypeScript). File này chứa toàn bộ định nghĩa (Contract) của các API Backend cần thiết để bạn xây dựng hệ thống Admin Dashboard một cách hoàn hảo. 

Hãy đọc kỹ các định nghĩa về Request (Method, URL, Headers, Body) và Response (Mô phỏng JSON) để tạo ra các Type/Interface TypeScript tương ứng, cũng như thiết lập các hàm fetch bằng Axios / React Query một cách chính xác nhất.

---

## 1. CẤU TRÚC PHẢN HỒI CHUNG (BASE RESPONSE WRAPPER)
Tất cả các API (ngoại trừ lỗi hệ thống) đều trả về một JSON Object có cấu trúc cơ bản như sau. Hãy tạo một Generic Type trong TypeScript cho nó:
```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T; // Payload chính
  // Đối với API có phân trang (Pagination), có thể có thêm:
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}
```

---

## 2. API CONTRACTS CHI TIẾT

### 2.1. AUTHENTICATION (ĐĂNG NHẬP)

**A. Bootstrap First Admin** (Khởi tạo admin đầu tiên)
- **Method:** `POST`
- **URL:** `/v1/admin/auth/bootstrap`
- **Headers:** `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "username": "admin",
    "password": "Admin@123",
    "displayName": "Super Admin"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Admin account bootstrapped successfully",
    "data": {
      "id": "uuid-1234",
      "username": "admin",
      "role": "SUPER_ADMIN"
    }
  }
  ```

**B. Admin Login**
- **Method:** `POST`
- **URL:** `/v1/admin/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "username": "admin",
    "password": "Admin@123"
  }
  ```
- **Response Success (200 OK):** (Frontend phải lưu `accessToken` này để dùng cho các API sau)
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
      "expiresIn": 86400,
      "user": {
        "id": "uuid-1234",
        "username": "admin",
        "displayName": "Super Admin",
        "role": "SUPER_ADMIN"
      }
    }
  }
  ```

**C. Create Admin Account** (Chỉ dùng được khi đã có Token)
- **Method:** `POST`
- **URL:** `/v1/admin/auth/create`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "username": "admin2",
    "password": "SecurePass@456",
    "displayName": "Field Manager"
  }
  ```

---

### 2.2. DASHBOARD & STATS

**A. Lấy thông số hệ thống**
- **Method:** `GET`
- **URL:** `/v1/admin/stats`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stats retrieved",
    "data": {
      "totalUsers": 1500,
      "totalFields": 12,
      "activeMatches": 3,
      "totalMatchesPlayed": 450
    }
  }
  ```

---

### 2.3. FIELD MANAGEMENT (QUẢN LÝ SÂN CHƠI)

**A. Lấy danh sách sân chơi (Có phân trang)**
- **Method:** `GET`
- **URL:** `/v1/fields?page=0&size=20`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Fields retrieved",
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "data": [
      {
        "id": "field-uuid-1",
        "name": "Jungle Zone Alpha",
        "location": "Thu Duc, HCMC",
        "lat": 10.8231,
        "lng": 106.6297,
        "description": "Dense jungle terrain",
        "status": "ACTIVE"
      }
    ]
  }
  ```

**B. Tạo sân chơi mới**
- **Method:** `POST`
- **URL:** `/v1/admin/fields`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "name": "Jungle Zone Alpha",
    "location": "Thu Duc, HCMC",
    "lat": 10.8231,
    "lng": 106.6297,
    "description": "Dense jungle terrain"
  }
  ```
- **Response Success (201 Created):** Trả về object Field vừa tạo (giống object trong mảng của mục A).

**C. Cập nhật sân chơi**
- **Method:** `PUT`
- **URL:** `/v1/admin/fields/{fieldId}`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request:** (Có thể gửi 1 phần hoặc toàn bộ object)
  ```json
  {
    "name": "Jungle Zone Alpha V2",
    "location": "Thu Duc, HCMC"
  }
  ```

**D. Xóa sân chơi (Soft Delete)**
- **Method:** `DELETE`
- **URL:** `/v1/admin/fields/{fieldId}`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):** `{ "success": true, "message": "Field deleted successfully" }`

---

### 2.4. GAME MODES MANAGEMENT (QUẢN LÝ CHẾ ĐỘ CHƠI CỦA SÂN)

**A. Tạo Game Mode cho một sân cụ thể**
- **Method:** `POST`
- **URL:** `/v1/admin/fields/{fieldId}/game-modes`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "name": "Team Deathmatch",
    "description": "Last team standing wins",
    "rules": ["Call HIT when shot", "No blind firing"],
    "maxPlayers": 20,
    "teamCount": 2,
    "respawnEnabled": true,
    "respawnDelaySeconds": 30
  }
  ```
- **Response Success (201 Created):**
  ```json
  {
    "success": true,
    "message": "Game mode created",
    "data": {
      "id": "gamemode-uuid-1",
      "fieldId": "field-uuid-1",
      "name": "Team Deathmatch",
      "maxPlayers": 20,
      "respawnEnabled": true
      // ... các field khác
    }
  }
  ```

---

### 2.5. USER MANAGEMENT (QUẢN LÝ NGƯỜI DÙNG)

**A. Lấy danh sách người dùng**
- **Method:** `GET`
- **URL:** `/v1/admin/users?page=0&size=20`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Users retrieved",
    "page": 0,
    "size": 20,
    "totalElements": 1500,
    "data": [
      {
        "id": "user-uuid-1",
        "displayName": "Player One",
        "email": "player1@example.com",
        "role": "PLAYER",
        "createdAt": "2023-10-01T12:00:00Z"
      },
      {
        "id": "user-uuid-2",
        "displayName": "Admin User",
        "email": "admin@example.com",
        "role": "ADMIN",
        "createdAt": "2023-10-02T12:00:00Z"
      }
    ]
  }
  ```

**B. Thăng cấp / Thay đổi Role của User**
- **Method:** `PATCH`
- **URL:** `/v1/admin/users/{userId}/role`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "role": "ADMIN" // Các role hợp lệ: "PLAYER", "ADMIN"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "User role updated successfully"
  }
  ```

---

### 2.6. EVENT MANAGEMENT (QUẢN LÝ SỰ KIỆN - ADMIN)

**A. Lấy danh sách sự kiện**
- **Method:** `GET`
- **URL:** `/v1/events?page=0&size=20`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Events retrieved",
    "data": [
      {
        "id": "event-uuid-1",
        "title": "Weekend Skirmish",
        "description": "Open event for all skill levels.",
        "fieldId": "field-uuid-1",
        "fieldName": "Jungle Zone Alpha",
        "organizerId": "user-uuid-admin",
        "organizerName": "Admin User",
        "startTime": "2026-07-01T08:00:00Z",
        "endTime": "2026-07-01T17:00:00Z",
        "maxCapacity": 40,
        "rsvpCount": 15,
        "status": "UPCOMING",
        "isRsvped": false
      }
    ]
  }
  ```

**B. Tạo sự kiện mới (Admin)**
- **Method:** `POST`
- **URL:** `/v1/events`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "title": "Admin's Grand Tournament",
    "description": "A special event hosted by the admin.",
    "fieldId": "field-uuid-1",
    "startTime": "2026-08-01T09:00:00Z",
    "endTime": "2026-08-01T18:00:00Z",
    "maxCapacity": 50
  }
  ```
- **Response Success (201 Created):** Trả về object Event vừa tạo.

---

### 2.7. MATCH MANAGEMENT (QUẢN LÝ TRẬN ĐẤU - ADMIN)

**A. Tạo trận đấu mới (Admin)**
- **Method:** `POST`
- **URL:** `/v1/matches`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request:**
  ```json
  {
    "fieldId": "field-uuid-1",
    "gameModeId": "gamemode-uuid-1"
  }
  ```
- **Response Success (201 Created):**
  ```json
  {
    "success": true,
    "message": "Match created",
    "data": {
      "id": "match-uuid-1",
      "fieldId": "field-uuid-1",
      "fieldName": "Jungle Zone Alpha",
      "gameModeId": "gamemode-uuid-1",
      "gameModeName": "Team Deathmatch",
      "status": "LOBBY",
      "maxPlayers": 20,
      "playerCount": 1,
      "canJoin": true,
      "teams": [
        { "id": "team-alpha-uuid", "name": "Team Alpha", "players": [] },
        { "id": "team-bravo-uuid", "name": "Team Bravo", "players": [] }
      ]
    }
  }
  ```

**B. Bắt đầu trận đấu (Admin)**
- **Method:** `POST`
- **URL:** `/v1/matches/{matchId}/start`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response Success (200 OK):** Trả về object Match đã được cập nhật status `IN_PROGRESS`.

**C. Kết thúc trận đấu (Admin)**
- **Method:** `POST`
- **URL:** `/v1/matches/{matchId}/end`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body Request (Optional):**
  ```json
  {
    "winningTeamId": "team-alpha-uuid" // Gửi null nếu hòa
  }
  ```
- **Response Success (200 OK):** Trả về object Match đã được cập nhật status `ENDED`.

---

## 3. HƯỚNG DẪN DÀNH CHO CLAUDE ĐỂ CODE (ACTION ITEMS)

Dựa vào API Contract ở trên, hãy thực hiện các công việc sau theo trình tự để xây dựng Web Admin:

1. **Tạo file `src/types/api.ts`**: Viết Interface `ApiResponse<T>` và các Type cụ thể như `AuthResponse`, `Stats`, `Field`, `GameMode`, `User`, `Event`, `Match`.
2. **Setup Axios (`src/lib/axios.ts`)**: 
   - Base URL cấu hình bằng `process.env.NEXT_PUBLIC_API_BASE_URL`.
   - Viết Interceptor gắn header `Authorization: Bearer` lấy từ LocalStorage/Zustand.
   - Viết Interceptor xử lý lỗi 401: Xóa token và redirect về `/login`.
3. **Viết Custom Hooks API (`src/hooks/api/`)**: Sử dụng `@tanstack/react-query`
   - `useAuth`: Các hàm mutation cho `login`, `bootstrap`.
   - `useFields`: Lấy danh sách, tạo, sửa, xóa field.
   - `useUsers`: Lấy danh sách, thay đổi role.
   - `useEvents`: Lấy danh sách, tạo sự kiện.
   - `useMatches`: Tạo, bắt đầu, kết thúc trận đấu.
4. **Xây dựng UI Flow**:
   - Trang `/login`: Sử dụng form với 2 trường Username & Password.
   - Trang `/dashboard`: Hiển thị 4 thẻ Stats.
   - Trang `/fields`: Bảng danh sách sân, tích hợp Dialog để thêm mới và sửa, AlertDialog để xác nhận khi xóa.
   - Trang `/users`: Bảng danh sách User, có Dropdown select ở cột Role để gọi API PATCH đổi quyền.
   - Trang `/events`: Bảng danh sách sự kiện, có nút để tạo sự kiện mới.
   - Trang `/matches`: Giao diện quản lý các trận đấu đang diễn ra.

*Hãy đảm bảo code của bạn cover chặt chẽ các kiểu dữ liệu và mô phỏng sát nhất với cấu trúc JSON Request/Response ở trên.*
