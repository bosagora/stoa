/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import * as assert from 'assert';
import Stoa from '../src/Stoa';
import express from "express";
import axios from "axios";
import * as http from "http";
import URI from "urijs";
import {sample_data} from "./SampleData.test";

/**
 * This is an API server for testing and inherited from Stoa.
 * The test code allows the API server to be started and shut down.
 */
class TestStoa extends Stoa
{
    public server: http.Server;

    constructor (file_name: string, port: string, done: () => void)
    {
        super(file_name);

        // Shut down
        this.stoa.get("/stop", (req: express.Request, res: express.Response) =>
        {
            res.send("The test server is stopped.");
            this.server.close();
        });

        // Start to listen
        this.server = this.stoa.listen(port, () =>
        {
            done();
        });
    }
}

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let client = axios.create();

    before ('Start Stoa API Server', (doneIt: () => void) =>
    {
        new TestStoa(":memory:", port, doneIt);
    });

    after ('Stop Stoa API Server', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("stop");

        client.get(uri.toString())
            .finally(doneIt);
    });

    it ('Test of the path /block_externalized', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        assert.doesNotThrow(async () =>
        {
            await client.post(url, {block: sample_data[0]});
            await client.post(url, {block: sample_data[1]});
            doneIt();
        });
    });

    it ('Test of the path /validators', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "10");

        client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 3);
                assert.strictEqual(response.data[0].address,
                    "GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN");
                assert.strictEqual(response.data[0].preimage.distance, 10);
            })
            .catch((error) =>
            {
                assert.ok(!error, error);
            })
            .finally(doneIt);
    });

    it ('Test of the path /validator', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("GBJABNUCDJCIL5YJQMB5OZ7VCFPKYLMTUXM2ZKQJACT7PXL7EVOMEKNZ")
            .setSearch("height", "10");

        client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 1);
                assert.strictEqual(response.data[0].address,
                    "GBJABNUCDJCIL5YJQMB5OZ7VCFPKYLMTUXM2ZKQJACT7PXL7EVOMEKNZ");
                assert.strictEqual(response.data[0].preimage.distance, 10);
            })
            .catch((error) =>
            {
                assert.ok(!error, error);
            })
            .finally(doneIt);
    });
});
