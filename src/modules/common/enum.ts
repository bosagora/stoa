/*******************************************************************************

    This file contain enum for the Proposals.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

export enum ProposalStatus {
    ONGOING = 'Ongoing',
    VOTING = 'Voting',
    COUNTING_VOTES = 'Counting votes',
    CLOSED = 'Closed',
}

export enum DataCollectionStatus {
    PENDING = 'Pending',
    COMPLETED = 'Completed',
}

export enum SignStatus {
    UNSIGNED = 0,
    SIGNED = 1,
}

export enum ValidatorStatus {
    SLASHED = 1,
    ACTIVE = 0,
}

export enum ProposalResult {
    PENDING = 'Pending',
    PASSED = 'Passed',
    REJECTED = 'Rejected',
}
