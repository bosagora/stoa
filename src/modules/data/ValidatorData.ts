import { UInt64 } from 'spu-integer-math';

export interface IValidator {
    address: string;
    enrolled_at: UInt64;
    stake: string;
    preimage?: IPreimage;
}

export interface IPreimage {
    distance?: number;
    hash?: string;
}

export class ValidatorData implements IValidator {
    address: string;
    enrolled_at: UInt64;
    stake: string;
    preimage: IPreimage;

    constructor(address: string, enrolled_at: UInt64, stake: string, preimage: IPreimage) {
        this.address = address;
        this.enrolled_at = new UInt64(enrolled_at);
        this.stake = stake;
        this.preimage = preimage;
    }
}
