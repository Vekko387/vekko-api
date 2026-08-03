import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserStatus } from '../../../generated/prisma/enums';
import { FirebaseAuthAdapter } from '../adapters/firebase-auth.adapter';
import { IS_PUBLIC_KEY } from '../auth.constants';
import { FirebaseTokenVerificationError } from '../errors/firebase-token-verification.error';
import { UsersService } from '../services/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebaseAuthAdapter: FirebaseAuthAdapter,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const idToken = this.extractBearerToken(request);

    try {
      const identity = await this.firebaseAuthAdapter.verifyIdToken(idToken);
      request.user = await this.usersService.findOrCreateCustomer(identity);

      if (request.user.status === UserStatus.BLOCKED) {
        throw new ForbiddenException({
          code: 'ACCOUNT_BLOCKED',
          error: 'Forbidden',
          message: 'Esta conta está bloqueada. Entre em contato com o suporte.',
        });
      }
    } catch (error) {
      if (error instanceof FirebaseTokenVerificationError) {
        throw new UnauthorizedException('Authentication is required.');
      }

      throw error;
    }

    return true;
  }

  private extractBearerToken(request: Request): string {
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(\S+)$/iu);

    if (!match?.[1]) {
      throw new UnauthorizedException('Authentication is required.');
    }

    return match[1];
  }
}
