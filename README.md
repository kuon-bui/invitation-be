# E-Invitation Platform Backend (SaaS Thiệp Mời Điện Tử)

Hệ thống backend độc lập xây dựng bằng NestJS phục vụ cho nền tảng thiệp cưới và thiệp sự kiện điện tử đa năng (Cưới hỏi, Họp lớp, Sinh nhật, Kỷ niệm, Khai trương).

---

## 1. Công nghệ sử dụng (Tech Stack)

- **Framework**: NestJS 11+ (TypeScript)
- **Database**: PostgreSQL 16+
- **ORM**: Prisma ORM
- **Authentication**: Passport.js + JWT (Bearer token stateless)
- **Storage**: AWS S3 / Cloudflare R2 Presigned URLs
- **Payment Gateway**: SePay VietQR Webhook (kích hoạt tự động)
- **Notifications**: NestJS EventEmitter2 + Telegram Bot API
- **Caching**: `@nestjs/cache-manager`
- **Excel I/O**: `exceljs` (Import danh sách khách & Export RSVP)
- **Containerization**: Docker (Multi-stage build) & Docker Compose

---

## 2. Yêu cầu hệ thống (Prerequisites)

- Node.js >= 20.x
- pnpm >= 9.x
- Docker & Docker Compose (cho môi trường container hóa)
- PostgreSQL 16+ (nếu chạy local không qua Docker)

---

## 3. Cài đặt & Khởi động nhanh (Quick Start)

### 3.1 Cài đặt dependencies

```bash
cd C:\Users\kuon\code\invitation-backend
pnpm install
```

### 3.2 Cấu hình môi trường

Sao chép file `.env.example` thành `.env` và cập nhật thông tin tương ứng:

```bash
cp .env.example .env
```

Các biến môi trường chính:

| Biến | Ý nghĩa | Mặc định mẫu |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgresql://postgres:postgres@localhost:5432/invitation_db?schema=public` |
| `PORT` | Cổng HTTP server | `3001` |
| `JWT_SECRET` | Secret key ký JWT token | `super-secret-jwt-key` |
| `JWT_EXPIRES_IN` | Thời gian sống JWT | `7d` |
| `S3_ENDPOINT` | Endpoint S3 hoặc Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | Access Key S3 / R2 | `your-access-key` |
| `S3_SECRET_ACCESS_KEY` | Secret Key S3 / R2 | `your-secret-key` |
| `S3_BUCKET_NAME` | Tên S3 bucket | `invitation-assets` |
| `S3_PUBLIC_DOMAIN` | Tên miền CDN công khai ảnh | `https://assets.invitation.com` |
| `SEPAY_ACC` | Số tài khoản nhận tiền VietQR | `0123456789` |
| `SEPAY_BANK` | Mã ngân hàng VietQR | `MBBank` |
| `SEPAY_WEBHOOK_API_KEY` | API Key xác thực Webhook SePay | `your-sepay-secure-webhook-api-key` |
| `TELEGRAM_BOT_TOKEN` | Token Bot Telegram thông báo | `your-telegram-bot-token` |

### 3.3 Database Migration & Seed dữ liệu mẫu

Sinh Prisma Client:
```bash
pnpm run prisma:generate
```

Chạy migration tạo bảng trong database:
```bash
pnpm run prisma:migrate
```

Seed dữ liệu các mẫu thiệp mặc định:
```bash
pnpm run prisma:seed
```

### 3.4 Chạy ứng dụng

**Chế độ phát triển (Development):**
```bash
pnpm run start:dev
```

**Build và chạy môi trường production:**
```bash
pnpm run build
pnpm run start:prod
```

Server sẽ lắng nghe tại: `http://localhost:3001`

---

## 4. Kiểm thử (Testing)

### 4.1 Unit Tests

Chạy toàn bộ 24 test suites của các module (Auth, Users, Templates, Invitations, Guests, RSVP, Wishes, Payments, Media, Notifications):

```bash
pnpm test
```

Xem báo cáo độ phủ mã (code coverage):
```bash
pnpm run test:cov
```

### 4.2 E2E Integration Suite (9-Step User Journey)

Kịch bản E2E kiểm thử toàn vẹn quy trình người dùng từ đăng ký tài khoản đến khi thanh toán kích hoạt thiệp:

```bash
pnpm run test:e2e
```

**9 bước trong kịch bản kiểm thử E2E (`test/app.e2e-spec.ts`):**
1. `POST /api/v1/auth/register`: Đăng ký tài khoản cặp đôi -> Nhận `accessToken` & thông tin người dùng.
2. `GET /api/v1/templates`: Khám phá kho mẫu thiệp cưới public -> Chọn mẫu `duyen-dang-01`.
3. `POST /api/v1/my-invitations`: Tạo thiệp cưới -> Nhận thiệp với `slug = "quan-dung"`, trạng thái ban đầu `TRIAL`.
4. `POST /api/v1/my-invitations/:id/guests`: Thêm khách mời "Anh Tuấn" -> Tự động sinh mã định danh cá nhân `code = "TUAN12"`.
5. `GET /api/v1/invitations/slug/:slug/guest/:code`: Khách mở thiệp cá nhân hóa qua URL -> Ghi nhận `hasViewed = true`.
6. `POST /api/v1/invitations/:id/rsvp`: Khách phản hồi xác nhận tham dự (RSVP), chọn khẩu vị ăn chay và số người đi kèm.
7. `POST /api/v1/invitations/:id/wishes`: Khách gửi lời chúc lên sổ lưu bút thiệp cưới.
8. `POST /api/v1/payments/create-invoice`: Cặp đôi tạo hóa đơn nâng cấp gói thiệp -> Sinh mã giao dịch `transactionCode = "MDXYZ"` kèm VietQR URL.
9. `POST /api/v1/payments/webhook/sepay`: Giả lập Webhook SePay ngân hàng chuyển khoản thành công -> Thiệp chuyển trạng thái `ACTIVE`.

---

## 5. Triển khai Docker & Docker Compose

### 5.1 Cấu trúc Dockerfile (Multi-stage)

- **Stage 1 (base)**: `node:20-alpine`, kích hoạt pnpm bằng corepack, cài đặt `openssl` và `libc6-compat`.
- **Stage 2 (deps)**: Cài đặt dependencies với `pnpm install --frozen-lockfile` và sinh Prisma client.
- **Stage 3 (builder)**: Compile TypeScript sang JavaScript với `pnpm build`, tỉa bỏ devDependencies qua `pnpm prune --prod`.
- **Stage 4 (runner)**: Image chạy Alpine tối giản, chạy dưới tài khoản non-root `nestjs:nestjs` (UID 1001), mở cổng `3001`.

### 5.2 Khởi chạy với Docker Compose

Khởi chạy cả PostgreSQL 16 và NestJS backend container:

```bash
docker compose up -d --build
```

Kiểm tra trạng thái container và healthcheck:
```bash
docker compose ps
```

Xem log hệ thống:
```bash
docker compose logs -f backend
```

Dừng dịch vụ:
```bash
docker compose down
```

---

## 6. Danh mục API chính (API Endpoints Overview)

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Đăng ký tài khoản
- `POST /api/v1/auth/login`: Đăng nhập lấy access token
- `GET /api/v1/auth/me`: Thông tin người dùng hiện tại (yêu cầu JWT)

### Templates (`/api/v1/templates`)
- `GET /api/v1/templates`: Danh sách mẫu thiệp công khai (hỗ trợ lọc `eventType`)
- `GET /api/v1/templates/:id`: Chi tiết mẫu thiệp và cấu hình JSON schema
- `POST /api/v1/admin/templates`: Quản trị viên thêm mẫu thiệp mới (Role ADMIN)

### Quản lý thiệp cá nhân (`/api/v1/my-invitations`)
- `GET /api/v1/my-invitations`: Danh sách thiệp của tôi
- `POST /api/v1/my-invitations`: Tạo thiệp mới
- `GET /api/v1/my-invitations/:id`: Chi tiết thiệp
- `PUT /api/v1/my-invitations/:id`: Cập nhật cấu hình thiệp
- `DELETE /api/v1/my-invitations/:id`: Xóa thiệp

### Khách mời & Cá nhân hóa (`/api/v1/my-invitations/:id/guests`)
- `GET /api/v1/my-invitations/:id/guests`: Danh sách khách mời
- `POST /api/v1/my-invitations/:id/guests`: Thêm khách mời
- `POST /api/v1/my-invitations/:id/guests/import`: Import danh sách khách từ file Excel (.xlsx)
- `GET /api/v1/my-invitations/:id/guests/export`: Export danh sách khách & trạng thái RSVP ra Excel
- `DELETE /api/v1/my-invitations/:id/guests/:guestId`: Xóa khách mời

### Trang xem thiệp công khai (`/api/v1/invitations`)
- `GET /api/v1/invitations/slug/:slug`: Xem thiệp chung qua slug
- `GET /api/v1/invitations/slug/:slug/guest/:code`: Xem thiệp cá nhân hóa kèm mã khách

### Phản hồi RSVP & Sổ lưu bút
- `POST /api/v1/invitations/:id/rsvp`: Khách gửi xác nhận tham dự
- `GET /api/v1/my-invitations/:id/rsvp`: Thống kê RSVP theo họ nhà, khẩu vị
- `POST /api/v1/invitations/:id/wishes`: Gửi lời chúc mới
- `GET /api/v1/invitations/:id/wishes`: Danh sách lời chúc đã duyệt

### Thanh toán VietQR & Webhook (`/api/v1/payments`)
- `POST /api/v1/payments/create-invoice`: Tạo hóa đơn kích hoạt thiệp
- `POST /api/v1/payments/webhook/sepay`: Nhận webhook thanh toán từ SePay
- `GET /api/v1/payments/check-status/:transactionCode`: Kiểm tra trạng thái đơn hàng

### Quản lý Media (`/api/v1/media`)
- `POST /api/v1/media/presigned-url`: Tạo presigned URL tải ảnh/nhạc trực tiếp lên S3/R2
