/*******************************************************************************

    Test of transaction pool

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    SodiumHelper, Hash, Transaction, TxInput, TxOutput, OutputType,
    PublicKey, JSBI, Signature, Unlock
} from 'boa-sdk-ts';
import { BOASodium } from 'boa-sodium-ts';
import { LedgerStorage } from "../src/modules/storage/LedgerStorage";
import { TransactionPool } from "../src/modules/storage/TransactionPool";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { MockDBConfig } from "./TestConfig";

import * as assert from 'assert';

describe ('Test TransactionPool', () =>
{
    let ledger_storage: LedgerStorage;
    let transaction_pool: TransactionPool;
    let testDBConfig: IDatabaseConfig;

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before ('Prepare Storage', async() =>
    {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200)
            .then((result) =>
            {
                ledger_storage = result;
                transaction_pool = new TransactionPool();
                return transaction_pool.loadSpenderList(ledger_storage.connection);
            });
    });

    after ('Close Storage', async () =>
    {
        await ledger_storage.dropTestDB(testDBConfig.database);
        await ledger_storage.close();
    });

    it ('Test for deletion of a pending transaction that all use the same input', async () =>
    {
        let tx1 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                        "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                )
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93")
                )
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.add(ledger_storage.connection, tx1);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 1);

        let tx2 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                        "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                )
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xrc00kar2yqa3jzve9cm4cvuaa8duazkuwrygmqgpcuf0gqww8ye7ua9lkl")
                )
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.remove(ledger_storage.connection, tx2, true);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 0);

        await transaction_pool.add(ledger_storage.connection, tx2);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 1);
    });

    it ('Test for deletion of a pending transaction that use some of the same inputs', async () =>
    {
        let tx1 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                        "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
                new TxInput(
                    new Hash(
                        "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83" +
                        "cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673"),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                )
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93")
                )
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.add(ledger_storage.connection, tx1);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 2);

        let tx2 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                        "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                )
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xrc00kar2yqa3jzve9cm4cvuaa8duazkuwrygmqgpcuf0gqww8ye7ua9lkl")
                )
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.remove(ledger_storage.connection, tx2, true);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 0);

        await transaction_pool.add(ledger_storage.connection, tx2);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 1);
    });
});
