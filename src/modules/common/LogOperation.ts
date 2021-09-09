/*******************************************************************************

    This file contain the logging operations used in stoa.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

const operations = {
    db: "DB Operation",
    connection: "Connection Operation",
    block_recovery: "Block Recovery Operation",
    block_sync: "Block Sync Operation",
    start: "Stoa Server StartUp",
    coin_market_data_sync: "Coin Market Cap Operation",
    votera_request:"Votera Proposal request"
};

export const Operation = operations;
