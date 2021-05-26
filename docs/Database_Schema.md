
# The database schema of Stoa

## 1. Table **blocks**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| height            | INTEGER   | Y  | Y        |          | The height of the block |
| hash              | TINYBLOB  |    | Y        |          | The hash of the current block |
| prev_block        | TINYBLOB  |    | Y        |          | The hash of the previous block |
| validators        | TEXT      |    | Y        |          | Bitfield containing the validators' key indices which signed the block |
| merkle_root       | TINYBLOB  |    | Y        |          | The hash of the merkle root of the transactions|
| signature         | TINYBLOB  |    | Y        |          | Schnorr multisig of all validators which signed this block |
| random_seed       | TINYBLOB  |    | Y        |          | Hash of random seed of the preimages for this height |
| missing_validators| TEXT      |    | N        |          | List of indices to the validator UTXO set which have not revealed the preimage|
| tx_count          | INTEGER   |    | Y        |          | The number of transactions in the block|
| enrollment_count  | INTEGER   |    | Y        |          | The number of enrollments in the block|
| time_offset       | INTEGER   |    | Y        |          | Block seconds offset from Genesis Timestamp |
| time_stamp        | INTEGER   |    | Y        |          | Block unix timestamp |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "blocks" (
    "height"                INTEGER  NOT NULL,
    "hash"                  TINYBLOB NOT NULL,
    "prev_block"            TINYBLOB NOT NULL,
    "validators"            TEXT     NOT NULL,
    "merkle_root"           TINYBLOB NOT NULL,
    "signature"             TINYBLOB NOT NULL,
    "random_seed"           TINYBLOB NOT NULL,
    "missing_validators"    TEXT     NULL,
    "tx_count"              INTEGER  NOT NULL,
    "enrollment_count"      INTEGER  NOT NULL,
    "time_offset"           INTEGER  NOT NULL,
    "time_stamp"            INTEGER  NOT NULL,
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
| utxo_key          | TINYBLOB  |    | Y        |          | K: UTXO hash, A hash of a frozen UTXO|
| commitment        | TINYBLOB  |    | Y        |          | X: commitment, The nth image of random value|
| cycle_length      | INTEGER   |    | Y        |          | n: the number of rounds a validator will participate in |
| enroll_sig        | TINYBLOB  |    | Y        |          | S: A signature for the message H(K, X, n, R) and the key K, using R|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "enrollments" (
    "block_height"          INTEGER  NOT NULL,
    "enrollment_index"      INTEGER  NOT NULL,
    "utxo_key"              TINYBLOB NOT NULL,
    "commitment"            TINYBLOB NOT NULL,
    "cycle_length"          INTEGER  NOT NULL,
    "enroll_sig"            TINYBLOB NOT NULL,
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
| tx_hash           | TINYBLOB  |    | Y        |          | The hash of transaction |
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
    "block_height"          INTEGER  NOT NULL,
    "tx_index"              INTEGER  NOT NULL,
    "tx_hash"               TINYBLOB NOT NULL,
    "type"                  INTEGER  NOT NULL,
    "unlock_height"         INTEGER  NOT NULL,
    "lock_height"           INTEGER  NOT NULL,
    "tx_fee"                INTEGER  NOT NULL,
    "payload_fee"           INTEGER  NOT NULL,
    "tx_size"               INTEGER  NOT NULL,
    "inputs_count"          INTEGER  NOT NULL,
    "outputs_count"         INTEGER  NOT NULL,
    "payload_size"          INTEGER  NOT NULL,
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
| tx_hash           | TINYBLOB  |    | Y        |          | The hash of transaction |
| utxo              | TINYBLOB  | Y  | Y        |          | The hash of the UTXO to be spent|
| unlock_bytes      | TINYBLOB  |    | Y        |          | The unlock script, which will be ran together with the matching Input's lock script in the execution engine|
| unlock_age        | INTEGER   |    | Y        |          | Use for implementing relative time locks |
### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_inputs" (
    "block_height"          INTEGER  NOT NULL,
    "tx_index"              INTEGER  NOT NULL,
    "in_index"              INTEGER  NOT NULL,
    "tx_hash"               TINYBLOB NOT NULL,
    "utxo"                  TINYBLOB NOT NULL,
    "unlock_bytes"          TINYBLOB NOT NULL,
    "unlock_age"            INTEGER  NOT NULL,
    PRIMARY KEY("block_height","tx_index","in_index","utxo(64)")
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
|  tx_hash          | TINYBLOB  |    | Y        |          | The hash of transaction |
|  utxo_key         | BLOB      |    | Y        |          | The hash of the UTXO|
|  type             | INTEGER   |    | Y        |          | The type of transaction output  |
|  amount           | NUMERIC   |    | Y        |          | The monetary value of this output, in 1/10^7|
|  lock_type        | INTEGER   |    | Y        |          | (0: Key; 1: Hash of Key; 2: Script; 3: Hash of Script) |
|  lock_bytes       | TINYBLOB  |    | Y        |          | The bytes of lock |
|  address          | TEXT      |    | Y        |          | The public key, Valid only when lock type is 0. Other than that, it's a blank.|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_outputs" (
    "block_height"          INTEGER  NOT NULL,
    "tx_index"              INTEGER  NOT NULL,
    "output_index"          INTEGER  NOT NULL,
    "tx_hash"               TINYBLOB NOT NULL,
    "utxo_key"              TINYBLOB NOT NULL,
    "type"                  INTEGER  NOT NULL,
    "amount"                NUMERIC  NOT NULL,
    "lock_type"             INTEGER  NOT NULL,
    "lock_bytes"            TINYBLOB NOT NULL,
    "address"               TEXT     NOT NULL,
    PRIMARY KEY("block_height","tx_index","output_index")
)
```
----

## 6. Table **utxos**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  utxo_key         | TINYBLOB  | Y  | Y        |          | The hash of the UTXO|
|  tx_hash          | TINYBLOB  |    | Y        |          | The hash of transaction |
|  type             | INTEGER   |    | Y        |          | The type of UTXO (0: Payment, 1: Freeze) If the type of transaction is `Freeze` and the refund output is less than 40,000 BOA, it is `Payment`. Others are the same as the transaction type. |
|  unlock_height    | INTEGER   |    | Y        |          | Height of the block to be unlock|
|  amount           | BIGINT(20)|    | Y        |          | The monetary value of this output, in 1/10^7|
|  lock_type        | INTEGER   |    | Y        |          | (0: Key; 1: Hash of Key; 2: Script; 3: Hash of Script) |
|  lock_bytes       | TINYBLOB  |    | Y        |          | The bytes of lock |
|  address          | TEXT      |    | Y        |          | The public key, Valid only when lock type is 0. Other than that, it's a blank.|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "utxos" (
    "utxo_key"              TINYBLOB   NOT NULL,
    "tx_hash"               TINYBLOB   NOT NULL,
    "type"                  INTEGER    NOT NULL,
    "unlock_height"         INTEGER    NOT NULL,
    "amount"                BIGINT(20) NOT NULL,
    "lock_type"             INTEGER    NOT NULL,
    "lock_bytes"            TINYBLOB   NOT NULL,
    "address"               TEXT       NOT NULL,
    PRIMARY KEY("utxo_key(64)")
)
```
----

## 7. Table **validators**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  enrolled_at      | INTEGER   | Y  | Y        |          | The height this validator enrolled at |
|  utxo_key         | TINYBLOB  | Y  | Y        |          | The hash of the UTXO|
|  address          | TEXT      |    | Y        |          | The public key that can redeem this UTXO|
|  stake            | BIGINT(20)|    | Y        |          | The amount of the UTXO|
|  preimage_height  | INTEGER   |    | Y        |          | The height of the preimage|
|  preimage_hash    | TINYBLOB  |    | Y        |          | The hash of the preimage|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "validators" (
    "enrolled_at"           INTEGER    NOT NULL,
    "utxo_key"              TINYBLOB   NOT NULL,
    "address"               TEXT       NOT NULL,
    "stake"                 BIGINT(20) NOT NULL,
    "preimage_height"       INTEGER    NOT NULL,
    "preimage_hash"         TINYBLOB   NOT NULL,
    PRIMARY KEY("enrolled_at","utxo_key(64)")
)
```
----

## 8. Table **payloads**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  tx_hash          | TINYBLOB  | Y  | Y        |          | The hash of transaction |
|  payload          | BLOB      |    | Y        |          | The transaction data payload |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "payloads" (
    "tx_hash"               TINYBLOB NOT NULL,
    "payload"               BLOB     NOT NULL,
    PRIMARY KEY("tx_hash(64)")
)
```

----

## 9. Table **merkle_trees**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| block_height      | INTEGER   | Y  | Y        |          | The height of the block |
| merkle_index      | INTEGER   | Y  | Y        |          | The index of merkleTree in the block |
| merkle_hash       | TINYBLOB  |    | Y        |          | The merkle tree |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "merkle_trees" (
    "block_height"          INTEGER  NOT NULL,
    "merkle_index"          INTEGER  NOT NULL,
    "merkle_hash"           TINYBLOB NOT NULL,
    PRIMARY KEY("block_height","merkle_index")
)
```
----

## 10. Table **information**

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
CREATE TABLE IF NOT EXISTS "information" (
    "key"                     TEXT    NOT NULL,
    "value"                   TEXT    NOT NULL,
    PRIMARY KEY("key(64)")
)
```

----

## 11. Table **transaction_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| tx_hash           | TINYBLOB  | Y  | Y        |          | The hash of transaction |
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
    "tx_hash"               TINYBLOB NOT NULL,
    "type"                  INTEGER  NOT NULL,
    "payload"               BLOB     NOT NULL,
    "lock_height"           INTEGER  NOT NULL,
    "received_height"       INTEGER  NOT NULL,
    "time"                  INTEGER  NOT NULL,
    "tx_fee"                INTEGER  NOT NULL,
    "payload_fee"           INTEGER  NOT NULL,
    "tx_size"               INTEGER  NOT NULL,
    PRIMARY KEY("tx_hash(64)")
)
```

----

## 12. Table **tx_input_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| tx_hash           | TINYBLOB  | Y  | Y        |          | The hash of transaction|
| input_index       | INTEGER   | Y  | Y        |          | The index of input in the inputs|
| utxo              | TINYBLOB  |    | Y        |          | The hash of the UTXO to be spent|
| unlock_bytes      | TINYBLOB  |    | Y        |          | The unlock script, which will be ran together with the matching Input's lock script in the execution engine|
| unlock_age        | INTEGER   |    | Y        |          | Use for implementing relative time locks |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_input_pool" (
    "tx_hash"               TINYBLOB NOT NULL,
    "input_index"           INTEGER  NOT NULL,
    "utxo"                  TINYBLOB NOT NULL,
    "unlock_bytes"          TINYBLOB NOT NULL,
    "unlock_age"            INTEGER  NOT NULL,
    PRIMARY KEY("tx_hash(64)","input_index")
)
```

----

## 13. Table **tx_output_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  tx_hash          | TINYBLOB  | Y  | Y        |          | The hash of transaction|
|  output_index     | INTEGER   | Y  | Y        |          | The index of output in the outputs|
|  type             | INTEGER   |    | Y        |          | The type of transaction output |
|  amount           | BIGINT(20)|    | Y        |          | The monetary value of this output, in 1/10^7|
|  lock_type        | INTEGER   |    | Y        |          | (0: Key; 1: Hash of Key; 2: Script; 3: Hash of Script) |
|  lock_bytes       | TINYBLOB  |    | Y        |          | The bytes of lock |
|  address          | TEXT      |    | Y        |          | The public key that can redeem this output|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_output_pool" (
    "tx_hash"               TINYBLOB   NOT NULL,
    "output_index"          INTEGER    NOT NULL,
    "type"                  INTEGER    NOT NULL,
    "amount"                BIGINT(20) NOT NULL,
    "lock_type"             INTEGER    NOT NULL,
    "lock_bytes"            TINYBLOB   NOT NULL,
    "address"               TEXT       NOT NULL,
    PRIMARY KEY("tx_hash(64)","output_index")
)
```

----

## 14. Table **blocks_stats**

### _Schema_

| Column                 | Data Type | PK | Not NULL | Default  |Description|
|:-----------------------|:--------- |:--:|:--------:| -------- | --------- |
|  block_height          | INTEGER   | Y  | Y        |          | The block height  |
|  total_sent            | BIGINT(20)|    | Y        |          | Total sent   |
|  total_received        | BIGINT(20)|    | Y        |          | Total received  |
|  total_reward          | BIGINT(20)|    | Y        |          | Total reward |
|  total_fee             | BIGINT(20)|    | Y        |          | Total fee  |
|  total_size            | BIGINT(20)|    | Y        |          | Total block size  |

### _Create Script_

```sql
Create TABLE IF NOT EXISTS "blocks_stats" (
    "block_height"        INTEGER     NOT NULL,
    "total_sent"          BIGINT(20)  UNSIGNED NOT NULL,
    "total_received"      BIGINT(20)  UNSIGNED NOT NULL,
    "total_reward"        BIGINT(20)  UNSIGNED NOT NULL,
    "total_fee"           BIGINT(20)  NOT NULL,
    "total_size"          BIGINT(20)  UNSIGNED NOT NULL,
    PRIMARY KEY ("block_height")
);
```
----

## 15. Table **marketcap**

### _Schema_

| Column                 | Data Type    | PK | Not NULL | Default  |Description|
|:-----------------------|:---------    |:--:|:--------:| -------- | --------- |
|  last_updated_at       | INTEGER      | Y  | Y        |          | Time of last update  |
|  price                 | DECIMAL(14,6)|    | Y        |          | Price of BOA in USD  |
|  market_cap            | BIGINT(20)   |    | Y        |          | Market cap 24 hour amount  |
|  vol_24h               | BIGINT(20)   |    | Y        |          | 24 hours Volume  |
|  change_24h            | BIGINT(20)   |    |          |          | Market cap change for last 24 hours |

### _Create Script_

```sql
Create TABLE IF NOT EXISTS "marketcap" (
    "last_updated_at"        INTEGER       NOT NULL,
    "price"                  DECIMAL(14,6) NOT NULL,
    "market_cap"             BIGINT(20)    UNSIGNED NOT NULL,
    "vol_24h"                BIGINT(20)    UNSIGNED NOT NULL,
    "change_24h"             BIGINT(20),
    PRIMARY KEY ("last_updated_at")
);
```

## 16. Table **tx_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| key               | TINYBLOB  | Y  | Y        |          | The hash of transaction |
| val               | BLOB      |    | Y        |          | The transaction serialized to binary |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS tx_pool (
    `key`   TINYBLOB    NOT NULL,
    `val`   BLOB        NOT NULL,
    PRIMARY KEY (`key`(64))
)
```
