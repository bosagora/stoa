/*******************************************************************************

    Contains the type of data provided by the Stoa API

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import { Height, TxType } from 'boa-sdk-ts';

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
     * The transaction type of wallet ('inbound', 'outbound', 'freeze', 'payload')
     */
    display_tx_type: string;

    /**
     * Address, Public key
     */
    address: string;

    /**
     * The address that sent (or received) the funds
     */
    peer: string;

    /**
     * The number of the peer
     */
    peer_count: number;

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
    tx_type: string;

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


/**
 * Define the types of transactions to be displayed in various applications
 */
export enum DisplayTxType
{
    Inbound = 0,
    Outbound = 1,
    Freeze = 2,
    Payload = 3
}

/**
 * Class that converts various enum values into strings
 */
export class ConvertTypes
{
    static tx_types: Array<string> = ["payment", "freeze"];
    static display_tx_type: Array<string> = ["inbound", "outbound", "freeze", "payload"];

    public static DisplayTxTypeToString (type: TxType): string
    {
        if (type < ConvertTypes.display_tx_type.length)
            return ConvertTypes.display_tx_type[type];
        else
            return "";
    }

    public static TxTypeToString (type: TxType): string
    {
        if (type < ConvertTypes.tx_types.length)
            return ConvertTypes.tx_types[type];
        else
            return "";
    }
}
