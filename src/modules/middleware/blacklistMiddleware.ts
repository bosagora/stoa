import { NextFunction, Request, Response } from "express";
import { HeightManager } from "../common/HeightManager";
import { logger, Logger } from "../common/Logger";
import { Operation, Status } from "../common/LogOperation";
import moment from "moment";

/**
 * Middleware to check the blacklist IP
 *
 */
export const isBlackList = async (req: Request, res: Response, next: NextFunction) => {
    const ipAddress = req.headers['x-forwarded-for'] === undefined ? req.ip : req.headers['x-forwarded-for'];
    if (
        Logger.dbInstance === undefined ||
        Logger.dbInstance.connection === undefined ||
        Logger.dbInstance.connection.db === undefined
    ) {
        next();
        return;
    } else {
        const db = Logger.dbInstance.connection.db;
        const isBlackListed = await db.collection("blacklists").findOne({ ipAddress });
        if (!isBlackListed) next();
        else {
            let count = isBlackListed.rejectCount;
            ++count;
            db.collection("blacklists").updateOne({ ipAddress: { $eq: ipAddress } }, { $set: { rejectCount: count } })
            res.status(403).send("Your request has been rejected.");
            logger.warn(`Error: IP:${ipAddress} is blocked.`, {
                operation: Operation.Http_request,
                height: HeightManager.height.toString(),
                status: Status.Error,
                responseTime: Number(moment().utc().unix() * 1000),
            });
        }
    }
};
