# Airsoft Tactic Server

> Spring Boot 3.3 + Supabase backend

---

## Prerequisites
- Java 21+
- Gradle 8+
- Tài khoản Supabase (https://supabase.com)

## Setup

### 1. Tạo project Supabase
1. Vào https://app.supabase.com → New Project
2. Lấy các giá trị sau từ **Settings → API** và **Settings → Database**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_DB_URL` (format: `jdbc:postgresql://<host>:5432/postgres`)
   - `SUPABASE_DB_PASSWORD`

### 2. Cấu hình environment
Tạo file `.env` ở root (hoặc set env vars):
```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_DB_URL=jdbc:postgresql://db.<ref>.supabase.co:5432/postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-db-password
```

### 3. Chạy project
```bash
./gradlew bootRun
```

### 4. Build JAR
```bash
./gradlew bootJar
java -jar build/libs/airsoft-tactic-server-*.jar
```

## API Base URL
```
http://localhost:8080/api/v1
```

## Authentication
Tất cả protected endpoints yêu cầu header:
```
Authorization: Bearer <supabase-jwt-token>
```

Lấy token bằng cách đăng nhập qua Supabase Auth (client SDK hoặc REST API).

---

## Project Structure
Xem [CLAUDE.md](./CLAUDE.md) để biết conventions.  
Xem [SPEC.md](./SPEC.md) để biết đặc tả và User Stories.
