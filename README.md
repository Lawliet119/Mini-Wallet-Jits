# Mini Wallet JITS

Mini Wallet là ứng dụng ví điện tử demo cho bài Week 2. Dự án mô phỏng các luồng ví cơ bản như đăng nhập, đăng ký khách hàng, xem số dư, chuyển tiền P2P, nạp tiền qua operator, thanh toán hóa đơn mock biller và xem lịch sử giao dịch.

Backend được xây bằng Sails.js, dùng MongoDB làm datastore. Frontend có 2 giao diện:

- Giao diện Sails/EJS được phục vụ trực tiếp tại `http://localhost:1337`.
- Giao diện React/Vite nằm trong thư mục `frontend/`, chạy tại `http://127.0.0.1:5173` và proxy API về backend.

## Tính Năng Chính

- Đăng nhập chung bằng `phone + PIN`, backend tự xác định role `customer` hoặc `officer`.
- JWT access token và refresh token qua cookie `httpOnly`.
- Customer có thể xem số dư, chuyển tiền P2P, thanh toán hóa đơn và xem lịch sử.
- Officer có thể thực hiện cash-in và xem cấu hình service.
- Engine giao dịch config-driven: service, field, validation, fee và ledger step nằm trong DB.
- Ví có checksum để phát hiện sửa số dư ngoài engine.
- Ledger ghi `Transaction` và `PocketEntry` trong Mongo transaction.
- Seed sẵn tài khoản demo, biller demo và cấu hình service.

## Công Nghệ

- Node.js `^24.11`
- Sails.js `^1.5`
- MongoDB với replica set
- React `^19` + Vite `^7`
- JWT, bcryptjs

## Cấu Trúc Chính

```text
api/
  controllers/        API controllers
  models/             Sails models
  services/           Business logic, token, PIN, ledger, transaction engine
assets/               CSS/JS cho giao diện Sails/EJS
config/               Cấu hình Sails, routes, policies, datastore
docs/                 ERD, sequence diagram, mô tả thiết kế
frontend/             React/Vite frontend
views/                Layout và trang EJS
```

Tài liệu thiết kế chi tiết:

- [docs/week2-design.md](docs/week2-design.md)
- [docs/ERD.md](docs/ERD.md)
- [docs/SEQUENCE_DIAGRAMS.md](docs/SEQUENCE_DIAGRAMS.md)

## Yêu Cầu Trước Khi Chạy

1. Cài Node.js đúng major theo `package.json`.
2. Cài MongoDB và bật replica set.
3. Cài dependency cho backend và frontend.

MongoDB cần replica set vì backend dùng native Mongo transaction khi ghi ledger. URL mặc định:

```text
mongodb://localhost:27017/Mini_Wallet?replicaSet=rs0
```

Ví dụ khởi tạo replica set local:

```bash
mongod --dbpath ./data/db --replSet rs0
mongosh
rs.initiate()
```

Nếu dùng MongoDB khác, set biến môi trường `MONGO_URL`.

## Cài Đặt

Tại thư mục root:

```bash
npm install
npm --prefix frontend install
```

## Biến Môi Trường

Khi chạy development, dự án có fallback secret để tiện demo. Khi chạy production bằng `npm start`, các biến secret sau là bắt buộc:

| Biến | Mục đích |
|---|---|
| `MONGO_URL` | MongoDB connection URL |
| `JWT_SECRET` | Secret ký JWT |
| `CHECKSUM_SECRET` | Secret ký checksum ví |
| `SESSION_SECRET` | Secret session/cookie của Sails |
| `DATA_ENCRYPTION_KEY` | Data encryption key của Sails |
| `JWT_EXPIRES_IN` | Thời hạn access token, mặc định dev là `2h` |
| `BOOTSTRAP_SEED` | Set `false` nếu không muốn seed data |

Các biến seed demo có thể override:

| Biến | Mặc định |
|---|---|
| `SEED_OFFICER_PHONE` | `0900000000` |
| `SEED_OFFICER_PIN` | `123456` |
| `SEED_CUSTOMER_PHONE` | `0703900625` |
| `SEED_RECEIVER_PHONE` | `0334760905` |
| `SEED_CUSTOMER_PIN` | `123456` |
| `SEED_CUSTOMER_BALANCE` | `500000` |
| `SEED_BANK_BALANCE` | `1000000000` |
| `SEED_CURRENCY` | `VND` |

## Chạy Backend

Chạy development:

```bash
node app.js
```

Backend mặc định chạy tại:

```text
http://localhost:1337
```

Giao diện Sails/EJS có thể mở trực tiếp:

```text
http://localhost:1337
```

Chạy production:

```bash
npm start
```

Trước khi chạy production, cần set đầy đủ `JWT_SECRET`, `CHECKSUM_SECRET`, `SESSION_SECRET` và `DATA_ENCRYPTION_KEY`.

## Chạy Frontend React/Vite

Mở terminal khác, chạy:

```bash
npm run frontend:dev
```

Frontend chạy tại:

```text
http://127.0.0.1:5173
```

Vite đã proxy các request `/api` về backend `http://127.0.0.1:1337`, nên cần bật backend trước.

Build frontend:

```bash
npm run frontend:build
```

## Tài Khoản Demo

| Role | Phone | PIN | Ghi chú |
|---|---|---|---|
| Customer sender | `0703900625` | `123456` | Có ví VND seed sẵn |
| Customer receiver | `0334760905` | `123456` | Dùng để test P2P |
| Officer | `0900000000` | `123456` | Dùng Cash-in và Config |

Biller demo:

| Biller | Bill code | Amount | Currency |
|---|---|---:|---|
| `EVN` | `EVN001` | `50000` | `VND` |

## Một Số API Chính

| Method | Path | Role | Mục đích |
|---|---|---|---|
| `POST` | `/api/v1/access/login` | Public | Login chung customer/officer |
| `POST` | `/api/v1/customers/register` | Public | Đăng ký customer wallet |
| `POST` | `/api/v1/access/refresh` | Cookie | Cấp lại access token |
| `POST` | `/api/v1/access/logout` | Cookie | Xóa refresh cookie |
| `GET` | `/api/v1/wallet/balance` | Customer | Xem số dư ví |
| `GET` | `/api/v1/billers` | Customer | Danh sách biller active |
| `GET` | `/api/v1/transactions/history` | Customer | Lịch sử giao dịch |
| `POST` | `/api/v1/transactions/request` | Bearer | Tạo preview/pending trail |
| `POST` | `/api/v1/transactions/confirm` | Bearer | Xác nhận preview |
| `POST` | `/api/v1/transactions/verify` | Bearer | Xác thực và ghi ledger |
| `GET` | `/api/v1/config/services` | Officer | Xem service config |

## Kiểm Tra

Chạy lint/test backend:

```bash
npm test
```

Kiểm tra audit backend:

```bash
npm audit --omit=dev
```

Kiểm tra audit frontend:

```bash
npm --prefix frontend audit --omit=dev
```

Build frontend:

```bash
npm --prefix frontend run build
```

Lưu ý: hiện `custom-tests` trong backend vẫn là placeholder, chưa có unit/integration test thật cho các flow giao dịch.

## Ghi Chú Vận Hành

- Không dùng Sails blueprint routes tự động; tất cả API chính được khai báo trong `config/routes.js`.
- Không dùng Grunt asset pipeline. CSS/JS của giao diện Sails/EJS được phục vụ qua `AssetController`.
- Production cần secret thật qua biến môi trường; không dùng fallback dev.
- Nếu Mongo không chạy replica set, các giao dịch ledger có thể lỗi vì Mongo transaction không hoạt động.
