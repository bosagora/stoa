import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express'
import User from '../models/userModel'
/**
 * function for verifying tokken received with request through jsonwebtoken
 * @param req request object of api, here used for getting tokken from head of request
 * @param res response object of api, no use here
 * @param next next function of express, passes control to the next route
 */

const isAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]

      const decoded: any = jwt.verify(token, 'my secret')

      req.body.email = decoded.email

      next()
    } catch (error) {
      res.status(401)
      res.send('Not authorized, token failed')
    }
  }
  if (!token) {
    res.status(401)
    res.send('Not authorized, no token')
  }
}

export default isAuth;