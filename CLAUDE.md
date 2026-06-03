# CLAUDE.md — Spring Boot + Supabase Project Rules

## Stack
- **Language:** Java 21
- **Framework:** Spring Boot 3.3+
- **Build tool:** Gradle (Kotlin DSL) hoặc Maven
- **Database:** Supabase PostgreSQL (JDBC)
- **Auth:** Supabase Auth (JWT validation trong Spring Security)
- **Storage:** Supabase Storage (nếu cần)

## Architecture
```
Controller → Service → Repository (Spring Data JPA)
           ↕
          DTO  (request/response tách biệt với Entity)
```

## Package structure
```
com.example.<project>/
  config/         # SecurityConfig, JwtFilter, WebConfig
  controller/     # REST endpoints
  service/        # Business logic
  repository/     # Spring Data JPA interfaces
  entity/         # JPA entities
  dto/            # Request + Response DTOs
  exception/      # GlobalExceptionHandler, custom exceptions
  util/           # JwtUtil, helpers
```

## Quy tắc code
- Dùng `@Validated` + Bean Validation trên DTO
- Luôn trả về `ResponseEntity<ApiResponse<T>>` nhất quán
- Không để logic trong Controller
- Entity không được lộ ra ngoài API (luôn map sang DTO)
- Dùng Lombok: `@Data`, `@Builder`, `@RequiredArgsConstructor`
- Tên branch: `feat/<feature>`, `fix/<bug>`

## Supabase rules
- Kết nối DB qua JDBC URL từ Supabase dashboard (Settings → Database)
- JWT từ Supabase dùng `SUPABASE_JWT_SECRET` để verify
- Bật RLS trên tất cả các bảng user data
- Service Role Key chỉ dùng server-side, không bao giờ expose

## Dependencies (chỉ dùng khi thật sự cần)
```
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-security
spring-boot-starter-validation
postgresql (JDBC driver)
lombok
jjwt-api / jjwt-impl / jjwt-jackson
```

## Lệnh chạy
```bash
./gradlew bootRun                    # Run dev
./gradlew test                       # Run tests
./gradlew bootJar                    # Build JAR
java -jar build/libs/<app>.jar       # Run JAR
```

## File naming
- SPEC.md       → Đặc tả toàn project + User Stories
- SPEC_<feat>.md → Đặc tả chi tiết từng tính năng lớn
- README.md     → Setup guide
- CLAUDE.md     → Rules (file này)
