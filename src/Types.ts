/*******************************************************************************

    Contains the type of data provided by the Stoa API

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import { Height } from 'boa-sdk-ts';

/**
 * The interface of the Validator
 */
export interface IValidator
{
    address: string;
    enrolled_at: Height;
    stake: string;
    preimage?: IPreimage;
}

/**
 * The interface of the Preimage
 */
export interface IPreimage
{
    distance?: number;
    hash?: string;
}

/**
 * The class of the Validator data
 */
export class ValidatorData implements IValidator
{
    address: string;
    enrolled_at: Height;
    stake: string;
    preimage: IPreimage;

    constructor(address: string, enrolled_at: Height, stake: string, preimage: IPreimage) {
        this.address = address;
        this.enrolled_at = enrolled_at;
        this.stake = stake;
        this.preimage = preimage;
    }
}

/**
 * The interface of the UTXO
 */
export interface IUnspentTxOutput
{
    utxo: string;
    type: number;
    unlock_height: string;
    amount: string;
}
