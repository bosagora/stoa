/*******************************************************************************

    This file contain HeightManager class which manages the height of stoa.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Height } from "boa-sdk-ts";
import Stoa from "../../Stoa";
import { logger } from "./Logger";
import { Operation } from "./LogOperation";

export class HeightManager {
    /**
     * Stoa Block height
     */
    public static height: Height;

    public static init(stoa: Stoa): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            stoa.ledger_storage
                .getBlockHeight()
                .then((height) => {
                    if (height) {
                        HeightManager.height = height;
                        resolve();
                    } else {
                        HeightManager.height = new Height("0");
                        resolve();
                    }
                })
                .catch((err) => {
                    logger.error("Failed to data lookup to the DB: " + err, {
                        operation: Operation.db,
                        height: HeightManager.height.toString(),
                        success: false,
                    });
                });
        });
    }
}
