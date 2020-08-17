/*******************************************************************************

    The class that defines the BitField of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IBitField } from "./validator";
import { SmartBuffer } from "smart-buffer";
import { NumberWriter } from "../utils/NumberWriter";

/**
 * The class that defines the BitField of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property are not present.
 */
export class BitField
{
    /**
     * The storage with bit data
     */
    public _storage: number[];

    /**
     * Constructor
     * @param storage - The source storage with bit data
     */
    constructor (storage?: number[])
    {
        if (storage !== undefined)
            this._storage = storage;
        else
            this._storage = [];
    }

    /**
     * This parses JSON.
     * @param json - The JSON data
     * @returns The instance of BitField
     */
    public parseJSON (json: any): BitField
    {
        Validator.isValidOtherwiseThrow<IBitField>('BitField', json);

        this._storage = json._storage.slice();

        return this;
    }

    /**
     * Serialize as binary data.
     * @param buffer - The buffer where serialized data is stored
     */
    public serialize (buffer: SmartBuffer)
    {
        NumberWriter.serialize(this._storage.length, buffer);
        for (let elem of this._storage)
            NumberWriter.serialize(elem, buffer);
    }

    /**
     * Deserialize as binary data.
     * @param buffer - The buffer to be deserialized
     */
    public deserialize (buffer: SmartBuffer)
    {
        let length = NumberWriter.deserialize(buffer);
        for (let idx = 0; idx < length; idx++)
        {
            let elem = NumberWriter.deserialize(buffer);
            this._storage.push(elem);
        }
    }
}
