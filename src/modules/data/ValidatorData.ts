export interface IValidator {
    address: string;
    enrolled_at: number;
    stake: string;
    preimage?: IPreimage;
};

export interface IPreimage {
    distance?: number;
    hash?: string;
};

export class ValidatorData implements IValidator {
    address: string;
    enrolled_at: number;
    stake: string;
    preimage: IPreimage;

    constructor(address: string, enrolled_at: number, stake: string, preimage: IPreimage) {
        this.address = address;
        this.enrolled_at = enrolled_at;
        this.stake = stake;
        this.preimage = preimage;
    }
}
