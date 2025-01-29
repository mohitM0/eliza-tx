import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AccessTokenMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract the Authorization header    
    const authHeader = req.headers['authorization'];
    console.log("authHeader", authHeader);
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    // Extract the token (assuming "Bearer <token>")
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }
    
    // Attach the token to the request object for further processing
    req['authToken'] = token;

    // Continue to the next middleware or route handler
    next();
  }
}
