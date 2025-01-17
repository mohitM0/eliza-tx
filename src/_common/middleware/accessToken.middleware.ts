import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AccessTokenMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract the Authorization header

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      throw new HttpException(
        'Authorization header is missing',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Extract the token (assuming "Bearer <token>")
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new HttpException(
        'Invalid Authorization header format',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Attach the token to the request object for further processing
    req['authToken'] = token;

    // Continue to the next middleware or route handler
    next();
  }
}
