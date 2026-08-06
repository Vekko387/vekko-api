import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ServiceStatus } from '../../generated/prisma/enums';
import { PartnerUnitStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateServiceDto,
  UpdateServiceDto,
} from './dto/service-catalog.dto';
import type {
  ServiceListResponseDto,
  ServiceResponseDto,
} from './dto/partner-unit-response.dto';

@Injectable()
export class ServicesCatalogService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(): Promise<ServiceListResponseDto> {
    const services = await this.prismaService.service.findMany({
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    return { items: services };
  }

  async create(input: CreateServiceDto): Promise<ServiceResponseDto> {
    try {
      return await this.prismaService.service.create({
        data: {
          code: input.code.trim().toUpperCase(),
          description: input.description?.trim() || null,
          name: this.requiredName(input.name),
          status: ServiceStatus.ACTIVE,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'SERVICE_CODE_ALREADY_EXISTS',
          message: 'Já existe um serviço com este código.',
        });
      }

      throw error;
    }
  }

  async update(
    serviceId: string,
    input: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    await this.find(serviceId);
    return this.prismaService.service.update({
      data: {
        ...(input.description !== undefined
          ? { description: input.description.trim() || null }
          : {}),
        ...(input.name !== undefined
          ? { name: this.requiredName(input.name) }
          : {}),
      },
      where: { id: serviceId },
    });
  }

  async updateStatus(
    serviceId: string,
    status: ServiceStatus,
  ): Promise<ServiceResponseDto> {
    await this.find(serviceId);
    const updated = await this.prismaService.service.update({
      data: { status },
      where: { id: serviceId },
    });

    if (status === ServiceStatus.INACTIVE) {
      await this.prismaService.partnerUnit.updateMany({
        data: { status: PartnerUnitStatus.DRAFT },
        where: {
          services: {
            none: { service: { status: ServiceStatus.ACTIVE } },
          },
          status: PartnerUnitStatus.ACTIVE,
        },
      });
    }

    return updated;
  }

  private async find(serviceId: string): Promise<ServiceResponseDto> {
    const service = await this.prismaService.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException({
        code: 'SERVICE_NOT_FOUND',
        message: 'Serviço não encontrado.',
      });
    }

    return service;
  }

  private requiredName(value: string): string {
    const name = value.trim();

    if (!name) {
      throw new BadRequestException({
        code: 'INVALID_SERVICE_DATA',
        message: 'Informe o nome do serviço.',
      });
    }

    return name;
  }
}
