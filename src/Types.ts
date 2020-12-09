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

/**
 * The interface of the transactions history element
 */
export interface ITxHistoryElement
{
    /**
     * Address, Public key
     */
    address: string;

    /**
     * Block height
     */
    height: string;

    /**
     * Transaction time
     */
    time: number;

    /**
     * Transaction hash
     */
    tx_hash: string;

    /**
     * Transaction type
     */
    type: number;

    /**
     * Amount
     */
    amount: string;

    /**
     * Block height at which the output of the transaction becomes available
     */
    unlock_height: string;

    /**
     * Time at which the output of the transaction becomes available
     */
    unlock_time: number;
}

/**
 * The interface of the transaction overview
 */
export interface ITxOverview
{
    /**
     * Block height
     */
    height: string;

    /**
     * Transaction time
     */
    time: number;

    /**
     * Transaction hash
     */
    tx_hash: string;

    /**
     * Transaction type
     */
    type: number;

    /**
     * Block height at which the output of the transaction becomes available
     */
    unlock_height: string;

    /**
     * Time at which the output of the transaction becomes available
     */
    unlock_time: number;

    /**
     * The address and amount of the output associated with the transaction input
     */
    senders: Array<ITxOverviewElement>;

    /**
     * The address and amount of transaction output
     */
    receivers: Array<ITxOverviewElement>;

    /**
     * Transaction fee
     */
    fee: string;
}

/**
 * The interface of the transaction overview element
 */
export interface ITxOverviewElement
{
    /**
     * Address, Public key
     */
    address: string;

    /**
     * Amount
     */
    amount: string;
}
