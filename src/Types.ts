/*******************************************************************************

    Contains the type of data provided by the Stoa API

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import { Block, Hash, Height, JSBI, OutputType, ProposalType, Transaction } from "boa-sdk-ts";

/**
 * The interface of the Validator
 */
export interface IValidator {
    address: string;
    enrolled_at: Height;
    stake: string;
    preimage?: IPreimage;
}

/**
 * The interface of the Preimage
 */
export interface IPreimage {
    height?: string;
    hash?: string;
}

/**
 * The class of the Validator data
 */
export class ValidatorData implements IValidator {
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
export interface IUnspentTxOutput {
    /**
     * Hash of unspent transaction output
     */
    utxo: string;

    /**
     * Transaction type
     */
    type: number;

    /**
     * Block height at which the output of the transaction becomes available
     */
    unlock_height: string;

    /**
     * Amount of transaction output
     */
    amount: string;

    /**
     * Block height on created
     */
    height: string;

    /**
     * Block time on created
     */
    time: number;

    /**
     * The type of lock script in transaction output
     */
    lock_type: number;

    /**
     * The bytes of lock script in transaction output
     */
    lock_bytes: string;
}

/**
 * The interface of the transactions history element
 */
export interface ITxHistoryElement {
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
 * The interface of the statistics of BOA coin
 */
export interface IBOAStats {
    /**
     * Latest height of block
     */
    height: number;

    /**
     * Total no. of transactions
     */
    transactions: number;

    /**
     * Total no. of validators
     */
    validators: number;

    /**
     * Total no. of frozen coins
     */
    frozen_coin: number;

    /**
     * Total no. of active validators
     */
    active_validators: number;

    /**
     * Circulating supply
     */
    circulating_supply: number;
}

/**
 * The interface of the block overview
 */
export interface IBlockOverview {
    /**
     * Block height
     */
    height: string;

    /**
     * No. of transactions
     */
    total_transactions: number;

    /**
     * Block hash
     */
    hash: string;

    /**
     * Previous block hash
     */
    prev_hash: string;

    /**
     * Merkle root
     */
    merkle_root: string;

    /**
     * Signature
     */
    signature: string;

    /**
     * Random seed
     */
    random_seed: string;

    /**
     * Transaction hash
     */
    time: number;

    /**
     * total amount sent in block
     */
    total_sent: string;

    /**
     * total received amount
     */
    total_received: string;

    /**
     * total rewards
     */
    total_reward: string;

    /**
     * total fee for the block
     */
    total_fee: string;

    /**
     * total size of the block
     */
    total_size: number;

    /**
     * Agora version
     */
    version: string;
}

/**
 * The interface of the enrolled validators of block
 */
export interface IBlockEnrollment {
    /**
     * Block height
     */
    height: string;

    /**
     * The hash of UTXO
     */
    utxo: string;

    /**
     * Random seed
     */
    commitment: string;

    /**
     * Enroll signature
     */
    enroll_sig: string;

    /**
     * Cycle length
     */
    cycle_length: number;

    /**
     * total number of records
     */
    full_count: number;
}

/**
 * The interface of the transaction elements of block
 */
export interface IBlockTransactions {
    /**
     * Transaction hash
     */
    tx_hash: string;

    /**
     * Block height
     */
    height: string;

    /**
     * Transaction amount
     */
    amount: string;

    /**
     * Transaction type
     */
    type: string;

    /**
     * Transaction fee
     */
    fee: string;

    /**
     * Transaction size
     */
    size: string;

    /**
     * Transaction time
     */
    time: string;

    /**
     * Transaction receiver
     */
    receiver: string;

    /**
     * Transaction sender address
     */
    sender_address: string;

    /**
     * total number of records
     */
    full_count: number;
}

/**
 * The interface of the transaction overview
 */
export interface ITxOverview {
    /**
     * Transaction status
     */
    status: string;

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
     * Transaction type
     */
    tx_size: number;

    /**
     * Block height at which the output of the transaction becomes available
     */
    unlock_height: string;

    /**
     * Transaction lock height
     */
    lock_height: string;

    /**
     * Time at which the output of the transaction becomes available
     */
    unlock_time: number;

    /**
     * The transaction data payload
     */
    payload: string;

    /**
     * The address and amount of the output associated with the transaction input
     */
    senders: ITxOverviewInputElement[];

    /**
     * The address and amount of transaction output
     */
    receivers: ITxOverviewOutputElement[];

    /**
     * Transaction fee
     */
    fee: string;
}

/**
 * The interface of the transaction overview output element
 */
export interface ITxOverviewOutputElement {
    /**
     * Output type
     */
    type: number;

    /**
     * Address, Public key
     */
    address: string;

    /**
     * Lock type
     */
    lock_type: number;

    /**
     * Lock type
     */
    index: number;

    /**
     * Lock bytes
     */
    bytes: string;

    /**
     * The hash of UTXO
     */
    utxo: string;

    /**
     * Amount
     */
    amount: string;
}

/**
 * The interface of the transaction overview input element
 */
export interface ITxOverviewInputElement {
    /**
     * Address, Public key
     */
    address: string;

    /**
     * Amount
     */
    amount: number;

    /**
     * The hash of UTXO
     */
    utxo: string;

    /**
     * Signature of block
     */
    signature: string;

    /**
     * Input index
     */
    index: number;

    /**
     * Unlock age
     */
    unlock_age: number;

    /**
     * Unlock bytes
     */
    bytes: string;
}

/**
 * The interface of the pending transactions
 */
export interface IPendingTxs {
    tx_hash: string;
    submission_time: number;
    address: string;
    amount: string;
    fee: string;
    block_delay: number;
    peer_count: number;
}

/**
 * The interface of the transaction status
 */
export interface ITxStatus {
    /**
     * The status of the transaction ("pending", "confirmed", "not found")
     */
    status: string;

    /**
     * The hash of the transaction
     */
    tx_hash: string;

    /**
     * The information of the block
     */
    block?: {
        /**
         * The height of the block
         */
        height?: number;

        /**
         * The hash of the block
         */
        hash?: string;
    };
}

/**
 * Define the types of transactions to be displayed in various applications
 */
export enum DisplayTxType {
    Inbound = 0,
    Outbound = 1,
    Freeze = 2,
    Payload = 3,
}

/**
 * Class that converts various enum values into strings
 */
export class ConvertTypes {
    static tx_types: string[] = ["payment", "freeze"];
    static proposal_types: string[] = ["system", "fund"];
    static display_tx_type: string[] = ["inbound", "outbound", "freeze", "payload"];

    public static DisplayTxTypeToString(type: OutputType): string {
        if (type < ConvertTypes.display_tx_type.length) return ConvertTypes.display_tx_type[type];
        else return "";
    }

    public static TxTypeToString(type: OutputType): string {
        if (type < ConvertTypes.tx_types.length) return ConvertTypes.tx_types[type];
        else return "";
    }

    public static toDisplayTxType(type: string): DisplayTxType {
        return ConvertTypes.display_tx_type.findIndex((m) => m === type.trim().toLowerCase());
    }
    public static ProposalTypetoString(type: ProposalType): string {
        if (type < ConvertTypes.proposal_types.length) return ConvertTypes.proposal_types[type];
        else return "";
    }
}

/**
 * Define the interface of the fee of the transaction
 */
export interface ITransactionFee {
    /**
     * The size of the transaction
     */
    tx_size: number;

    /**
     * The transaction fee for a medium speed
     */
    medium: string;

    /**
     * The transaction fee for a high speed
     */
    high: string;

    /**
     * The transaction fee for a low speed
     */
    low: string;
}

/**
 * The interface of the SPV status
 */
export interface ISPVStatus {
    /**
     * True or false
     */
    result: boolean;

    /**
     * The message
     */
    message: string;
}
/**
 * The interface of block
 */

export interface IBlock {
    /**
     * block height
     */
    height: string;

    /**
     * hash of block
     */
    hash: string;

    /**
     * merkle root of block
     */
    merkle_root: string;

    /**
     * validators of block
     */
    validators: string;

    /**
     * signature of block
     */
    signature: string;

    /**
     * no of transactions in the block
     */
    tx_count: number;

    /**
     * enrollment counts in that block
     */
    enrollment_count: string;

    /**
     * timestamp of the block
     */
    time_stamp: string;

    /**
     * total number of records
     */
    full_count: number;
}

/**
 * The interface of transaction
 */

export interface ITransaction {
    /**
     * Block height
     */
    height: string;

    /**
     * Hash of the transaction
     */
    tx_hash: string;

    /**
     * Type of the transaction
     */
    type: string;

    /**
     * amount of transaction
     */
    amount: string;

    /**
     * transaction fee
     */
    tx_fee: string;

    /**
     * size of the transaction
     */
    tx_size: string;

    /**
     * timestamp of the transaction
     */
    time_stamp: string;

    /**
     * total number of records
     */
    full_count: number;
}

/**
 * Interface for BOAScan pagination
 */

export interface IPagination {
    /**
     * page size
     */
    pageSize: number;

    /**
     * page number
     */
    page: number;
}

/**
 * Interface for MarketCap
 */

export interface IMarketCap {
    /**
     * Price of BOA in usd
     */
    price: number;

    /**
     * market cap of BOA
     */
    market_cap: number;

    /**
     * Change percentage in 24h
     */
    change_24h?: number;

    /**
     * 24 hour volume
     */
    vol_24h: number;

    /**
     * Last updated time
     */
    last_updated_at: number;
}

/**
 * Interface for BOA Market Chart
 */
export interface IMarketChart {
    /**
     * Price of BOA in usd
     */
    usd_price: number;

    /**
     * Time
     */
    last_updated_at: number;
}

/**
 * Interface for Account Information
 */
export interface IAccountInformation {
    /**
     * Total Balance of account
     */
    total_balance: JSBI;

    /**
     * Total Spendable Balance of account
     */
    total_spendable: JSBI;

    /**
     * Total frozen amount of account
     */
    total_frozen: JSBI;

    /**
     * Tranaction count of account
     */
    tx_count: JSBI;
}

/**
 * Interface for BOA Holder API
 */
export interface IBOAHolder {
    /**
     * Address of holder
     */
    address: string;

    /**
     * Transaction count of holder
     */
    tx_count: number;

    /**
     * Total recieved amount of holder
     */
    total_received: number;

    /**
     * Total sent amount of holder
     */
    total_sent: number;

    /**
     * Total reward amount of holder
     */
    total_reward: number;

    /**
     * Total frozen amount of holder
     */
    total_frozen: number;

    /**
     * Total spendable amount of holder
     */
    total_spendable: number;

    /**
     * Total balance of holder
     */
    total_balance: number;

    /**
     * percentage of holder
     */
    percentage: number;

    /**
     * value of holder
     */
    value: number;

    /**
     * total number of accounts
     */
    full_count?: number;
}

/**
 * Interface for new Block Emit
 */
export interface IEmitBlock {
    /**
     * block height
     */
    height: string;

    /**
     * hash of block
     */
    hash: string;

    /**
     * timestamp of the block
     */
    time_stamp: number;

    block: Block;
}

/**
 * Interface for Proposal List
 */
export interface IProposalList {
    /**
     * Proposal id
     */
    proposal_id: string;

    /**
     * Title of the proposal
     */
    proposal_title: string;

    /**
     * Proposal type
     */
    proposal_type: number;

    /**
     * Proposal fund amount
     */
    fund_amount: number;

    /**
     * Proposal voting start height
     */
    vote_start_height: number;

    /**
     * Proposal voting end height
     */
    vote_end_height: number;

    /**
     * Proposal status
     */
    proposal_status: number;

    /**
     * Proposal date
     */
    proposal_date: number;

    /**
     * Proposer name 
     */
    proposer_name: string;

    /**
     * Full count
     */
    full_count: number;
}

/**
 * Interface for Proposal
 */
export interface IProposalAPI {
    /**
     * Proposal id
     */
    proposal_id: string;

    /**
     * Title of the proposal
     */
    proposal_title: string;

    /**
     * Proposal type
     */
    proposal_type: number;

    /**
     * Proposal fund amount
     */
    fund_amount: number;

    /**
     * Proposal voting start height
     */
    vote_start_height: number;

    /**
     * Proposal voting end height
     */
    vote_end_height: number;

    /**
     * Proposal status
     */
    proposal_status: number;

    /**
     * Proposal date
     */
    proposal_date: number;

    /**
     * Proposal detail
     */
    detail: string;

    /**
     * Proposal transaction hash
     */
    proposal_tx_hash: string;

    /**
     * Proposer name 
     */
    proposer_name: string;

    /**
     * Proposal fee tx hash
     */
    proposal_fee_tx_hash: string;

    /**
     * Proposal fee
     */
    proposal_fee: number;

    /**
     * Proposal start date
     */
    voting_start_date: number;

    /**
     * Proposal end date
     */
    voting_end_date: number;
}

/**
 * Interface for new Transaction Emit
 */
export interface IEmitTransaction {
    /**
     * block height
     */
    height: string;

    /**
     * hash of block
     */
    hash: string;

    /**
     * hash of transaction
     */
    tx_hash: string;

    /**
     * Time stamp of the block
     */
    time_stamp: number;

    transaction: Transaction;
}

/**
* The interface of average Fee
*/
export interface IAvgFee {
    /**
     * Height of Block
     */
    height: number;

    /**
     * Granularity of Record
     */
    granularity: string;

    /**
     * Block unix timestamp
     */
    time_stamp: number;

    /**
     * Average Fee of ALl Transactions in a Block
     */
    average_tx_fee: number;

    /**
     * Total Fee of Transactions in Block
     */
    total_tx_fee: number;

    /**
     * Total Payload Fee
     */
    total_payload_fee: number;

    /**
     * Total Fee
     */
    total_fee: number;
}

/**
 * The interface for BOA holder chart
 */
export interface IAccountChart {
    /**
     * Address of BOA Holder
     */
    address: string;

    /**
     * Block Height
     */
    block_height: number;

    /**
     * Balance of Account
     */
    balance: number;

    /**
     * Granularity of Record
     */
    granularity: string;

    /**
     * Time in Seconds
     */
    time_stamp: number;
}

/**
 * The Interface for a Proposal
 */
export interface IPendingProposal {
    proposal_id: string;
    app_name: string;
    proposal_type: ProposalType;
    proposal_title: string;
    vote_start_height: number;
    vote_end_height: number;
    doc_hash: Hash;
    fund_amount: JSBI;
    proposal_fee: JSBI;
    vote_fee: JSBI;
    proposal_fee_tx_hash: Hash;
    proposer_address: string;
    proposal_fee_address: string;
}

/**
 * The Interface for a Proposal's metadata
 */
export interface IMetaData {
    proposal_id: string;
    voting_start_date: number;
    voting_end_date: number;
    voting_fee_hash: Hash;
    detail: string;
    submit_time: number;
    ave_pre_evaluation_score: number;
    pre_evaluation_start_time: number;
    pre_evaluation_end_time: number;
    proposer_name: string;
    assessResult: IProposalAssessResult;
    proposal_attachments: IProposalAttachment[];
}

/**
 * The Interface for a Proposal's Attachments
 */
export interface IProposalAttachment {
    attachment_id: string;
    name: string;
    url: string;
    mime: string;
    doc_hash: string;
}

/**
 * The Interface for a Proposal's Attachments
 */
export interface IProposalAssessResult {
    assess_average_score: number;
    assess_node_count: number;
    assess_completeness_score: number;
    assess_realization_score: number;
    assess_profitability_score: number;
    assess_attractiveness_score: number;
    assess_expansion_score: number;
}
