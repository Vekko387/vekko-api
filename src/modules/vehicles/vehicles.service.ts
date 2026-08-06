import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { VehicleStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import {
  ListAdminVehiclesQueryDto,
  ListVehiclesQueryDto,
} from './dto/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import {
  AdminVehicleListResponseDto,
  AdminVehicleResponseDto,
  VehicleListResponseDto,
  VehicleResponseDto,
} from './dto/vehicle-response.dto';
import { isValidBrazilianPlate, normalizePlate } from './vehicle-data';
import { toAdminVehicleResponse, toVehicleResponse } from './vehicle.mapper';

const VEHICLE_LIMIT_PER_CUSTOMER = 5;

const ADMIN_VEHICLE_INCLUDE = {
  user: {
    select: {
      email: true,
      id: true,
      profile: {
        select: { cpfNormalized: true, fullName: true },
      },
    },
  },
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
export class VehiclesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    userId: string,
    input: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const data = this.normalizeAndValidateInput(input);

    try {
      const vehicle = await this.prismaService.$transaction(
        async (transaction) => {
          await this.lockCustomerVehicles(transaction, userId);
          await this.ensureProfileComplete(transaction, userId);
          const activeVehicleCount = await transaction.vehicle.count({
            where: { status: VehicleStatus.ACTIVE, userId },
          });

          if (activeVehicleCount >= VEHICLE_LIMIT_PER_CUSTOMER) {
            throw new ConflictException({
              code: 'VEHICLE_LIMIT_REACHED',
              error: 'Conflict',
              message:
                'Você atingiu o limite máximo de 5 veículos cadastrados.',
            });
          }

          return transaction.vehicle.create({
            data: {
              ...data,
              isPrimary: activeVehicleCount === 0,
              userId,
            },
          });
        },
      );

      return toVehicleResponse(vehicle);
    } catch (error) {
      this.handlePlateConflict(error);
      throw error;
    }
  }

  async list(
    userId: string,
    query: ListVehiclesQueryDto,
  ): Promise<VehicleListResponseDto> {
    const vehicles = await this.prismaService.vehicle.findMany({
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
      },
    });

    return { items: vehicles.map(toVehicleResponse) };
  }

  async findMine(userId: string, id: string): Promise<VehicleResponseDto> {
    const vehicle = await this.findOwnedVehicle(userId, id);

    return toVehicleResponse(vehicle);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    await this.findOwnedVehicle(userId, id);
    const data = this.normalizeAndValidatePartialInput(input);

    try {
      const vehicle = await this.prismaService.vehicle.update({
        data,
        where: { id },
      });

      return toVehicleResponse(vehicle);
    } catch (error) {
      this.handlePlateConflict(error);
      throw error;
    }
  }

  async setPrimary(userId: string, id: string): Promise<VehicleResponseDto> {
    const vehicle = await this.prismaService.$transaction(
      async (transaction) => {
        await this.lockCustomerVehicles(transaction, userId);
        const target = await transaction.vehicle.findFirst({
          where: { id, status: VehicleStatus.ACTIVE, userId },
        });

        if (!target) {
          throw this.vehicleNotFound();
        }

        await transaction.vehicle.updateMany({
          data: { isPrimary: false },
          where: { isPrimary: true, userId },
        });

        return transaction.vehicle.update({
          data: { isPrimary: true },
          where: { id },
        });
      },
    );

    return toVehicleResponse(vehicle);
  }

  async updateStatus(
    userId: string,
    id: string,
    input: UpdateVehicleStatusDto,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.prismaService.$transaction(
      async (transaction) => {
        await this.lockCustomerVehicles(transaction, userId);
        const current = await transaction.vehicle.findFirst({
          where: { id, userId },
        });

        if (!current) {
          throw this.vehicleNotFound();
        }

        if (current.status === input.status) {
          return current;
        }

        if (input.status === VehicleStatus.ACTIVE) {
          const activeVehicleCount = await transaction.vehicle.count({
            where: { status: VehicleStatus.ACTIVE, userId },
          });

          if (activeVehicleCount >= VEHICLE_LIMIT_PER_CUSTOMER) {
            throw new ConflictException({
              code: 'VEHICLE_LIMIT_REACHED',
              error: 'Conflict',
              message:
                'Você atingiu o limite máximo de 5 veículos cadastrados.',
            });
          }

          const hasPrimaryVehicle = await transaction.vehicle.findFirst({
            where: {
              isPrimary: true,
              status: VehicleStatus.ACTIVE,
              userId,
            },
          });

          return transaction.vehicle.update({
            data: {
              isPrimary: !hasPrimaryVehicle,
              status: VehicleStatus.ACTIVE,
            },
            where: { id },
          });
        }

        const otherActiveVehicles = await transaction.vehicle.findMany({
          where: {
            id: { not: id },
            status: VehicleStatus.ACTIVE,
            userId,
          },
        });

        if (current.isPrimary && otherActiveVehicles.length > 0) {
          const replacement = otherActiveVehicles.find(
            ({ id: candidateId }) =>
              candidateId === input.replacementPrimaryVehicleId,
          );

          if (!replacement) {
            throw new ConflictException({
              code: 'PRIMARY_VEHICLE_REPLACEMENT_REQUIRED',
              error: 'Conflict',
              message:
                'Escolha outro veículo principal antes de inativar o veículo atual.',
            });
          }

          await transaction.vehicle.update({
            data: { isPrimary: false, status: VehicleStatus.INACTIVE },
            where: { id },
          });

          return transaction.vehicle
            .update({
              data: { isPrimary: true },
              where: { id: replacement.id },
            })
            .then(() =>
              transaction.vehicle.findUniqueOrThrow({ where: { id } }),
            );
        }

        return transaction.vehicle.update({
          data: { isPrimary: false, status: VehicleStatus.INACTIVE },
          where: { id },
        });
      },
    );

    return toVehicleResponse(vehicle);
  }

  async listAdmin(
    query: ListAdminVehiclesQueryDto,
  ): Promise<AdminVehicleListResponseDto> {
    const search = query.search?.trim();
    const plateSearch = search ? normalizePlate(search) : '';
    const where: Prisma.VehicleWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(search
        ? {
            OR: [
              ...(plateSearch
                ? [{ plateNormalized: { contains: plateSearch } }]
                : []),
              { brand: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              {
                user: {
                  is: { email: { contains: search, mode: 'insensitive' } },
                },
              },
              {
                user: {
                  is: {
                    profile: {
                      is: {
                        fullName: { contains: search, mode: 'insensitive' },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [vehicles, total] = await this.prismaService.$transaction([
      this.prismaService.vehicle.findMany({
        include: ADMIN_VEHICLE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        where,
      }),
      this.prismaService.vehicle.count({ where }),
    ]);

    return {
      items: vehicles.map(toAdminVehicleResponse),
      meta: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findAdmin(id: string): Promise<AdminVehicleResponseDto> {
    const vehicle = await this.prismaService.vehicle.findUnique({
      include: ADMIN_VEHICLE_INCLUDE,
      where: { id },
    });

    if (!vehicle) {
      throw this.vehicleNotFound();
    }

    return toAdminVehicleResponse(vehicle);
  }

  async updateStatusAdmin(
    id: string,
    input: UpdateVehicleStatusDto,
  ): Promise<AdminVehicleResponseDto> {
    const vehicle = await this.prismaService.vehicle.findUnique({
      select: { userId: true },
      where: { id },
    });

    if (!vehicle) {
      throw this.vehicleNotFound();
    }

    await this.updateStatus(vehicle.userId, id, input);

    return this.findAdmin(id);
  }

  private normalizeAndValidateInput(input: CreateVehicleDto) {
    return {
      ...this.normalizeAndValidatePartialInput(input),
      brand: this.requiredTrimmed(input.brand, 'marca'),
      color: this.requiredTrimmed(input.color, 'cor'),
      model: this.requiredTrimmed(input.model, 'modelo'),
      plateNormalized: this.validPlate(input.plate),
      type: input.type,
    };
  }

  private normalizeAndValidatePartialInput(input: UpdateVehicleDto) {
    const maximumYear = new Date().getFullYear() + 1;

    if (
      input.year !== undefined &&
      input.year !== null &&
      input.year > maximumYear
    ) {
      throw new BadRequestException({
        code: 'INVALID_VEHICLE_YEAR',
        error: 'Bad Request',
        message: `O ano do veículo não pode ser maior que ${maximumYear}.`,
      });
    }

    return {
      ...(input.brand !== undefined
        ? { brand: this.requiredTrimmed(input.brand, 'marca') }
        : {}),
      ...(input.color !== undefined
        ? { color: this.requiredTrimmed(input.color, 'cor') }
        : {}),
      ...(input.model !== undefined
        ? { model: this.requiredTrimmed(input.model, 'modelo') }
        : {}),
      ...(input.nickname !== undefined
        ? { nickname: input.nickname?.trim() || null }
        : {}),
      ...(input.plate !== undefined
        ? { plateNormalized: this.validPlate(input.plate) }
        : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.year !== undefined ? { year: input.year } : {}),
    };
  }

  private requiredTrimmed(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException({
        code: 'INVALID_VEHICLE_DATA',
        error: 'Bad Request',
        message: `Informe ${field} do veículo.`,
      });
    }

    return normalized;
  }

  private validPlate(plate: string): string {
    const normalized = normalizePlate(plate);

    if (!isValidBrazilianPlate(normalized)) {
      throw new BadRequestException({
        code: 'INVALID_VEHICLE_PLATE',
        error: 'Bad Request',
        message: 'Informe uma placa brasileira válida.',
      });
    }

    return normalized;
  }

  private async findOwnedVehicle(userId: string, id: string) {
    const vehicle = await this.prismaService.vehicle.findFirst({
      where: { id, userId },
    });

    if (!vehicle) {
      throw this.vehicleNotFound();
    }

    return vehicle;
  }

  private vehicleNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'VEHICLE_NOT_FOUND',
      error: 'Not Found',
      message: 'Veículo não encontrado.',
    });
  }

  private handlePlateConflict(error: unknown): void {
    if (isUniqueConstraintError(error)) {
      throw new ConflictException({
        code: 'VEHICLE_PLATE_ALREADY_IN_USE',
        error: 'Conflict',
        message: 'Esta placa já está vinculada a outro veículo na VEKKO.',
      });
    }
  }

  private async ensureProfileComplete(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    const profile = await transaction.userProfile.findUnique({
      where: { userId },
    });

    if (!profile?.profileCompletedAt) {
      throw new ForbiddenException({
        code: 'PROFILE_INCOMPLETE',
        error: 'Forbidden',
        message: 'Complete seu perfil antes de cadastrar um veículo.',
      });
    }
  }

  private async lockCustomerVehicles(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))
    `;
  }
}
