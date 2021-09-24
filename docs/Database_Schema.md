
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
| enroll_sig        | TINYBLOB  |    | Y        |          | S: A signature for the message H(K, X, n, R) and the key K, using R|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "enrollments" (
    "block_height"          INTEGER  NOT NULL,
    "enrollment_index"      INTEGER  NOT NULL,
    "utxo_key"              TINYBLOB NOT NULL,
    "commitment"            TINYBLOB NOT NULL,
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
| tx_fee            | BIGINT(20)|    | Y        |          | The fee of this transaction |
| payload_fee       | BIGINT(20)|    | Y        |          | The payload fee of this transaction  |
| tx_size           | INTEGER   |    | Y        |          | The size of this transaction  |
| calculated_tx_fee | BIGINT(20)|    | Y        |          | The calculated fee of this transaction |
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
    "tx_fee"                BIGINT(20)  NOT NULL,
    "payload_fee"           BIGINT(20)  NOT NULL,
    "tx_size"               INTEGER  NOT NULL,
    "calculated_tx_fee"     BIGINT(20)  NOT NULL,
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
|  amount           | BIGINT(20)|    | Y        |          | The monetary value of this output, in 1/10^7|
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
    "amount"                BIGINT(20)  NOT NULL,
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

## 10. Table **blocks_header_updated_history**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| block_height      | INTEGER   | Y  | Y        |          | The updated block height |
| current_height    | INTEGER   |    | Y        |          | The current block height |
| signature         | TINYBLOB  | Y  | Y        |          | Schnorr multisig of all validators which signed this block |
| hash              | TINYBLOB  |    | Y        |          | The hash of the current block |
| validators        | TEXT      |    | Y        |          | BitMask containing the validators' key indices which signed the block |
| missing_validators| TEXT      |    | N        |          | List of indices to the validator UTXO set which have not revealed the preimage |
| updated_time      | INTEGER   | Y  | Y        |          | Updated timestamp |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "blocks_header_updated_history" 
    "block_height"        INTEGER  NOT NULL,
    "current_height"      INTEGER  NOT NULL,
    "signature"           TINYBLOB NOT NULL,
    "hash"                TINYBLOB NOT NULL,
    "validators"          TEXT     NOT NULL,
    "missing_validators   TEXT     NULL,
    "updated_time"        INTEGER  NOT NULL,
    PRIMARY KEY("block_height","signature","updated_time")
)
```
----

## 11. Table **information**

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

## 12. Table **transaction_pool**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| tx_hash           | TINYBLOB  | Y  | Y        |          | The hash of transaction |
| type              | INTEGER   |    | Y        |          | The type of transaction |
| payload           | BLOB      |    | Y        |          | The transaction data payload |
| lock_height       | INTEGER   |    | Y        |          | This transaction may only be included in a block with `block_height >= lock_height`|
| received_height   | INTEGER   |    | Y        |          | The height of the block on receipt |
| time              | INTEGER   |    | Y        |          | Received time |
| tx_fee            | BIGINT(20)|    | Y        |          | The fee of this transaction |
| payload_fee       | BIGINT(20)|    | Y        |          | The payload fee of this transaction  |
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
    "tx_fee"                BIGINT(20)  NOT NULL,
    "payload_fee"           BIGINT(20)  NOT NULL,
    "tx_size"               INTEGER  NOT NULL,
    PRIMARY KEY("tx_hash(64)")
)
```

----

## 13. Table **tx_input_pool**

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

## 14. Table **tx_output_pool**

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

## 15. Table **blocks_stats**

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

## 16. Table **marketcap**

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

## 17. Table **tx_pool**

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
);
```
## 18. Table **fee_mean_disparity**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| height            | INTEGER   | Y  | Y        |          | The height of the block |
| disparity         | BIGINT(20)|    | Y        |          | The disparity of transaction fee |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS fee_mean_disparity (
    height      INTEGER    NOT NULL,
    disparity   BIGINT(20) NOT NULL,
    PRIMARY KEY (height)
)
```
----

## 19. Table **accounts**

### Schema

| Column                 | Data Type  | PK | Not NULL | Default  |Description|
|:-----------------------|:-----------|:--:|:--------:| -------- | --------- |
|  address               | TEXT       | Y  | Y        |          | Public key of the wallet|
|  tx_count              | INTEGER    |    | Y        |          | Transaction count of BOA Holder        |
|  total_received        | BIGINT(24) |    | Y        |          | Total received amount of BOA Holder    |
|  total_sent            | BIGINT(24) |    | Y        |          | Total sent amount of BOA Holder        |
|  total_reward          | BIGINT(20) |    | Y        |          | Total reward amount of BOA Holder      |
|  total_frozen          | BIGINT(20) |    | Y        |          | Total freeze amount of BOA Holder      |
|  total_spendable       | BIGINT(20) |    | Y        |          | Total received amount of BOA Holder    |
|  total_balance         | BIGINT(20) |    | Y        |          | Total balance of wallet of BOA Holder  | 

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "accounts"(
    "address"          TEXT,
    "tx_count"        INTEGER,
    "total_received"   BIGINT(24) UNSIGNED NOT NULL,
    "total_sent"       BIGINT(24) UNSIGNED NOT NULL,
    "total_reward"     BIGINT(20) UNSIGNED NOT NULL,
    "total_frozen"     BIGINT(20) UNSIGNED NOT NULL,
    "total_spendable"  BIGINT(20) UNSIGNED NOT NULL,
    "total_balance"    BIGINT(20) UNSIGNED NOT NULL,
    PRIMARY KEY ("address(64)")
);
```

## 20. Table **fees**

### _Schema_

| Column                 | Data Type    | PK | Not NULL | Default  |Description|
|:-----------------------|:---------    |:--:|:--------:| -------- | --------- |
|  height                | TEXT         | Y  | Y        |          | Height of Block  |
|  time_stamp            | INTEGER      |    | Y        |          | Block unix timestamp  |
|  average_tx_fee        | BIGINT(20)   |    | Y        |          | Average Fee of All Fees  |
|  total_tx_fee          | BIGINT(20)   |    | Y        |          | Total Fee of Transactions in Block  |
|  total_payload_fee     | BIGINT(20)   |    | Y        |          | Total Payload Fee  |
|  total_fee             | BIGINT(20)   |    | Y        |          | Total Fee  |

### _Create Script_
```sql
CREATE TABLE IF NOT EXISTS "fees"(
    "height"             INTEGER    NOT NULL,
    "time_stamp"         INTEGER    NOT NULL,
    "average_tx_fee"     BIGINT(20) NOT NULL,
    "total_tx_fee"       BIGINT(20) NOT NULL,
    "total_payload_fee"  BIGINT(20) NOT NULL,
    "total_fee"          BIGINT(20) NOT NULL,
    PRIMARY KEY(height)
);
```
----

## 21. Table **account_history**

### _Schema_

| Column                 | Data Type    | PK | Not NULL | Default  |Description|
|:-----------------------|:---------    |:--:|:--------:| -------- | --------- |
|  address               | TEXT         | Y  | Y        |          | Address of Account  |
|  time_stamp            | INTEGER      | Y  | Y        |          | unix timestamp  |
|  granularity           | TEXT         | Y  | Y        |          | Total Fee of Transactions in Block  |
|  block_height          | INTEGER      |    | Y        |          | block height  |
|  balance               | BIGINT(20)   |    | Y        |          | Balance of user at particular time  |


### _Create Script_
```sql
CREATE TABLE IF NOT EXISTS "account_history"(
    "address"            TEXT       NOT NULL,
    "time_stamp"         INTEGER    NOT NULL,
    "granularity"        TEXT       NOT NULL,
    "block_height"       INTEGER    NOT NULL,
    "balance"            BIGINT(20) NOT NULL,
    
    PRIMARY KEY ("address(64)","time_stamp","granularity(64)");
);
```
----

## 22. Table **proposal_fee**

### _Schema_

| Column                 | Data Type | PK | Not NULL | Default  |Description|
|:-----------------------|:--------- |:--:|:--------:| -------- | --------- |
|  proposal_id           | TEXT      | Y  | Y        |          | The Proposal ID  |
|  tx_hash               | TINYBLOB  | Y  | Y        |          | The hash of transaction|
|  block_height          | INTEGER   |    | Y        |          | The block height  |


### _Create Script_
```sql
CREATE TABLE IF NOT EXISTS "proposal_fee"(
    "proposal_id"            TEXT       NOT NULL,
    "block_height"           INTEGER    NOT NULL,
    "tx_hash"                TINYBLOB   NOT NULL,
    
    PRIMARY KEY ("proposal_id(64)","tx_hash(64)");
);
```
----

## 23. Table **proposal**

### _Schema_

| Column                  | Data Type | PK | Not NULL | Default  |Description|
|:------------------------|:--------- |:--:|:--------:| -------- | --------- |
|  proposal_id            | TEXT      | Y  | Y        |          | The Proposal ID  |
|  app_name               | TEXT      | Y  | Y        |          | The name of App  |
|  block_height           | INTEGER   |    | Y        |          | The block height  |
|  tx_hash                | TINYBLOB  |    | Y        |          | The hash of transaction |
|  proposal_type          | INTEGER   |    | Y        |          | The type of Proposal   |
|  proposal_title         | TEXT      |    | Y        |          | The title of Proposal  |
|  vote_start_height      | INTEGER   |    | Y        |          | The vote start height of proposal|
|  vote_end_height        | INTEGER   |    | Y        |          | The vote end height of proposal  |
|  doc_hash               | TINYBLOB  |    | Y        |          | The doc hash of proposal         |
|  fund_amount            | BIGINT(20)|    | Y        |          | The fund amount of proposal      |
|  proposal_fee           | BIGINT(20)|    | Y        |          | The proposal fee |
|  vote_fee               | BIGINT(20)|    | Y        |          | The vote fee |
|  proposal_fee_tx_hash   | TINYBLOB  |    | Y        |          | The tx hash of proposal_fee |
|  proposer_address       | TEXT      |    | Y        |          | The address of proposer |
|  proposal_fee_address   | TEXT      |    | Y        |          | The proposer fee address|
|  status                 | TEXT      |    | Y        |          | The status of proposal  |
|  data_collection_status | TEXT      |    | Y        |          | The status of proposal data collection  |

### _Create Script_
```sql
CREATE TABLE IF NOT EXISTS "proposal"(
        "proposal_id"            TEXT        NOT NULL,
        "block_height"           INTEGER     NOT NULL,
        "tx_hash"                TINYBLOB    NOT NULL,
        "app_name"               TEXT        NOT NULL,
        "proposal_type"          INTEGER     NOT NULL,
        "proposal_title"         TEXT        NOT NULL,
        "vote_start_height"      INTEGER     NOT NULL,
        "vote_end_height"        INTEGER     NOT NULL,
        "doc_hash"               TINYBLOB    NOT NULL,
        "fund_amount"            BIGINT(20)  NOT NULL,
        "proposal_fee"           BIGINT(20)  NOT NULL,
        "vote_fee"               BIGINT(20)  NOT NULL,
        "proposal_fee_tx_hash"   TINYBLOB    NOT NULL,
        "proposer_address"       TEXT        NOT NULL,
        "proposal_fee_address"   TEXT        NOT NULL,
        "status"                 TEXT        NOT NULL,
        "data_collection_status" TEXT        NOT NULL,
    
        PRIMARY KEY ("proposal_id(64)", "app_name(64)");
);
```
----

## 23. Table **proposal_metadata**

### _Schema_

| Column                      | Data Type | PK | Not NULL | Default  |Description|
|:----------------------------|:--------- |:--:|:--------:| -------- | --------- |
|  proposal_id                | TEXT      | Y  | Y        |          | The Proposal ID  |
|  block_height               | INTEGER   |    | Y        |          | The block height  |
|  voting_fee_hash            | TINYBLOB  |    | Y        |          | The hash of voting fee |
|  vote_start_date            | INTEGER   |    | Y        |          | The vote start date of proposal |
|  vote_end_date              | INTEGER   |    | Y        |          | The vote end date of proposal |
|  detail                     | TEXT      |    | Y        |          | The Proposal detial  |
|  submit_time                | INTEGER   |    | Y        |          | The Proposal submition time  |
|  ave_pre_evaluation_score   | INTEGER   |    | Y        |          | The Proposal pre evaluation score  |
|  pre_evaluation_start_time  | INTEGER   |    | Y        |          | The Proposal pre evaluation start time |
|  pre_evaluation_end_time    | INTEGER   |    | Y        |          | The Proposal pre evaluation end time  |
|  assess_node_count          | INTEGER   |    | Y        |          | The proposer assess result node count |
|  assess_average_score       | DECIMAL   |    | Y        |          | The proposer assess result node average score |
|  assess_completeness_score  | DECIMAL   |    | Y        |          | The proposer assess result completeness   |
|  assess_realization_score   | DECIMAL   |    | Y        |          | The proposer assess result realization    |
|  assess_profitability_score | DECIMAL   |    | Y        |          | The proposer assess result profitability  |
|  assess_attractiveness_score| DECIMAL   |    | Y        |          | The proposer assess result attractiveness |
|  assess_expansion_score     | DECIMAL   |    | Y        |          | The proposer assess result expansion |
|  proposer_name              | TEXT      |    | Y        |          | The proposer name |


### _Create Script_
```sql
CREATE TABLE IF NOT EXISTS "proposal_metadata"(
        "proposal_id"                 TEXT          NOT NULL,
        "voting_start_date"           INTEGER       NOT NULL,
        "voting_end_date"             INTEGER       NOT NULL,
        "voting_fee_hash"             TINYBLOB      NOT NULL,
        "detail"                      TEXT          NOT NULL,
        "submit_time"                 INTEGER       NOT NULL,
        "ave_pre_evaluation_score"    INTEGER       NOT NULL,
        "pre_evaluation_start_time"   INTEGER       NOT NULL,
        "pre_evaluation_end_time"     INTEGER       NOT NULL,
        "assess_node_count"           INTEGER        NOT NULL,
        "assess_average_score"        DECIMAL(10,4)  NOT NULL,
        "assess_completeness_score"   DECIMAL(10,4)  NOT NULL,
        "assess_realization_score"    DECIMAL(10,4)  NOT NULL,
        "assess_profitability_score"  DECIMAL(10,4)  NOT NULL,
        "assess_attractiveness_score" DECIMAL(10,4)  NOT NULL,
        "assess_expansion_score"      DECIMAL(10,4)  NOT NULL,
        "proposer_name"               TEXT,

        PRIMARY KEY("proposal_id(64)")
);
```
----

## 24. Table **proposal_attachments**

### _Schema_

| Column                     | Data Type | PK | Not NULL | Default  | Description |
|:---------------------------|:--------- |:--:|:--------:| -------- | ----------- |
|  attachment_id             | TEXT      | Y  | Y        |          | The proposal's attachment id |
|  proposal_id               | TEXT      | Y  | Y        |          | The Proposal ID  |
|  name                      | TEXT      |    | Y        |          | The attachment name  |
|  url                       | TEXT      |    | Y        |          | The attachment url   |
|  mime                      | TEXT      |    | Y        |          | The attachment mime  |

### _Create Script_
```sql
CREATE TABLE IF NOT EXISTS proposal_attachments
        (
            "attachment_id"   TEXT      NOT NULL,
            "proposal_id"     TEXT      NOT NULL,
            "name"            TEXT      NOT NULL,
            "url"             TEXT      NOT NULL,
            "mime"            TEXT      NOT NULL,
            "doc_hash"        TEXT      NOT NULL,
            
            PRIMARY KEY("proposal_id(64)", "attachment_id(64)")
        );
);
```
----

