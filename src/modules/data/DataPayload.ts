/*******************************************************************************

    The class that defines the transaction data payload.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Utils, Endian } from '../utils/Utils';

import { SmartBuffer } from 'smart-buffer';
import { Validator, IDataPayload } from "./validator";

/**
 * The class that defines the transaction data payload.
 */
export class DataPayload
{
    /**
     * The data payload to store
     */
    public data: Buffer;

    /**
     * Constructor
     * @param data      The data payload to store
     * @param endian    The byte order
     */
    constructor (data: Buffer | string, endian: Endian = Endian.Big)
    {
        if (typeof data === 'string')
            this.data = Utils.readFromString(data);
        else
            this.data = this.fromBinary(data, endian).data;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `DataPayload` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key !== "")
            return value;

        Validator.isValidOtherwiseThrow<IDataPayload>('DataPayload', value);

        return new DataPayload(value);
    }

    /**
     * Reads from the hex string
     * @param hex The hex string
     * @returns The instance of DataPayload
     */
    public fromString (hex: string): DataPayload
    {
        this.data = Utils.readFromString(hex);
        return this;
    }

    /**
     * Writes to the hex string
     * @returns The hex string
     */
    public toString (): string
    {
        return Utils.writeToString(this.data);
    }

    /**
     * Set binary data
     * @param bin       The binary data of the data payload
     * @param endian    The byte order
     * @returns The instance of DataPayload
     */
    public fromBinary (bin: Buffer, endian: Endian = Endian.Big): DataPayload
    {
        this.data = Buffer.from(bin);
        if (endian === Endian.Little)
            this.data.reverse();

        return this;
    }

    /**
     * Get binary data
     * @param endian The byte order
     * @returns The binary data of the data payload
     */
    public toBinary (endian: Endian = Endian.Big): Buffer
    {
        if (endian === Endian.Little)
            return Buffer.from(this.data).reverse();
        else
            return this.data;
    }

    /**
     * Collects data to create a data payload.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeBuffer(this.data)
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON (key?: string): string
    {
        return this.toString();
    }

    /**
     * The data payload consisting of zero values for all bytes.
     * @returns The instance of DataPayload
     */
    static get init(): DataPayload
    {
        return new DataPayload(Buffer.alloc(0));
    }
}
