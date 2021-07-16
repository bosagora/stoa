import { Request, Response, NextFunction } from 'express';
import { logger, Logger } from '../common/Logger';

/**
 * Middleware to check the blacklist IP
 *
 */
export const isBlackList = async (req: Request, res: Response, next: NextFunction) => {
    let ipAddress = String(req.ip);
    let db = Logger.dbInstance.connection.db;
    if (!db)
        next();
    let isBlackListed = await db.collection('blacklists').findOne({ ipAddress });
    if (!isBlackListed)
        next();
    else {
        res.status(403).send('Your request has been rejected.')
        logger.warn(`Error: IP:${ipAddress} is blocked.`)
    }
}
