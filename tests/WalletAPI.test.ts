/*******************************************************************************

    Test Wallet API of Server Stoa

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { SodiumHelper } from 'boa-sdk-ts';
import { recovery_sample_data } from './RecoveryData.test';
import { TestAgora, TestStoa } from './Utils';

import * as assert from 'assert';
import axios from 'axios';
import URI from 'urijs';
import { URL } from 'url';

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = axios.create();

    before('Wait for the package libsodium to finish loading', () =>
    {
        return SodiumHelper.init();
    });

    before ('Start a fake Agora', () =>
    {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        return stoa_server.createStorage();
    });

    before ('Start TestStoa', () =>
    {
        return stoa_server.start();
    });

    after ('Stop Stoa and Agora server instances', () =>
    {
        return stoa_server.stop().then(() => { return agora_server.stop() });
    });

    it ('Store blocks', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        for (let elem of recovery_sample_data)
            await client.post(url, {block: elem});
    });

    it ('Test of the path /wallet/transactions/history', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD,GDA225RGC4GOCVASSAMROSWJSGNOZX2IGPXZG52ESDSKQW2VN6UJFKWI")
            .setSearch("pageSize", "10")
            .setSearch("page", "1");

        client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 10);
                assert.strictEqual(response.data[0].address,
                    "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
                assert.strictEqual(response.data[0].height, "9");
                assert.strictEqual(response.data[0].tx_hash,
                    "0xc7ac3e24aa7d0df99a0fb1fd95c8d8a1fd6a90b17f6ded45210df8" +
                    "8fec0e4e09b45987d15ea18b1a00c6830354c8a49cce11c33fb5719b" +
                    "1234c60137d33a2ce4");
                assert.strictEqual(response.data[0].type, 0);
                assert.strictEqual(response.data[0].amount, "610000000000000");
                assert.strictEqual(response.data[0].unlock_height, "10");
            })
            .finally(doneIt);
    });

    it ('Test of the path /wallet/transaction/overview', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0x6f2e7b2cb25a2146970e6e495ba1cec378a90acdc7817804dd9f41e1ba34a6c55fad4b24395d2da4f6a8d14a4fb2cfbc1cdbb486acda8094e0ab936d56e031c5")

        client.get (uri.toString())
            .then((response) => {
                let expected = {
                    height: '9',
                    time: 1577842200000,
                    tx_hash: '0x6f2e7b2cb25a2146970e6e495ba1cec378a90acdc7817804dd9f41e1ba34a6c55fad4b24395d2da4f6a8d14a4fb2cfbc1cdbb486acda8094e0ab936d56e031c5',
                    type: 0,
                    unlock_height: '10',
                    unlock_time: 1577842800000,
                    senders: [
                        {
                            address: 'GDI22L72RGWY3BEFK2VUBWMJMSZU5SQNCQLN5FCF467RFIYN5KMY3YJT',
                            amount: 610000000000000
                        }
                    ],
                    receivers: [
                        {
                            address: 'GDA225RGC4GOCVASSAMROSWJSGNOZX2IGPXZG52ESDSKQW2VN6UJFKWI',
                            amount: 610000000000000
                        }
                    ],
                    fee: '0'
                };
                assert.deepStrictEqual(expected, response.data);
            })
            .finally(doneIt);
    });
});
