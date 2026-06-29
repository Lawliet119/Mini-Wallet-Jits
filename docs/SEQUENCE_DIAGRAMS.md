# Mini Wallet Sequence Diagrams

Tai lieu nay mo ta runtime hien tai cua app. ERD nam trong [ERD.md](./ERD.md).

## 1. Login Va Register

Man login public khong chia truoc customer/officer. Backend tu check customer
truoc, sau do check officer. Sau login frontend moi biet role.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React Auth Screen
    participant Access as AccessController
    participant Customer
    participant Officer
    participant Token as tokenService

    User->>UI: Nhap phone + PIN
    UI->>Access: POST /api/v1/access/login
    Access->>Customer: findOne(phone)
    alt customer dung PIN
        Access->>Token: issue access + refresh
        Access-->>UI: role=customer, accessToken
        UI-->>User: Mo Payments/Activity
    else khong phai customer
        Access->>Officer: findOne(phone)
        alt officer dung PIN
            Access->>Token: issue access + refresh
            Access-->>UI: role=officer, accessToken
            UI-->>User: Mo Cash-in/Config
        else sai credential
            Access-->>UI: INVALID_CREDENTIALS
        end
    end

    User->>UI: Bam Register
    UI->>Access: POST /api/v1/customers/register
    Access->>Customer: create customer + hash PIN
    Access->>Access: create customer pocket
    Access-->>UI: role customer session
```

## 2. Runtime Config-Driven Chung

Tat ca service chay qua bo API chung:

- `POST /api/v1/transactions/request`
- `POST /api/v1/transactions/confirm`
- `POST /api/v1/transactions/verify`

```mermaid
sequenceDiagram
    autonumber
    actor Actor as Customer/Officer
    participant UI as React Dashboard
    participant API as TransactionController
    participant Engine as transactionEngineService
    participant Service
    participant Field as TransField
    participant Fee
    participant Validation as TransValidation
    participant Trail as TransactionTrail
    participant Definition as TransDefinition
    participant Ledger as ledgerService
    participant Entry as PocketEntry
    participant Tx as Transaction

    Actor->>UI: Submit service form
    UI->>API: request(serviceCode, parameters)
    API->>Engine: request(actor, parameters)
    Engine->>Service: load active Service
    Engine->>Field: load active fields
    Engine->>Fee: load active fee
    Engine->>Validation: run request validations
    Engine->>Trail: create pending trail with TRANSBODY
    Engine-->>UI: preview(transRefId, amount, fee, totalAmount)

    Actor->>UI: Confirm preview
    UI->>API: confirm(transRefId)
    API->>Engine: confirm(actor, transRefId)
    Engine->>Trail: append CONFIRM_DONE
    Engine-->>UI: authMethod

    Actor->>UI: Verify (PIN neu authMethod=PIN)
    UI->>API: verify(transRefId, pin?)
    API->>Engine: verify(actor, transRefId, pin)
    Engine->>Trail: find pending trail
    Engine->>Validation: run verify validations
    Engine->>Definition: load glSteps
    Engine->>Ledger: execute steps in DB transaction
    Ledger->>Entry: create PocketEntry rows
    Ledger->>Tx: create final Transaction
    Ledger->>Trail: mark done
    Engine-->>UI: receipt
```

## 3. P2P Transfer

Service: `P2P_TRANSFER`

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant UI as Payments UI
    participant API as TransactionController
    participant Engine as transactionEngineService
    participant Trail as TransactionTrail
    participant Ledger as ledgerService

    C->>UI: Nhap receiverPhone, amount, message
    UI->>API: request(serviceCode=P2P_TRANSFER)
    API->>Engine: request()
    Engine->>Engine: build SENDERID, SENDERPOCKETID, RECEIVERID, RECEIVERPOCKETID, AMOUNT
    Engine->>Engine: validate receiver exists, receiver != sender, amount > 0, sender available balance
    Engine->>Trail: create pending
    Engine-->>UI: preview

    C->>UI: Confirm
    UI->>API: confirm(transRefId)
    API->>Engine: confirm()
    Engine-->>UI: authMethod=PIN

    C->>UI: Nhap PIN va Verify
    UI->>API: verify(transRefId, pin)
    API->>Engine: verify()
    Engine->>Engine: validate PIN
    Engine->>Ledger: debit sender, credit receiver
    Ledger-->>UI: transaction done
```

## 4. Bank Top-Up

Service: `BANK_TOPUP`

Day la luong user tu nap tien tu bank lien ket vao vi. Khac voi `CASH_IN`
la operator nap ho/ghi nhan tien ngoai he thong.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant UI as Payments UI
    participant API as TransactionController
    participant Engine as transactionEngineService
    participant Trail as TransactionTrail
    participant Ledger as ledgerService

    C->>UI: Nhap amount o Top Up From Bank
    UI->>API: request(serviceCode=BANK_TOPUP, amount)
    API->>Engine: request()
    Engine->>Engine: build SENDERID, SENDERPOCKETID, BANKPOCKETID, AMOUNT
    Engine->>Engine: validate amount > 0, bank available balance
    Engine->>Trail: create pending
    Engine-->>UI: preview

    C->>UI: Confirm
    UI->>API: confirm(transRefId)
    API->>Engine: confirm()
    Engine-->>UI: authMethod=PIN

    C->>UI: Nhap PIN va Top up
    UI->>API: verify(transRefId, pin)
    API->>Engine: verify()
    Engine->>Engine: validate PIN
    Engine->>Ledger: debit bank pocket, credit customer pocket
    Ledger-->>UI: top-up done
```

## 5. Officer Cash-In

Service: `CASH_IN`

Luon operator/backoffice trigger. Auth method la `NONE`.

```mermaid
sequenceDiagram
    autonumber
    actor O as Officer
    participant UI as Cash-in Desk
    participant API as TransactionController
    participant Engine as transactionEngineService
    participant Trail as TransactionTrail
    participant Ledger as ledgerService

    O->>UI: Nhap customerPhone, amount
    UI->>API: request(serviceCode=CASH_IN, customerPhone, amount)
    API->>Engine: request(actor role=officer)
    Engine->>Engine: build OFFICERID, RECEIVERID, RECEIVERPOCKETID, BANKPOCKETID, AMOUNT
    Engine->>Engine: validate officer active, receiver exists, amount > 0
    Engine->>Trail: create pending
    Engine-->>UI: preview authMethod=NONE

    UI->>API: verify(transRefId)
    API->>Engine: verify()
    Engine->>Engine: no PIN required
    Engine->>Ledger: debit bank pocket, credit customer pocket
    Ledger-->>UI: cash-in done
```

## 6. Bill Payment

Service: `BILL_PAYMENT`

Current implementation goi mock biller payment trong stage `external_payment`
truoc khi ledger noi bo duoc ghi. Neu biller fail thi engine khong tao
`Transaction` va khong tru tien vi.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant UI as Payments UI
    participant API as TransactionController
    participant Engine as transactionEngineService
    participant Biller as mockBillerService
    participant Trail as TransactionTrail
    participant Ledger as ledgerService

    C->>UI: Chon biller EVN, nhap billCode
    UI->>API: request(serviceCode=BILL_PAYMENT, billerId, billCode)
    API->>Engine: request()
    Engine->>Biller: inquiry(billerId, billCode)
    Biller-->>Engine: invoice amount, currency, invoiceId
    Engine->>Engine: build AMOUNT tu invoice, fee tu Fee, TOTALAMOUNT
    Engine->>Engine: validate biller, invoice unpaid, sender available balance
    Engine->>Trail: create pending
    Engine-->>UI: preview invoice amount + fee

    C->>UI: Confirm
    UI->>API: confirm(transRefId)
    API->>Engine: confirm()
    Engine-->>UI: authMethod=PIN

    C->>UI: Nhap PIN va Pay
    UI->>API: verify(transRefId, pin)
    API->>Engine: verify()
    Engine->>Engine: validate PIN
    Engine->>Biller: payment(invoiceId, amount, transRefId)
    alt biller payment success
        Biller-->>Engine: billerRefId
        Engine->>Ledger: debit customer amount + fee
        Ledger->>Ledger: credit biller amount
        Ledger->>Ledger: credit system fee
        Ledger-->>UI: bill payment done
    else biller payment failed
        Biller-->>Engine: error
        Engine-->>UI: failed, no wallet movement
    end
```
