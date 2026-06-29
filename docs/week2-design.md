# Mini Wallet Week 2 Design

Tai lieu nay mo ta thiet ke hien tai cua project Mini Wallet theo huong
config-driven. Chi tiet ERD va sequence duoc tach rieng de de review:

- [ERD](./ERD.md)
- [Sequence diagrams](./SEQUENCE_DIAGRAMS.md)

## 1. Muc Tieu Thiet Ke

Mini Wallet tach WHAT khoi HOW:

- WHAT: cau hinh nghiep vu nam trong DB: `Service`, `TransField`, `Fee`,
  `TransValidation`, `TransDefinition`, `Biller`.
- HOW: engine tong quat `transactionEngineService` doc config va chay chung
  `request -> confirm -> verify`.
- Khong viet rieng `chuyenTien()`, `napTien()`, `traHoaDon()` theo tung
  nghiep vu. Frontend chi gui `serviceCode` va tham so can thiet.

## 2. Tai Khoan Demo

| Role | Phone | PIN | Ghi chu |
|---|---|---|---|
| Customer sender | `0703900625` | `123456` | Co vi VND seed san |
| Customer receiver | `0334760905` | `123456` | Dung de test P2P |
| Cash-in operator | `0900000000` | `123456` | Sau login vao Cash-in/Config |

Du lieu biller demo:

| Biller | Bill code | Amount | Currency |
|---|---|---:|---|
| `EVN` | `EVN001` | `50000` | `VND` |

## 3. App Hien Tai

Frontend:

- React/Vite tai `frontend/`.
- Man login chi co mot form `phone + PIN`.
- `Register` public chi tao customer wallet.
- Sau login backend tra `role`, frontend moi biet user la customer hay operator.
- Customer thay `Payments` va `Activity`.
- Operator thay `Cash-in` va `Config`.

Backend:

- Sails API, MongoDB.
- JWT access token + refresh token cookie.
- Pocket checksum de phat hien sua so du ngoai engine.
- Pocket lock khi verify de giam race condition.
- Pocket balance duoc tach thanh `availableBalance`, `holdBalance`,
  `settledBalance`; field `balance` duoc giu lam alias tuong thich cho UI/API cu.
- Ledger tao `Transaction` va `PocketEntry` double-entry trong mot Mongo
  transaction.

## 4. API Chinh

| Method | Path | Role | Muc dich |
|---|---|---|---|
| `POST` | `/api/v1/access/login` | public | Login chung customer/officer |
| `POST` | `/api/v1/customers/register` | public | Dang ky customer wallet |
| `POST` | `/api/v1/access/refresh` | cookie | Cap lai access token |
| `POST` | `/api/v1/access/logout` | cookie | Xoa refresh cookie |
| `GET` | `/api/v1/wallet/balance` | customer | Xem so du vi |
| `GET` | `/api/v1/billers` | customer | Lay biller active |
| `GET` | `/api/v1/config/services` | officer | Xem danh sach service config |
| `GET` | `/api/v1/config/services/:code` | officer | Xem fields/fees/validations/glSteps |
| `GET` | `/api/v1/transactions/history` | customer | Lich su giao dich |
| `POST` | `/api/v1/transactions/request` | bearer | Tao preview/pending trail |
| `POST` | `/api/v1/transactions/confirm` | bearer | Chuan bi xac thuc |
| `POST` | `/api/v1/transactions/verify` | bearer | Xac thuc va chay tien |

## 5. Service Config Da Seed

| Service code | Actor | Auth | Fee | Luong tien |
|---|---|---|---:|---|
| `P2P_TRANSFER` | customer | `PIN` | `0` | Customer sender -> Customer receiver |
| `BANK_TOPUP` | customer | `PIN` | `0` | Bank pocket -> Customer wallet |
| `CASH_IN` | officer | `NONE` | `0` | Bank pocket -> Customer wallet |
| `BILL_PAYMENT` | customer | `PIN` | `1000` | Customer -> Biller, Customer -> System fee |

Phan biet `BANK_TOPUP` va `CASH_IN`:

- `BANK_TOPUP`: user tu bam nap tu bank lien ket vao vi, giong nut nap tien
  trong app vi dien tu.
- `CASH_IN`: operator/backoffice xac nhan tien ben ngoai roi nap ho vao vi khach.

## 6. Mapping File Theo Khoi Thiet Ke

| Khoi trong design | File/model hien tai | Ghi chu |
|---|---|---|
| `Service` | `api/models/Service.js` | Khai bao service, auth, metadata |
| `Service.fieldBuilder` | `api/models/TransField.js` | Cac field build vao `TRANSBODY` |
| `TransField` | `api/models/TransField.js` | Validate shape/format field |
| `Fee` | `api/models/Fee.js` | Phi theo service |
| `TransValidation` | `api/models/TransValidation.js` | Rule nghiep vu theo stage |
| `TransDefinition (glSteps)` | `api/models/TransDefinition.js` | Debit/credit pocket source |
| `Biller.inquiryUrl` | `api/models/Biller.js` | Mock inquiry qua `mockBillerService` |
| `Biller.paymentUrl` | `api/models/Biller.js` | Mock payment qua `mockBillerService` |
| Runtime trail | `api/models/TransactionTrail.js` | Log request/confirm/verify |
| Final receipt | `api/models/Transaction.js` | Giao dich da ghi so |
| Ledger entry | `api/models/PocketEntry.js` | Dong but toan double-entry, co debit/credit amount va balance layer |

Luu y: mot so model config co `tableName` cu de giu collection Mongo hien co khi
doi ten file/model cho dung thuat ngu design.

## 7. Runtime Chung

```text
requestTransaction -> confirmTransaction -> verifyTransaction
```

| Step | Lam gi | Tien chay? |
|---|---|---|
| Request | Load service config, build `TRANSBODY`, tinh fee, chay validation request, tao `TransactionTrail` pending | Chua |
| Confirm | Doc `authMethod`, append step log confirm | Chua |
| Verify | Kiem PIN neu can, chay validation verify/external, lock pocket, doc `glSteps`, ghi ledger | Co |

## 8. Checklist Review

- [x] Login public khong lo role truoc khi dang nhap.
- [x] Register tao customer wallet.
- [x] Customer co P2P, Bank top-up, Bill payment, Activity.
- [x] Operator co Cash-in Desk va Config.
- [x] Config-driven engine doc `Service`, `TransField`, `Fee`,
  `TransValidation`, `TransDefinition`.
- [x] `BILL_PAYMENT` request co inquiry mock biller.
- [x] `BILL_PAYMENT` verify goi mock payment truoc khi ghi ledger noi bo; neu
  biller fail thi khong tru tien vi trong implementation hien tai.
- [x] Verify la noi duy nhat lam thay doi so du.
- [x] Ledger ghi `Transaction` va `PocketEntry` double-entry.
- [x] Pocket co balance snapshot `available/hold/settled`.
