# Mini Wallet ERD

Tai lieu nay chi tap trung vao model va quan he du lieu cua app hien tai.
Sequence runtime nam trong [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md).

## 1. ERD Tong Quan

```mermaid
erDiagram
    Customer {
        string id
        string phone
        string pinHash
        string status
    }

    Officer {
        string id
        string phone
        string name
        string pinHash
        string status
    }

    Pocket {
        string id
        string client
        string customer
        string currency
        number balance
        number availableBalance
        number holdBalance
        number settledBalance
        string checksum
        string status
    }

    PocketEntry {
        string id
        string transRefId
        number stepOrder
        string debitPocket
        string creditPocket
        number amount
        number debitAmount
        number creditAmount
        string balanceLayer
        string currency
        string status
    }

    TransactionTrail {
        string id
        string service
        string type
        string status
        string sender
        string receiver
        string biller
        json inputMessage
        json outputMessage
        json transStepLog
    }

    Transaction {
        string id
        string code
        string transRefId
        string service
        string type
        string sender
        string receiver
        string biller
        number amount
        number fee
        number totalAmount
        string currency
        string status
        json metadata
    }

    Service {
        string id
        string code
        string name
        number version
        string type
        string authMethod
        string status
        json metadata
    }

    TransField {
        string id
        string service
        number order
        string name
        string rule
        string source
        string dataType
        string variable
        boolean required
        string regex
        string status
    }

    Fee {
        string id
        string service
        string feeType
        number amount
        string currency
        string status
    }

    TransValidation {
        string id
        string service
        number ruleOrder
        string stage
        string ruleFunction
        string input
        string errorCode
        string errorMessage
        string status
    }

    TransDefinition {
        string id
        string service
        number stepOrder
        string stage
        string debitSource
        string creditSource
        string amountSource
        string status
    }

    Biller {
        string id
        string code
        string name
        string inquiryUrl
        string paymentUrl
        string pocket
        string status
    }

    MockInvoice {
        string id
        string biller
        string billCode
        string customerName
        number amount
        string currency
        string status
        string paidTransRefId
    }

    Customer ||--o{ Pocket : owns
    Customer ||--o{ TransactionTrail : sender
    Customer ||--o{ TransactionTrail : receiver
    Customer ||--o{ Transaction : sender
    Customer ||--o{ Transaction : receiver

    Pocket ||--o{ PocketEntry : debitPocket
    Pocket ||--o{ PocketEntry : creditPocket

    TransactionTrail ||--o| Transaction : produces

    Service ||--o{ TransField : has
    Service ||--o{ Fee : has
    Service ||--o{ TransValidation : has
    Service ||--o{ TransDefinition : has
    Service ||--o{ TransactionTrail : runs_by_code

    Biller ||--|| Pocket : owns
    Biller ||--o{ MockInvoice : issues
    Biller ||--o{ TransactionTrail : used_by_bill
    Biller ||--o{ Transaction : receives
```

## 2. Nhom Identity

| Model | Vai tro | File |
|---|---|---|
| `Customer` | User cuoi, login bang phone + PIN, so huu customer pocket | `api/models/Customer.js` |
| `Officer` | Operator/backoffice, dung Cash-in va Config | `api/models/Officer.js` |

## 3. Nhom Wallet/Ledger

| Model | Vai tro | File |
|---|---|---|
| `Pocket` | Vi tien cua customer/biller/system/bank, co snapshot `availableBalance`, `holdBalance`, `settledBalance`, `checksum` va `status` | `api/models/Pocket.js` |
| `PocketEntry` | Dong ghi so double-entry cho tung buoc debit/credit, co debit amount va credit amount rieng | `api/models/PocketEntry.js` |
| `TransactionTrail` | Runtime record cua request/confirm/verify | `api/models/TransactionTrail.js` |
| `Transaction` | Receipt chinh thuc sau khi ledger done | `api/models/Transaction.js` |

## 4. Nhom Config-Driven

| Model | Vai tro | File |
|---|---|---|
| `Service` | Khai bao service code, type, auth method, actor role | `api/models/Service.js` |
| `TransField` | Field builder va validation shape cho `TRANSBODY` | `api/models/TransField.js` |
| `Fee` | Phi cua service | `api/models/Fee.js` |
| `TransValidation` | Rule nghiep vu theo stage | `api/models/TransValidation.js` |
| `TransDefinition` | `glSteps`: source debit/credit/amount | `api/models/TransDefinition.js` |
| `Biller` | Mock external biller co `inquiryUrl`, `paymentUrl`, pocket | `api/models/Biller.js` |
| `MockInvoice` | Hoa don demo cho biller EVN | `api/models/MockInvoice.js` |

## 5. Collection Name Note

Mot so model config da doi ten de dung thuat ngu design, nhung van giu
`tableName` cu:

| Model moi | Collection cu |
|---|---|
| `Service` | `serviceconfig` |
| `TransField` | `transactionfield` |
| `TransValidation` | `transactionvalidation` |
| `TransDefinition` | `transactiondefinition` |

Ly do: de rename code cho de doc ma khong phai drop/import lai Mongo data.
