/*******************************************************************************

    The class that recovers data

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Height } from '../data/';

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import URI from 'urijs';
import { URL } from 'url';

/**
 * The class that recovers data
 */
export class AgoraClient
{
    /**
     * The network endpoint to connect to Agora
     */
    private endpoint: URL;

    /**
     * The instance of the axios
     */
    private client: AxiosInstance;

    /**
     * Constructor
     * @param endpoint - The network endpoint to connect to Agora
     */
    constructor (endpoint: URL)
    {
        this.endpoint = endpoint;
        this.client = axios.create();
        this.client.defaults.timeout = 2000;
    }

    /**
     * Requests and receives data needed for recovery from Agora.
     * @param block_height - The height of the block
     * @param max_blocks - The maximum number of block to request
     */
    public requestBlocks (block_height: Height, max_blocks: number): Promise<Array<any>>
    {
        return new Promise<Array<any>>((resolve, reject) =>
        {
            let uri = URI(this.endpoint)
                .directory("blocks_from")
                .addSearch("block_height", block_height.toString())
                .addSearch("max_blocks", max_blocks);

            this.client.get(uri.toString(), { transformResponse: (r) => r })
                .then((response: AxiosResponse) =>
                {
                    if (response.status == 200)
                    {
                        // Change the number to a string to preserve the precision of UInt64
                        let text = response.data.replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3");
                        resolve(JSON.parse(text));
                    }
                    else
                    {
                        reject(new Error(response.statusText));
                    }
                })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });
        });
    }
}

/**
 * Check if parameter `reason` is type `AxiosError`.
 * @param reason{any} This is why the error occurred
 * @returns {boolean}
 */
function isAxiosError (reason: any): reason is AxiosError
{
    return ((reason as AxiosError).isAxiosError);
}

/**
 * Check if parameter `reason` is type `Error`.
 * @param reason{any} This is why the error occurred
 * @returns {boolean}
 */
function isError (reason: any): reason is Error
{
    return ((reason as Error).message != undefined);
}

/**
 * It is a common function that handles errors that occur
 * during network communication.
 * @param reason{any} This is why the error occurred
 * @returns {Error}
 */
function handleNetworkError (reason: any): Error
{
    if (isAxiosError(reason))
    {
        let e = reason as AxiosError;
        if (e.response != undefined)
        {
            let message = "";
            if (e.response.statusText != undefined) message = e.response.statusText + ", ";
            if (e.response.data != undefined) message += e.response.data;
            return new Error(message);
        }
    }

    if (isError(reason))
    {
        return new Error((reason as Error).message);
    }
    else
    {
        return new Error("An unknown error has occurred.");
    }
}
