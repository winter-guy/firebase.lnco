// auth.service.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async getSubFromToken(token: string): Promise<string> {
    const decodedToken = this.jwtService.decode(token);
    return decodedToken.sub;
  }
}
