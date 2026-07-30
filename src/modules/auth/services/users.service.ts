import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Role } from '../../../generated/prisma/enums';
import type { UserGetPayload } from '../../../generated/prisma/models/User';
import type {
  AuthenticatedUser,
  FirebaseIdentity,
} from '../types/authenticated-user';

type UserWithAuthRelations = UserGetPayload<{
  include: {
    profile: true;
    roles: true;
  };
}>;

const AUTH_RELATIONS = {
  profile: true,
  roles: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findOrCreateCustomer(
    identity: FirebaseIdentity,
  ): Promise<AuthenticatedUser> {
    const emailUpdate = identity.email ? { email: identity.email } : {};
    const user = await this.prismaService.user.upsert({
      where: {
        firebaseUid: identity.firebaseUid,
      },
      create: {
        email: identity.email,
        firebaseUid: identity.firebaseUid,
        profile: {
          create: {},
        },
        roles: {
          create: {
            role: Role.CUSTOMER,
          },
        },
      },
      update: emailUpdate,
      include: AUTH_RELATIONS,
    });

    return this.toAuthenticatedUser(user);
  }

  async provisionInternalUser(
    identity: FirebaseIdentity,
    role: Role,
  ): Promise<AuthenticatedUser> {
    const user = await this.prismaService.$transaction(async (transaction) => {
      const emailUpdate = identity.email ? { email: identity.email } : {};
      const persistedUser = await transaction.user.upsert({
        where: {
          firebaseUid: identity.firebaseUid,
        },
        create: {
          email: identity.email,
          firebaseUid: identity.firebaseUid,
          profile: {
            create: {},
          },
          roles: {
            create: {
              role,
            },
          },
        },
        update: emailUpdate,
      });

      await transaction.userProfile.upsert({
        where: {
          userId: persistedUser.id,
        },
        create: {
          userId: persistedUser.id,
        },
        update: {},
      });
      await transaction.userRole.upsert({
        where: {
          userId_role: {
            role,
            userId: persistedUser.id,
          },
        },
        create: {
          role,
          userId: persistedUser.id,
        },
        update: {},
      });

      return transaction.user.findUniqueOrThrow({
        where: {
          id: persistedUser.id,
        },
        include: AUTH_RELATIONS,
      });
    });

    return this.toAuthenticatedUser(user);
  }

  private toAuthenticatedUser(user: UserWithAuthRelations): AuthenticatedUser {
    return {
      email: user.email,
      firebaseUid: user.firebaseUid,
      id: user.id,
      profile: user.profile?.cpfNormalized
        ? { cpfNormalized: user.profile.cpfNormalized }
        : {},
      roles: user.roles.map(({ role }) => role).sort(),
    };
  }
}
