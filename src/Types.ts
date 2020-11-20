/**
 * The interface of the UTXO for Stoa API response
 */
export interface IUnspentTxOutput
{
    utxo: string;
    type: number;
    unlock_height: string;
    amount: string;
}
