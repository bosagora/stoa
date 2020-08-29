
# The database schema of Stoa

## 1. Table **blocks**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
| height            | INTEGER   | Y  | Y        |          | The height of the block |
| hash              | TEXT      |    | Y        |          | The hash of the current block |
| prev_block        | TEXT      |    | Y        |          | The hash of the previous block |
| validators        | TEXT      |    | Y        |          | Bitfield containing the validators' key indices which signed the block |
| merkle_root       | TEXT      |    | Y        |          | The hash of the merkle root of the transactions|
| signature         | TEXT      |    | Y        |          | Schnorr multisig of all validators which signed this block |
| tx_count          | INTEGER   |    | Y        |          | The number of transactions in the block|
| enrollment_count  | INTEGER   |    | Y        |          | The number of enrollments in the block|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "blocks" (
    "height"                INTEGER NOT NULL,
    "hash"                  TEXT    NOT NULL,
    "prev_block"            TEXT    NOT NULL,
    "validators"            TEXT    NOT NULL,
    "merkle_root"           TEXT    NOT NULL,
    "signature"             TEXT    NOT NULL,
    "tx_count"              INTEGER NOT NULL,
    "enrollment_count"      INTEGER NOT NULL,
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
| utxo_key          | TEXT      |    | Y        |          | K: UTXO hash, A hash of a frozen UTXO|
| random_seed       | TEXT      |    | Y        |          | X: Random seed, The nth image of random value|
| cycle_length      | INTEGER   |    | Y        |          | n: the number of rounds a validator will participate in |
| enroll_sig        | TEXT      |    | Y        |          | S: A signature for the message H(K, X, n, R) and the key K, using R|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "enrollments" (
    "block_height"          INTEGER NOT NULL,
    "enrollment_index"      INTEGER NOT NULL,
    "utxo_key"              TEXT    NOT NULL,
    "random_seed"           TEXT    NOT NULL,
    "cycle_length"          INTEGER NOT NULL,
    "enroll_sig"            TEXT    NOT NULL,
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
| tx_hash           | TEXT      |    | Y        |          | The hash of transaction |
| type              | INTEGER   |    | Y        |          | The type of transaction |
| inputs_count      | INTEGER   |    | Y        |          | The number of inputs in the transaction |
| outputs_count     | INTEGER   |    | Y        |          | The number of outputs in the transaction |

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "transactions" (
    "block_height"          INTEGER NOT NULL,
    "tx_index"              INTEGER NOT NULL,
    "tx_hash"               TEXT    NOT NULL,
    "type"                  INTEGER NOT NULL,
    "inputs_count"          INTEGER NOT NULL,
    "outputs_count"         INTEGER NOT NULL,
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
| previous          | TEXT      |    | Y        |          | The hash of a previous transaction containing the output to spend |
| out_index         | INTEGER   |    | Y        |          | The index of the output in the previous transaction|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_inputs" (
    "block_height"          INTEGER NOT NULL,
    "tx_index"              INTEGER NOT NULL,
    "in_index"              INTEGER NOT NULL,
    "previous"              TEXT    NOT NULL,
    "out_index"             INTEGER NOT NULL,
    PRIMARY KEY("block_height","tx_index","in_index")
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
|  tx_hash          | TEXT      |    | Y        |          | The hash of transaction |
|  utxo_key         | TEXT      |    | Y        |          | The hash of the UTXO|
|  amount           | NUMERIC   |    | Y        |          | The monetary value of this output, in 1/10^7|
|  address          | TEXT      |    | Y        |          | The public key that can redeem this output|
|  used             | INTEGER   |    | Y        | 0        | Whether this output was used or not(1: used, 0: not used)|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "tx_outputs" (
    "block_height"          INTEGER NOT NULL,
    "tx_index"              INTEGER NOT NULL,
    "output_index"          INTEGER NOT NULL,
    "tx_hash"               TEXT    NOT NULL,
    "utxo_key"              TEXT    NOT NULL,
    "amount"                NUMERIC NOT NULL,
    "address"               TEXT    NOT NULL,
    "used"                  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY("block_height","tx_index","output_index")
)
```
----

## 6. Table **validators**

### _Schema_

| Column            | Data Type | PK | Not NULL | Default  |Description|
|:----------------- |:--------- |:--:|:--------:| -------- | --------- |
|  enrolled_at      | INTEGER   | Y  | Y        |          | The height this validator enrolled at |
|  utxo_key         | TEXT      | Y  | Y        |          | The hash of the UTXO|
|  address          | TEXT(56)  |    | Y        |          | The public key that can redeem this UTXO|
|  stake            | NUMERIC   |    | Y        |          | The amount of the UTXO|
|  preimage_distance| INTEGER   |    | Y        |          | The distance of the preimage|
|  preimage_hash    | TEXT      |    | Y        |          | The hash of the preimage|

### _Create Script_

```sql
CREATE TABLE IF NOT EXISTS "validators" (
    "enrolled_at"           INTEGER NOT NULL,
    "utxo_key"              TEXT    NOT NULL,
    "address"               TEXT    NOT NULL,
    "stake"    NUMERIC NOT NULL,
    "preimage_distance"     INTEGER NOT NULL,
    "preimage_hash"         TEXT    NOT NULL,
    PRIMARY KEY("enrolled_at","utxo_key")
)
```

----

## 6. Table **information**

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
