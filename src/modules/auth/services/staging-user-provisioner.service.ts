import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../../generated/prisma/enums';
import { FirebaseAuthAdapter } from '../adapters/firebase-auth.adapter';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { UsersService } from './users.service';

export const INTERNAL_ROLES = [
  Role.PARTNER_OWNER,
  Role.PARTNER_MANAGER,
  Role.PARTNER_EMPLOYEE,
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.SUPORTE,
  Role.FINANCEIRO,
  Role.COMERCIAL,
  Role.OPERACOES,
] as const;

@Injectable()
export class StagingUserProvisionerService {
  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseAuthAdapter: FirebaseAuthAdapter,
    private readonly usersService: UsersService,
  ) {}

  async provision(firebaseUid: string, role: Role): Promise<AuthenticatedUser> {
    const environment =
      this.configService.getOrThrow<string>('app.environment');

    if (environment !== 'staging') {
      throw new Error('Internal user provisioning is restricted to staging.');
    }

    if (
      !firebaseUid.trim() ||
      !INTERNAL_ROLES.includes(role as (typeof INTERNAL_ROLES)[number])
    ) {
      throw new Error('Invalid Firebase UID or internal role.');
    }

    const identity =
      await this.firebaseAuthAdapter.getUserIdentity(firebaseUid);

    return this.usersService.provisionInternalUser(identity, role);
  }
}
