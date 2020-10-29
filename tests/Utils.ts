/*******************************************************************************

    Utilities and sample data that can be used within the test suitea

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { recovery_sample_data } from './RecoveryData.test';

import express from 'express';
import * as http from 'http';

export const sample_data_raw =
    [
        '{"header":{"prev_block":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","height":"0","merkle_root":"0xc650b573ab70777363924a0eb2c84cbc76005ba8083c5c77dd57a09f4b6e14f98136ba0d84661109d0b7619877b814cf950cd7fe7b14eaa46bef254352791951","validators":{"_storage":[2818572288,2818572288]},"signature":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","enrollments":[{"utxo_key":"0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a","random_seed":"0xfb05e20321ae11b2f799a71a736fd172c5dec39540f53d6213cd1b7522898c8bfb86445c6b6db9437899f5917bb5f9c9be7358ba0ecaa37675692f7d08766950","cycle_length":1008,"enroll_sig":"0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd"},{"utxo_key":"0x86f1a6dff3b1f2256d2417b71ecc5511293b224894da5fd75c192965aa1874824ca777ecac678c871e717ad38c295046f4f64130f31750aa967c30c35529944a","random_seed":"0x6fca4361542993ef7e349f5d2a8eb1461281efd0f968904a8e76ea4729f36d32a7d018ef3362b4c92968574c794d502e96896a475fbe32410b415132f06a719b","cycle_length":1008,"enroll_sig":"0x0a9d030f7316b90264f7c9c3869a84c2cdd87030122bb7025dd1ee149514529fee604d00c47d6ef2fe8da4e85f3207589f27887d0cb4e4f098839e2db1396705"},{"utxo_key":"0xf21f606e96d6130b02a807655fda22c8888111f2045c0d45eda9c26d3c97741ca32fc68960ae68220809843d92671083e32395a848203380e5dfd46e4b0261f0","random_seed":"0x92c1fda566bb85faa06201dc06484a0e43a7ba1ac42b0c08b236fc4537420d2a3b4f569d8b6cddc08e5ffc1b4da6751d121de27ab52598906a1a521c3a12ec81","cycle_length":1008,"enroll_sig":"0x06d66ac87b2ae6265f0c91d1e6bd9b9095a0b68206669593938fe785456600fa2a2226f5b8e906075d36a2202dc95da48d50cc141646d4d8a0609a072774981c"}]},"txs":[{"type":1,"inputs":[],"outputs":[{"value":"400000000000","address":"GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN"}]},{"type":0,"inputs":[],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"},{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"},{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"},{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"},{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"},{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"},{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"},{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":1,"inputs":[],"outputs":[{"value":"400000000000","address":"GBUVRIIBMHKC4PE6BK7MO2O26U2NJLW4WGGWKLAVLAA2DLFZTBHHKOEK"}]},{"type":1,"inputs":[],"outputs":[{"value":"400000000000","address":"GBJABNUCDJCIL5YJQMB5OZ7VCFPKYLMTUXM2ZKQJACT7PXL7EVOMEKNZ"}]}],"merkle_tree":["0x3a245017fee266f2aeacaa0ca11171b5825d34814bf1e33fae76cca50751e5cfb010896f009971a8748a1d3720e33404f5a999ae224b54f5d5c1ffa345c046f7","0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","0xaf8aa53dbce1c75fba4559f8a67c93963e739b40d0da6424918804756b85c10a84d3c3f6625841cfb7fa530c10cf425d21682376a28a6847f86eed0e3b5af78b","0xf75ba97650c9a74e9db66a23e985ccd2bced6740c2bebc0d1684171677ee09fe5fce1ed29c1f033a33777ac6d03814b008d8b710a637da7aadc3a107c0075415","0x3518d6be6bff91110c3d146ad19b75e3c06e242c69578a89ee9cf80e924105859899aaa17fc47ace85fe0a298862c42577c0523f72377f5ac83d63c9eee9936d","0xfd8f15a343839b73ab7582ae3414f9386f076eb6fb75aa1710777705263cd82a389facc3f7190df1b5f9596edee33e0b008b443c4ec2fb2f08a67853890cd31e","0xc650b573ab70777363924a0eb2c84cbc76005ba8083c5c77dd57a09f4b6e14f98136ba0d84661109d0b7619877b814cf950cd7fe7b14eaa46bef254352791951"]}',
        '{"header":{"prev_block":"0xa104f83d40950d35589ce608cbf0b0b77b21bd70c5ee2b893dfa6b6fdc76bd191be7b64ce7e54179f4c243e6a3741bfd3e63cb455a1cc297d0b3c44885e7db98","height":"1","merkle_root":"0x9c4a20550ac796274f64e93872466ebb551ba2cd3f2f051533d07a478d2402b59e5b0f0a2a14e818b88007ec61d4a82dc9128851f43799d6c1dc0609fca1537d","validators":{"_storage":[2818572288,2818572288]},"signature":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","enrollments":[]},"txs":[{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":3,"signature":"0x00a1b90169fe072565f3c1501ff287943096b93c7146deddddd2cab445bd059dc86053e7fa93f8a087ada332b712a6a09b0467d815e288cedd052f4ce0b3d70c"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":1,"signature":"0x07557ce0845a7ccbba61643b95e310bd3ae06c41fab9e8761ff3b0e5d28a5d625a3b951223c618910b239e7b779c6c671252a78edff4d0f37bdb25982e4f4228"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":4,"signature":"0x09d737bd2ebb32acb8a793e198acbbd98e4dc1f3377d6158c0b036cd83f3de9e6682a04fb8ff2e382068e53f72da5c195dbd88088f76e7eb753a61fe8ee9334d"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":0,"signature":"0x0f41467bd7ed96c6b9eaf4548bdcf916a5c07e0d30e4b9118103a1559dca6d0ea7eb1eedd782eca9e66d6f41f5687ee35d4768928d2c3af7d30504ed6b986102"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":7,"signature":"0x05b1abe698aad52e85c4ecfeb31422ca7a68b58df3d7c24138335c26a632dc874f81af1adada34d1ebfed6acaf0763bd54b0559b18cef1967c87e65c7de0e168"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":5,"signature":"0x0c7e20cfb023134739d6bfb6a94afb98b6cd503a83bcf8adeac8d8a500079d038db6bb38761fbe962bda10ed1cc82989eac532b9200a2546adebbf2aa1ebb7b3"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":2,"signature":"0x0f978d92ebc40faf7f57a9093cd16af5ea49621643d00d22c071ae507abfd60719b4779f334413a5e22961b55cc7ae8afb115a4d4ef60f2ca7c6d6d46b364330"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]},{"type":0,"inputs":[{"previous":"0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73","index":6,"signature":"0x0547785e2354d31ef36e3d5e0feb77341879b14706403bacd86a10686eb44723ff93d773caacc102297309ff552a83e177df742df7bf5238b33845823f416033"}],"outputs":[{"value":"625000000000000","address":"GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"}]}],"merkle_tree":["0x2ad0e66d590b173611fb733a25b4d2ff2b425da9e274f8486deaa8eeaff513b17d8ddcd840f70a4c551ea63db7a9de765e051f484e205613a0e41b5531440ad0","0x2c510aaf08a9da1cb0053214a7b3a0f9412d34eb5116ca81a2990e4b61bc3f4adcce2eb36d4e6c483f1bc654607ce96f5f7caf8a58c8a78bc70a8b2da7c25013","0x3d42001e86eb29e41865f6772bc5cfd9688d104f8eb0d9f17269541c212451076a25e14e9e638dce6ce3f1fcb44cfa20cada4a6b5b2c07844f35889ca44ebec7","0x6573c3cbd0a5afe60e42432790448adf2b9a242b3393a3019b5004562e64d705675bb632ebf0108716299ea9ccbe2029e653eff0456330b8d3bc042d3c8aa5da","0x89ab2ca7add018bee036168c13ced1afa1fc66ba164f4f8bbc01ab89aaf701c9e6fa427c2bb519307907d31ea2e5860bd31a265fdca0f68b633c1a3340584813","0xaf60bc9cd1ef5efae6dca87e35626748093019268dc6d7059d0891ce685ee6b1007c83e2b2d8c6326d039f5118789693667b25ac1452729e2c28442e77af5fd8","0xd9ee67e43efeedad6d57aa30c5a357f7393972dc34b0ab1e975742c1673341455165ac6ddfe7343304ec863208c6bfa6cbbbc2bb62f93dfbabc422452ddad96f","0xf1c2bf8ede3a4ae4fd25288a53a45907ec018054cc156c2251e1860924e085f5fc0b46b1a9e90a2954a6c93674e2b8673d3ec008bb434ba9119583fbb56a885c","0xd53965f0b1138bae1784106257fec91fb71c521afb8d304d2315350caf25f534e574a006c5dcf4fa2b0726edc43ce6c8f559ba51a9e6d39cdb67d303d4899efd","0x50719e87d4f08c339e26c0c55ab92677df047cdb0950d8ab3135b8fd618b3c2ba4690ef019c5442fd82d84200c71441a3d14d6fbb290d18d33926c17075ee62e","0xcf097be8bdbb562e7c5ea00e5cc6ca2151e3c807ea2d566abe191ff8e81acfd491187a975aa7ee5b568f840a46a669aeb061999d294c47944256424f1a4c5d10","0x1662d6a3901f03096c664016b6869586ee4bdcfb9268b70c4ba0c2c4837a9e2af81415744234bb1feaff2f63aea7ab18f77834b743267523257155c7fe191ff7","0x1d5a065bf2fccf78bdaa4456e96fbf0dd697ba2d6822d64a4266e862ac9e96f59e12b5234c66ec2a0e9c15a129503ffd61769d5f04b10b9c702e5d77ef6206a7","0x54522e3402cbb17e39dae09e4aa0cc42c495a6332d1ff8ef3c22b83104720a06d9ffba4c68c959f48b4bb4a3bd8a68f34f77f760ed284d31b45d77b2ce639dd8","0x9c4a20550ac796274f64e93872466ebb551ba2cd3f2f051533d07a478d2402b59e5b0f0a2a14e818b88007ec61d4a82dc9128851f43799d6c1dc0609fca1537d"]}'
    ];

export const sample_data =
    (() => {
        let record = [];
        for (let elem of sample_data_raw)
            record.push(JSON.parse(elem));
        return record;
    })();

export const sample_preImageInfo =
    {
        "enroll_key": "0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a",
        "hash": "0x4869b90d82af612dac15b6f152700b2e0f0b4a198fa09d83853d4ac3be4032b051c48806692b37776534f2ae7b404c9221ae1c9616fe50e3585d63e607d0afc6",
        "distance": 6
    };

export const sample_reEnroll_preImageInfo =
    {
        "enroll_key": "0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a",
        "hash": "0x25677ee5a05590d68276d1967cbe37e3cf3e731502afd043fafc82b0181cd120cef6272e5aea2dafaca0236a4ce7c1edd4fe21ae770930a8e206bd7080066a4c",
        "distance": 6
    };

/**
 * This is an Agora node for testing.
 * The test code allows the Agora node to be started and shut down.
 */
export class TestAgora
{
    public server: http.Server;

    public agora: express.Application;

    // Add latency to induce new blocks to arrive during write of the previous block.
    public delay: number = 0;

    constructor (port: string, done: () => void)
    {
        this.agora = express();

        this.agora.get("/blocks_from",
            (req: express.Request, res: express.Response) =>
        {
            if  (
                    (req.query.block_height === undefined) ||
                    (req.query.max_blocks === undefined) ||
                    Number.isNaN(req.query.block_height) ||
                    Number.isNaN(req.query.max_blocks)
                )
            {
                res.status(200).send(JSON.stringify([]));
                return;
            }

            let block_height = Math.max(Number(req.query.block_height), 0);
            let max_blocks = Math.max(Number(req.query.max_blocks), 0);

            block_height = Math.min(block_height, recovery_sample_data.length - 1);
            max_blocks = Math.min(max_blocks, 1000);

            let data = recovery_sample_data.slice(
                block_height,
                Math.min(block_height + max_blocks, recovery_sample_data.length)
            );

            if (this.delay > 0)
            {
                setTimeout(() =>
                {
                    res.status(200).send(JSON.stringify(data));
                }, this.delay);
            }
            else
            {
                res.status(200).send(JSON.stringify(data));
            }
        });

        // Shut down
        this.agora.get("/stop",
            (req: express.Request, res: express.Response) =>
        {
            res.send("The test server is stopped.");
            this.server.close();
        });

        // Start to listen
        this.server = this.agora.listen(port, () =>
        {
            done();
        });
    }

    public stop (callback?: (err?: Error) => void)
    {
        this.server.close(callback);
    }
}
