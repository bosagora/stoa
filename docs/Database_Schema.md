
# The database schema of Stoa

## 1. Table **blocks**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| height            | INTEGER   | Y  | Y        |          | The height of the block |
| hash              | BLOB      |    | Y        |          | The hash of the current block |
| prev_block        | BLOB      |    | Y        |          | The hash of the previous block |
| validators        | TEXT      |    | Y        |          | Bitfield containing the validators' key indices which signed the block |
| merkle_root       | BLOB      |    | Y        |          | The hash of the merkle root of the transactions|
| signature         | BLOB      |    | Y        |          | Schnorr multisig of all validators which signed this block |
| tx_count          | INTEGER   |    | Y        |          | The number of transactions in the block|
| enrollment_count  | INTEGER   |    | Y        |          | The number of enrollments in the block|
| time_stamp        | INTEGER   |    | Y        |          | Block unix timestamp |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "blocks" (
    "height"                INTEGER NOT NULL,
    "hash"                  BLOB    NOT NULL,
    "prev_block"            BLOB    NOT NULL,
    "validators"            TEXT    NOT NULL,
    "merkle_root"           BLOB    NOT NULL,
    "signature"             BLOB    NOT NULL,
    "tx_count"              INTEGER NOT NULL,
    "enrollment_count"      INTEGER NOT NULL,
    "time_stamp"            INTEGER NOT NULL,
    PRIMARY KEY("height")
)
```
----

## 2. Table **enrollments**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| block_height      | INTEGER   | Y  | Y        |          | The height of the block|
| enrollment_index  | INTEGER   | Y  | Y        |          | The index of enrollment in the block.|
| utxo_key          | BLOB      |    | Y        |          | K: UTXO hash, A hash of a frozen UTXO|
| random_seed       | BLOB      |    | Y        |          | X: Random seed, The nth image of random value|
| cycle_length      | INTEGER   |    | Y        |          | n: the number of rounds a validator will participate in |
| enroll_sig        | BLOB      |    | Y        |          | S: A signature for the message H(K, X, n, R) and the key K, using R|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "enrollments" (
    "block_height"          INTEGER NOT NULL,
    "enrollment_index"      INTEGER NOT NULL,
    "utxo_key"              BLOB    NOT NULL,
    "random_seed"           BLOB    NOT NULL,
    "cycle_length"          INTEGER NOT NULL,
    "enroll_sig"            BLOB    NOT NULL,
    PRIMARY KEY("block_height","enrollment_index")
)
```
----

## 3. Table **transactions**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| block_height      | INTEGER   | Y  | Y        |          | The height of the block|
| tx_index          | INTEGER   | Y  | Y        |          | The index of transaction in the block |
| tx_hash           | BLOB      |    | Y        |          | The hash of transaction |
| type              | INTEGER   |    | Y        |          | The type of transaction |
| unlock_height     | INTEGER   |    | Y        |          | Height of the block to be unlock|
| lock_height       | INTEGER   |    | Y        |          | This transaction may only be included in a block with `block_height >= lock_height`|
| tx_fee            | INTEGER   |    | Y        |          | The fee of this transaction |
| payload_fee       | INTEGER   |    | Y        |          | The payload fee of this transaction  |
| tx_size           | INTEGER   |    | Y        |          | The size of this transaction  |
| inputs_count      | INTEGER   |    | Y        |          | The number of inputs in the transaction |
| outputs_count     | INTEGER   |    | Y        |          | The number of outputs in the transaction |
| payload_size      | INTEGER   |    | Y        |          | The size of data payload in the transaction |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "transactions" (
    "block_height"          INTEGER NOT NULL,
    "tx_index"              INTEGER NOT NULL,
    "tx_hash"               BLOB    NOT NULL,
    "type"                  INTEGER NOT NULL,
    "unlock_height"         INTEGER NOT NULL,
    "lock_height"           INTEGER NOT NULL,
    "tx_fee"                INTEGER NOT NULL,
    "payload_fee"           INTEGER NOT NULL,
    "tx_size"               INTEGER NOT NULL,
    "inputs_count"          INTEGER NOT NULL,
    "outputs_count"         INTEGER NOT NULL,
    "payload_size"          INTEGER NOT NULL,
    PRIMARY KEY("block_height","tx_index")
)
```
----

## 4. Table **tx_inputs**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| block_height      | INTEGER   | Y  | Y        |          | The height of the block|
| tx_index          | INTEGER   | Y  | Y        |          | The index of this transaction in the block's transactions array|
| in_index          | INTEGER   | Y  | Y        |          | The index of this input in the Transaction's inputs array|
| tx_hash           | BLOB      |    | Y        |          | The hash of transaction |
| utxo              | BLOB      | Y  | Y        |          | The hash of the UTXO to be spent|
| unlock_bytes      | BLOB      |    | Y        |          | The unlock script, which will be ran together with the matching Input's lock script in the execution engine|
| unlock_age        | INTEGER   |    | Y        |          | Use for implementing relative time locks |
### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_inputs" (
    "block_height"          INTEGER NOT NULL,
    "tx_index"              INTEGER NOT NULL,
    "in_index"              INTEGER NOT NULL,
    "tx_hash"               BLOB    NOT NULL,
    "utxo"                  BLOB    NOT NULL,
    "unlock_bytes"          BLOB    NOT NULL,
    "unlock_age"            INTEGER NOT NULL,
    PRIMARY KEY("block_height","tx_index","in_index","utxo")
)
```
----

## 5. Table **tx_outputs**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  block_height     | INTEGER   | Y  | Y        |          | The height of the block|
|  tx_index         | INTEGER   | Y  | Y        |          | The index of transaction in the block.|
|  output_index     | INTEGER   | Y  | Y        |          | The index of output in the outputs.|
|  tx_hash          | BLOB      |    | Y        |          | The hash of transaction |
|  utxo_key         | BLOB      |    | Y        |          | The hash of the UTXO|
|  amount           | NUMERIC   |    | Y        |          | The monetary value of this output, in 1/10^7|
|  lock_type        | INTEGER   |    | Y        |          | (0: Key; 1: Hash of Key; 2: Script; 3: Hash of Script) |
|  lock_bytes       | BLOB      |    | Y        |          | The bytes of lock |
|  address          | TEXT      |    | Y        |          | The public key, Valid only when lock type is 0. Other than that, it's a blank.|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_outputs" (
    "block_height"          INTEGER NOT NULL,
    "tx_index"              INTEGER NOT NULL,
    "output_index"          INTEGER NOT NULL,
    "tx_hash"               BLOB    NOT NULL,
    "utxo_key"              BLOB    NOT NULL,
    "amount"                NUMERIC NOT NULL,
    "lock_type"             INTEGER NOT NULL,
    "lock_bytes"            BLOB    NOT NULL,
    "address"               TEXT    NOT NULL,
    PRIMARY KEY("block_height","tx_index","output_index")
)
```
----

## 6. Table **utxos**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  utxo_key         | BLOB      | Y  | Y        |          | The hash of the UTXO|
|  tx_hash          | BLOB      |    | Y        |          | The hash of transaction |
|  type             | INTEGER   |    | Y        |          | The type of UTXO (0: Payment, 1: Freeze) If the type of transaction is `Freeze` and the refund output is less than 40,000 BOA, it is `Payment`. Others are the same as the transaction type. |
|  unlock_height    | INTEGER   |    | Y        |          | Height of the block to be unlock|
|  amount           | NUMERIC   |    | Y        |          | The monetary value of this output, in 1/10^7|
|  lock_type        | INTEGER   |    | Y        |          | (0: Key; 1: Hash of Key; 2: Script; 3: Hash of Script) |
|  lock_bytes       | BLOB      |    | Y        |          | The bytes of lock |
|  address          | TEXT      |    | Y        |          | The public key, Valid only when lock type is 0. Other than that, it's a blank.|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "utxos" (
    "utxo_key"              BLOB    NOT NULL,
    "tx_hash"               BLOB    NOT NULL,
    "type"                  INTEGER NOT NULL,
    "unlock_height"         INTEGER NOT NULL,
    "amount"                NUMERIC NOT NULL,
    "lock_type"             INTEGER NOT NULL,
    "lock_bytes"            BLOB    NOT NULL,
    "address"               TEXT    NOT NULL,
    PRIMARY KEY("utxo_key")
)
```
----

## 7. Table **validators**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  enrolled_at      | INTEGER   | Y  | Y        |          | The height this validator enrolled at |
|  utxo_key         | BLOB      | Y  | Y        |          | The hash of the UTXO|
|  address          | TEXT      |    | Y        |          | The public key that can redeem this UTXO|
|  stake            | NUMERIC   |    | Y        |          | The amount of the UTXO|
|  preimage_distance| INTEGER   |    | Y        |          | The distance of the preimage|
|  preimage_hash    | BLOB      |    | Y        |          | The hash of the preimage|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "validators" (
    "enrolled_at"           INTEGER NOT NULL,
    "utxo_key"              BLOB    NOT NULL,
    "address"               TEXT    NOT NULL,
    "stake"                 NUMERIC NOT NULL,
    "preimage_distance"     INTEGER NOT NULL,
    "preimage_hash"         BLOB    NOT NULL,
    PRIMARY KEY("enrolled_at","utxo_key")
)
```
----

## 8. Table **payloads**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  tx_hash          | BLOB      | Y  | Y        |          | The hash of transaction |
|  payload          | BLOB      |    | Y        |          | The transaction data payload |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "payloads" (
    "tx_hash"               BLOB    NOT NULL,
    "payload"               BLOB    NOT NULL,
    PRIMARY KEY("tx_hash")
)
```

----

## 9. Table **information**

It can store information that is required for operation.
The following data is recorded when the most recently recorded block height is 100.

{"key": "height", "value": "100"}

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  key              | TEXT      | Y  | Y        |          | The key   |
|  value            | TEXT      |    | Y        |          | The value |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS information (
    key                     TEXT    NOT NULL,
    value                   TEXT    NOT NULL,
    PRIMARY KEY(key)
)
```

----

## 10. Table **transaction_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| tx_hash           | BLOB      | Y  | Y        |          | The hash of transaction |
| type              | INTEGER   |    | Y        |          | The type of transaction |
| payload           | BLOB      |    | Y        |          | The transaction data payload |
| lock_height       | INTEGER   |    | Y        |          | This transaction may only be included in a block with `block_height >= lock_height`|
| received_height   | INTEGER   |    | Y        |          | The height of the block on receipt |
| time              | INTEGER   |    | Y        |          | Received time |
| tx_fee            | INTEGER   |    | Y        |          | The fee of this transaction |
| payload_fee       | INTEGER   |    | Y        |          | The payload fee of this transaction  |
| tx_size           | INTEGER   |    | Y        |          | The size of this transaction  |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "transaction_pool" (
    "tx_hash"               BLOB    NOT NULL,
    "type"                  INTEGER NOT NULL,
    "payload"               BLOB    NOT NULL,
    "lock_height"           INTEGER NOT NULL,
    "received_height"       INTEGER NOT NULL,
    "time"                  INTEGER NOT NULL,
    "tx_fee"                INTEGER NOT NULL,
    "payload_fee"           INTEGER NOT NULL,
    "tx_size"               INTEGER NOT NULL,
    PRIMARY KEY("tx_hash")
)
```

----

## 11. Table **tx_input_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| tx_hash           | BLOB      | Y  | Y        |          | The hash of transaction|
| input_index       | INTEGER   | Y  | Y        |          | The index of input in the inputs|
| utxo              | BLOB      |    | Y        |          | The hash of the UTXO to be spent|
| unlock_bytes      | BLOB      |    | Y        |          | The unlock script, which will be ran together with the matching Input's lock script in the execution engine|
| unlock_age        | INTEGER   |    | Y        |          | Use for implementing relative time locks |
### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_input_pool" (
    "tx_hash"               BLOB    NOT NULL,
    "input_index"           INTEGER NOT NULL,
    "utxo"                  BLOB    NOT NULL,
    "unlock_bytes"          BLOB    NOT NULL,
    "unlock_age"            INTEGER NOT NULL,
    PRIMARY KEY("tx_hash","input_index")
)
```

----

## 12. Table **tx_output_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  tx_hash          | BLOB      | Y  | Y        |          | The hash of transaction|
|  output_index     | INTEGER   | Y  | Y        |          | The index of output in the outputs|
|  amount           | NUMERIC   |    | Y        |          | The monetary value of this output, in 1/10^7|
|  lock_type        | INTEGER   |    | Y        |          | (0: Key; 1: Hash of Key; 2: Script; 3: Hash of Script) |
|  lock_bytes       | BLOB      |    | Y        |          | The bytes of lock |
|  address          | TEXT      |    | Y        |          | The public key that can redeem this output|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_output_pool" (
    "tx_hash"               BLOB    NOT NULL,
    "output_index"          INTEGER NOT NULL,
    "amount"                NUMERIC NOT NULL,
    "lock_type"             INTEGER NOT NULL,
    "lock_bytes"            BLOB    NOT NULL,
    "address"               TEXT    NOT NULL,
    PRIMARY KEY("tx_hash","output_index")
)
```
----
