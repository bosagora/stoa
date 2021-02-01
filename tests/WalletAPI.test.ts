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
import { TestAgora, TestStoa, sample_data, sample_data2, delay } from './Utils';

import * as assert from 'assert';
import axios from 'axios';
import URI from 'urijs';
import { URL } from 'url';

describe ('Test of Stoa API for the wallet', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = axios.create();

    before('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    before ('Start a fake Agora', () =>
    {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
    });

    after ('Stop Stoa and Agora server instances', async () =>
    {
        await stoa_server.stop();
        await agora_server.stop();
    });

    it ('Store blocks', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        for (let idx = 0; idx < 10; idx++)
            await client.post(url, {block: recovery_sample_data[idx]});
        await delay(300);
    });

    it ('Test of the path /wallet/transactions/history', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 9);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
        assert.strictEqual(response.data[0].peer,
            "GDO22PFYWMU3YFLKDYP2PVM4PLX2D4BLJ2IRQMIHWJHFS3TZ6ITJMGPU");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "9");
        assert.strictEqual(response.data[0].tx_hash,
            "0x66c1d883251da900aeb2e9d3fe144d729294aa18e938fc9c863de1" +
            "144281b7916c2d273b2673b024f0fb92e9552024ebbc9a9b84d67713" +
            "0b7d9f2325294c5542");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].unlock_height, "10");
    });

    it ('Test of the path /wallet/transaction/overview', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0x3539266bf1a7c5861fccc820c321246adebb298b099b3daf451e6834f4969993566a2db3fe303fc4a21e8cced7972b73a04c2e570deb92ae09de3e0cc356710f")

        let response = await client.get (uri.toString());
        let expected = {
            height: '9',
            time: 1601553600,
            tx_hash: '0x3539266bf1a7c5861fccc820c321246adebb298b099b3daf451e6834f4969993566a2db3fe303fc4a21e8cced7972b73a04c2e570deb92ae09de3e0cc356710f',
            tx_type: "payment",
            unlock_height: '10',
            unlock_time: 1601554200,
            payload: '',
            senders: [
                {
                    address: 'GDI22L72RGWY3BEFK2VUBWMJMSZU5SQNCQLN5FCF467RFIYN5KMY3YJT',
                    amount: 610000000000000,
                    utxo: '0x2db37bdb6df8ed5a73904357ee027094008c9b51602abb24001610f2c597557321798912c5f6a17767098ab52ac204e6cbfe1243e2ef6b7e34283e5b19611b24'
                }
            ],
            receivers: [
                {
                    address: 'GDA225RGC4GOCVASSAMROSWJSGNOZX2IGPXZG52ESDSKQW2VN6UJFKWI',
                    amount: 610000000000000,
                    utxo: '0xf4c83ab3b16723e69a9f870a39e455f497b1f0e4303cfa44910cbed466985bd0c16045db7e89a1576491b863770d28f69fb378a047e6559e71d68e7feacf505b'
                }
            ],
            fee: '0'
        };
        assert.deepStrictEqual(expected, response.data);
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Wrong TransactionType', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "in,out");

        let error_message;
        try
        {
            await client.get (uri.toString())
        }
        catch (error)
        {
            error_message = error.response.data;
        }
        assert.strictEqual(error_message, "Invalid transaction type: in,out");
    });

    it ('Test of the path /wallet/transactions/history - Filtering - TransactionType', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 4);
        assert.strictEqual(response.data[0].display_tx_type, "outbound");
        assert.strictEqual(response.data[0].address,
            "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
        assert.strictEqual(response.data[0].peer,
            "GDO22PFYWMU3YFLKDYP2PVM4PLX2D4BLJ2IRQMIHWJHFS3TZ6ITJMGPU");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "8");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "-610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0x4f0a679dd322ff5f4dc8264a324ea3ad2d43ef4a6ee6dec8d72c119" +
            "7b8c86da2ab239cbcf01b4ae47753c56d4db20926191cf157b8a5e80b" +
            "70e7e3644f04b6d6");
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Date', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("beginDate", "1596753600")
            .setSearch("endDate", "1596753600");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
        assert.strictEqual(response.data[0].peer,
            "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0x873978e0f0ea161562436c42370ab95b801e18981a3122806d58625" +
            "f7266fee5ff74483ecf05bbcfc3bf4a2c91e46b2ae87696d0d5bce437" +
            "540fef84d231710d");
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Peer', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("peer", "GCOQEOHAU");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
        assert.strictEqual(response.data[0].peer,
            "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0x873978e0f0ea161562436c42370ab95b801e18981a3122806d58625" +
            "f7266fee5ff74483ecf05bbcfc3bf4a2c91e46b2ae87696d0d5bce437" +
            "540fef84d231710d");
    });
});

describe ('Test of Stoa API for the wallet with `sample_data`', () => {
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = axios.create();

    before('Wait for the package libsodium to finish loading', async () => {
        await SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
    });

    after('Stop Stoa and Agora server instances', () => {
        return stoa_server.stop().then(() => {
            return agora_server.stop()
        });
    });

    it('Store blocks', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();

        await client.post(url, {block: sample_data[0]});
        await client.post(url, {block: sample_data[1]});
        await client.post(url, {block: sample_data2});
        await delay(100);
    });

    it('Test of the path /wallet/transaction/overview with payload', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0xd9d1782b6c14aa1bac399f149ecdae6a366baf8269cf24737f2732a4e1fda044331ba2d8fdb53d735dbb758074e07fbc4aaf063c418d79d6eb478d7f04a8d730")

        let response = await client.get(uri.toString());
        let expected = {
            height: '2',
            time: 1597353600,
            tx_hash: '0xd9d1782b6c14aa1bac399f149ecdae6a366baf8269cf24737f2732a4e1fda044331ba2d8fdb53d735dbb758074e07fbc4aaf063c418d79d6eb478d7f04a8d730',
            tx_type: 'payment',
            unlock_height: '3',
            unlock_time: 1597354200,
            payload: '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
            senders: [
                {
                    address: 'GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ',
                    amount: 24400000000000,
                    utxo: '0x1043966f59e323f9455575f4aab47c446c05a8fd375a38c8b69222ad25b83fbdf9904f676ab697e0d088c6b28c342a5b47ced960bbad76fcc5eeb46f4b3ce3f2'
                }
            ],
            receivers: [
                {
                    address: 'GCOMMONBGUXXP4RFCYGEF74JDJVPUW2GUENGTKKJECDNO6AGO32CUWGU',
                    amount: 1663400000,
                    utxo: '0x4110b79cd8e9b6cfd4965d3c1b15f9ed4f963b553953c44b87def1b4f78d70932e083c912a2f76312991f806e6aa0d05d882de44f4f32c254aff9cbcc932e2b5'
                },
                {
                    address: 'GDID227ETHPOMLRLIHVDJSNSJVLDS4D4ANYOUHXPMG2WWEZN5JO473ZO',
                    amount: 24398336600000,
                    utxo: '0xdfaeba8d80583573732fc627836b89dd049dc7fdb9622c4669d64b7247da5a0bc3e67f628a08df5e4abad90be255466d21b6c208f6ec1f58d289c1d1908a4f80'
                }
            ],
            fee: '0'
        };

        assert.deepStrictEqual(expected, response.data);
    });
});
