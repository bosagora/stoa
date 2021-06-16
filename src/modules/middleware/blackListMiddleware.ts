import { Request, Response, NextFunction } from 'express';
import blacklistModel from '../models/blacklistModel';
import { logger } from '../common/Logger';

/**
* Function to get IP of the client
*
*/
const getClientIp = (req: Request) => {
  let ipAddress = req.ip;
  if (!ipAddress) {
    return '';
  }
  return ipAddress;
};
/**
* Middleware to check the blacklist IP
*
*/
export const isBlackList = async (req: Request, res: Response, next: NextFunction) => {
  let ipAddress = String(getClientIp(req));
  let isBlackListed = await blacklistModel.findOne({ ipAddress });
  if (!isBlackListed)
    next();
  else
    res.status(401).send('Your Ip is blacklisted')
  logger.error(`Error: ${ipAddress} is blacklisted`)
}