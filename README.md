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

- Node.js >= 22.x (pnpm 11 yêu cầu `node:sqlite`)
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
| `S3_FORCE_PATH_STYLE` | `true` cho MinIO / S3 tự host (URL dạng `endpoint/bucket/key`) | `false` |
| `S3_ACCESS_KEY_ID` | Access Key S3 / R2 | `your-access-key` |
| `S3_SECRET_ACCESS_KEY` | Secret Key S3 / R2 | `your-secret-key` |
| `S3_BUCKET_NAME` | Tên S3 bucket | `invitation-assets` |
| `S3_PUBLIC_DOMAIN` | Tên miền CDN công khai ảnh (MinIO path-style: kèm tên bucket) | `https://assets.invitation.com` |
| `SEPAY_ACC` | Số tài khoản nhận tiền VietQR | `0123456789` |
| `SEPAY_BANK` | Mã ngân hàng VietQR | `MBBank` |
| `SEPAY_WEBHOOK_API_KEY` | API Key xác thực Webhook SePay | `your-sepay-secure-webhook-api-key` |
| `TELEGRAM_BOT_TOKEN` | Token Bot Telegram thông báo | `your-telegram-bot-token` |

### 3.3 Database Migration

Sinh Prisma Client:
```bash
pnpm run prisma:generate
```

Chạy migration tạo bảng trong database:
```bash
pnpm run prisma:migrate
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

Chạy toàn bộ 23 test suites của các module (Auth, Users, Invitations, Guests, RSVP, Wishes, Payments, Media, Notifications):

```bash
pnpm test
```

Xem báo cáo độ phủ mã (code coverage):
```bash
pnpm run test:cov
```

### 4.2 E2E Integration Suite (10-Step User Journey)

Kịch bản E2E kiểm thử toàn vẹn quy trình người dùng từ đăng ký tài khoản đến khi thanh toán kích hoạt thiệp:

```bash
pnpm run test:e2e
```

**10 bước trong kịch bản kiểm thử E2E (`test/app.e2e-spec.ts`):**
1. `POST /api/v1/auth/register`: Đăng ký tài khoản cặp đôi -> Nhận `accessToken` & thông tin người dùng.
2. `POST /api/v1/my-invitations`: Tạo thiệp cưới -> Nhận thiệp với `slug = "quan-dung"`, trạng thái ban đầu `TRIAL`.
3. `POST /api/v1/my-invitations/:id/guests`: Thêm khách mời "Anh Tuấn" -> Tự động sinh mã định danh cá nhân `code = "TUAN12"`.
4. `GET /api/v1/invitations/slug/:slug/guest/:code`: Khách mở thiệp cá nhân hóa qua URL -> Ghi nhận `hasViewed = true`.
5. `POST /api/v1/invitations/:id/rsvp`: Khách phản hồi xác nhận tham dự (RSVP), chọn khẩu vị ăn chay và số người đi kèm.
6. `POST /api/v1/invitations/:id/wishes`: Khách gửi lời chúc lên sổ lưu bút thiệp cưới.
7. `POST /api/v1/payments/create-invoice`: Cặp đôi tạo hóa đơn nâng cấp gói thiệp -> Sinh mã giao dịch `transactionCode = "MDXYZ"` kèm VietQR URL.
8. `POST /api/v1/payments/webhook/sepay`: Giả lập Webhook SePay ngân hàng chuyển khoản thành công -> Thiệp chuyển trạng thái `ACTIVE`.
9. `GET /api/v1/payments/stream/:transactionCode`: Mở stream SSE sau khi đã thanh toán -> Nhận ngay `SUCCESS` rồi đóng.
10. `GET /api/v1/payments/stream/:transactionCode`: Mã giao dịch không tồn tại -> Trả về 404.

---

## 5. Triển khai Docker & Docker Compose

### 5.1 Cấu trúc Dockerfile (Multi-stage)

- **Stage 1 (base)**: `node:22-alpine`, kích hoạt pnpm `11.18.0` (khớp `packageManager` trong `package.json`) bằng corepack, cài đặt `openssl` và `libc6-compat`.
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

### 5.3 Phát hành phiên bản (release-please) & Docker Hub

Phiên bản được quản lý bằng [release-please](https://github.com/googleapis/release-please-action) dựa trên [Conventional Commits](https://www.conventionalcommits.org/). Repo dùng squash merge, nên **tiêu đề PR** phải đúng định dạng (`feat: ...`, `fix: ...`, `feat!: ...`).

1. Mỗi lần push lên `main`, workflow `Release` mở hoặc cập nhật một **Release PR**. PR này tăng `version` trong `package.json` và cập nhật `CHANGELOG.md`.
2. Merge Release PR, workflow sẽ tạo tag `vX.Y.Z` cùng GitHub Release.
3. Job `docker` **chỉ push image khi release-please vừa tạo release**. Image có tên `<DOCKERHUB_USERNAME>/invitation-backend` và chỉ có bản `linux/arm64` (VPS chạy arm64), được build trên runner `ubuntu-24.04-arm`.
4. Job `deploy` deploy ngay bản đó lên VPS (xem 5.4).

| Sự kiện | Docker | VPS |
|---|---|---|
| Merge Release PR (tạo release `vX.Y.Z`) | push `X.Y.Z`, `X.Y`, `latest` | deploy `X.Y.Z` |
| Push lên `main` thông thường | không build | không đổi |
| PR vào `main` | chỉ build để kiểm tra Dockerfile, không push | không đổi |

Đang ở giai đoạn `0.x`: `feat` tăng minor, `fix` tăng patch, breaking change cũng chỉ tăng minor. Muốn lên `1.0.0` thì thêm footer `Release-As: 1.0.0` vào commit.

Yêu cầu cấu hình repo (Settings):
- **Actions → General**: bật *Allow GitHub Actions to create and approve pull requests*.
- **Secrets and variables → Actions**: secret `DOCKERHUB_USERNAME` và secret `DOCKERHUB_TOKEN` (Docker Hub access token, quyền Read & Write).

### 5.4 Triển khai lên VPS (Ansible + Tailscale)

Workflow `Deploy` ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) cho runner của GitHub vào mạng Tailscale, rồi SSH tới VPS và chạy playbook [deploy/ansible/deploy.yml](deploy/ansible/deploy.yml). Workflow này chạy tự động sau mỗi release, hoặc chạy tay khi cần deploy lại hay rollback.

Trên VPS, Ansible quản lý thư mục `/opt/invitation-backend`. **Đừng sửa tay các file trong đó**, vì lần deploy sau sẽ ghi đè. Compose project `invitation` gồm:

| Service | Vai trò | Cổng trên host |
|---|---|---|
| `postgres` | Postgres 16, dữ liệu nằm trong volume `invitation_postgres_data` | không |
| `backend` | image `cuongbui1203/invitation-backend:X.Y.Z` | `0.0.0.0:3001` |

Truy cập công khai đi qua **Cloudflare Tunnel** do service riêng quản lý, không nằm trong repo này. Public hostname của tunnel trỏ tới `http://<VPS>:3001`. Đổi địa chỉ hoặc cổng bằng biến `backend_bind_address` và `backend_port` trong [group_vars/all/main.yml](deploy/ansible/group_vars/all/main.yml).

> ⚠️ Bind `0.0.0.0` nghĩa là cổng 3001 cũng mở trên IP công khai của VPS. Docker đi vòng qua `ufw`, nên phải chặn cổng này ở firewall của nhà cung cấp, nếu không người ngoài có thể gọi thẳng mà không qua Cloudflare.

Mỗi lần deploy, playbook làm lần lượt:
1. Ghi lại các file cấu hình.
2. Bật `postgres`.
3. Kéo image mới.
4. Chạy `prisma migrate deploy`.
5. Tạo lại container `backend` và đợi healthcheck xanh. Nếu không xanh, job fail và in 100 dòng log cuối của backend.

#### Chuẩn bị một lần

1. **Tailscale** (Admin console):
   - Thêm tag `tag:ci` và quyền SSH vào VPS trong policy file, ví dụ:
     ```json
     "tagOwners": { "tag:ci": ["autogroup:admin"] },
     "grants": [{ "src": ["tag:ci"], "dst": ["<IP Tailscale của VPS>"], "ip": ["tcp:22"] }]
     ```
   - Vào Settings → OAuth clients, tạo client với scope **Auth Keys (write)** và tag `tag:ci`.
2. **VPS** (cần có Docker, Compose v2, Tailscale và `python3`):
   ```bash
   sudo useradd -m -s /bin/bash -G docker deploy        # nếu chưa có user deploy
   sudo install -d -o deploy -g deploy -m 0750 /opt/invitation-backend
   ```
   - Trên máy cá nhân, tạo key: `ssh-keygen -t ed25519 -N '' -C github-actions-deploy -f deploy_key`.
   - Thêm `deploy_key.pub` vào `/home/deploy/.ssh/authorized_keys`.
   - Trỏ public hostname của Cloudflare Tunnel tới `http://<VPS>:3001`.
3. **Repo**:
   - [deploy/ansible/inventory.yml](deploy/ansible/inventory.yml): `ansible_host` là tên MagicDNS đầy đủ của VPS (`<tên-máy>.<tailnet>.ts.net`).
   - [deploy/ansible/group_vars/all/main.yml](deploy/ansible/group_vars/all/main.yml): `s3_endpoint`, `s3_public_domain`.
4. **Vault** (giá trị bí mật):
   - Sinh mật khẩu vault bằng `openssl rand -base64 48`, rồi lưu vào trình quản lý mật khẩu.
   - Tạo file mã hoá bằng lệnh dưới. Trên Windows không chạy Ansible trực tiếp được, nên dùng Docker. Editor trong container là `vi`.
     ```powershell
     docker run --rm -it -v "${PWD}/deploy/ansible:/work" -w /work python:3.13-alpine sh -c "pip install -q --root-user-action=ignore ansible-core==2.21.5 && ansible-vault create group_vars/all/vault.yml"
     ```
   - Dán các key trong [deploy/ansible/vault.example.yml](deploy/ansible/vault.example.yml) vào rồi điền giá trị thật. Mật khẩu Postgres nên dùng `openssl rand -hex 32`.
   - Sau này muốn sửa thì chạy lệnh tương tự, thay `create` bằng `edit`.

   > ⚠️ Repo này **public**. `vault.yml` luôn phải bắt đầu bằng `$ANSIBLE_VAULT;1.1;AES256`. Không bao giờ commit bản chưa mã hoá.
5. **GitHub secrets** (Settings → Secrets and variables → Actions):

   | Secret | Giá trị |
   |---|---|
   | `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` | OAuth client của Tailscale ở bước 1 |
   | `VPS_SSH_PRIVATE_KEY` | nội dung file `deploy_key` |
   | `VPS_SSH_KNOWN_HOSTS` | kết quả của `ssh-keyscan <tên MagicDNS>`, chạy từ một máy trong tailnet. Tên máy phải trùng với `ansible_host` |
   | `ANSIBLE_VAULT_PASSWORD` | mật khẩu vault |
   | `DOCKERHUB_USERNAME` | secret job `docker` đang dùng (mục 5.3). Workflow Deploy đưa nó vào Ansible qua biến môi trường cùng tên để ghép tên image |

#### Vận hành

- **Deploy lại hoặc rollback**: vào Actions → **Deploy** → Run workflow, rồi nhập version (ví dụ `0.1.0`). Version đó phải đã có trên Docker Hub.
- **Xem log**: `ssh deploy@<tên MagicDNS>`, rồi chạy `cd /opt/invitation-backend && docker compose logs -f backend`.

---

## 6. Danh mục API chính (API Endpoints Overview)

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Đăng ký tài khoản
- `POST /api/v1/auth/login`: Đăng nhập lấy access token
- `GET /api/v1/auth/me`: Thông tin người dùng hiện tại (yêu cầu JWT)

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
