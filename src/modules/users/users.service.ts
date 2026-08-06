import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Role, UserStatus, VehicleStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import {
  CustomerUserListResponseDto,
  CustomerUserResponseDto,
} from './dto/user-response.dto';
import {
  isValidBrazilianPhone,
  isValidCpf,
  normalizeDigits,
} from './user-data';
import { toCustomerUserResponse } from './user.mapper';

const CUSTOMER_USER_INCLUDE = {
  _count: {
    select: {
      vehicles: { where: { status: VehicleStatus.ACTIVE } },
    },
  },
  profile: true,
  roles: true,
} as const;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class CustomerUsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findMe(userId: string): Promise<CustomerUserResponseDto> {
    const user = await this.prismaService.user.findUnique({
      include: CUSTOMER_USER_INCLUDE,
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return toCustomerUserResponse(user);
  }

  async updateMyProfile(
    userId: string,
    input: UpdateMyProfileDto,
  ): Promise<CustomerUserResponseDto> {
    try {
      await this.prismaService.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 1))
        `;

        const currentProfile = await transaction.userProfile.findUnique({
          where: { userId },
        });

        if (!currentProfile) {
          throw new NotFoundException('Perfil do usuário não encontrado.');
        }

        const cpfNormalized = input.cpf
          ? normalizeDigits(input.cpf)
          : undefined;
        const phoneNormalized = input.phone
          ? normalizeDigits(input.phone)
          : undefined;
        const fullName = input.fullName?.trim();

        if (cpfNormalized && !isValidCpf(cpfNormalized)) {
          throw new BadRequestException({
            code: 'INVALID_CPF',
            error: 'Bad Request',
            message: 'Informe um CPF válido.',
          });
        }

        if (
          currentProfile.cpfNormalized &&
          cpfNormalized &&
          currentProfile.cpfNormalized !== cpfNormalized
        ) {
          throw new ConflictException({
            code: 'CPF_IMMUTABLE',
            error: 'Conflict',
            message: 'O CPF não pode ser alterado após o primeiro cadastro.',
          });
        }

        if (phoneNormalized && !isValidBrazilianPhone(phoneNormalized)) {
          throw new BadRequestException({
            code: 'INVALID_PHONE',
            error: 'Bad Request',
            message: 'Informe um telefone válido com DDD.',
          });
        }

        const nextCpf = currentProfile.cpfNormalized ?? cpfNormalized ?? null;
        const nextFullName = fullName ?? currentProfile.fullName;
        const nextPhone = phoneNormalized ?? currentProfile.phoneNormalized;
        const profileCompletedAt =
          currentProfile.profileCompletedAt ??
          (nextCpf && nextFullName && nextPhone ? new Date() : null);

        await transaction.userProfile.update({
          data: {
            ...(cpfNormalized && !currentProfile.cpfNormalized
              ? { cpfNormalized }
              : {}),
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phoneNormalized !== undefined ? { phoneNormalized } : {}),
            ...(profileCompletedAt && !currentProfile.profileCompletedAt
              ? { profileCompletedAt }
              : {}),
          },
          where: { userId },
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'CPF_ALREADY_IN_USE',
          error: 'Conflict',
          message: 'Este CPF já está vinculado a outra conta VEKKO.',
        });
      }

      throw error;
    }

    return this.findMe(userId);
  }

  async list(
    query: ListAdminUsersQueryDto,
  ): Promise<CustomerUserListResponseDto> {
    const search = query.search?.trim();
    const searchDigits = search ? normalizeDigits(search) : '';
    const profileCompletionFilter =
      query.profileComplete === undefined
        ? {}
        : query.profileComplete
          ? { profileCompletedAt: { not: null } }
          : { profileCompletedAt: null };
    const where: Prisma.UserWhereInput = {
      roles: { some: { role: Role.CUSTOMER } },
      ...(query.status ? { status: query.status } : {}),
      ...(query.profileComplete === undefined
        ? {}
        : { profile: { is: profileCompletionFilter } }),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              {
                profile: {
                  is: { fullName: { contains: search, mode: 'insensitive' } },
                },
              },
              ...(searchDigits
                ? [
                    {
                      profile: {
                        is: { cpfNormalized: { contains: searchDigits } },
                      },
                    } satisfies Prisma.UserWhereInput,
                  ]
                : []),
            ],
          }
        : {}),
    };
    const [users, total] = await this.prismaService.$transaction([
      this.prismaService.user.findMany({
        include: CUSTOMER_USER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        where,
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      items: users.map(toCustomerUserResponse),
      meta: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findCustomerById(id: string): Promise<CustomerUserResponseDto> {
    const user = await this.prismaService.user.findFirst({
      include: CUSTOMER_USER_INCLUDE,
      where: {
        id,
        roles: { some: { role: Role.CUSTOMER } },
      },
    });

    if (!user) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return toCustomerUserResponse(user);
  }

  async updateStatus(
    id: string,
    status: UserStatus,
  ): Promise<CustomerUserResponseDto> {
    await this.findCustomerById(id);
    await this.prismaService.user.update({
      data: { status },
      where: { id },
    });

    return this.findCustomerById(id);
  }
}
