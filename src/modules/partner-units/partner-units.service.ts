import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  PartnerStatus,
  PartnerUnitStatus,
  PlanStatus,
  ServiceStatus,
  VehicleType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import {
  LOCATION_ADAPTER,
  type GeocodeAddressInput,
  type GeocodeAddressResult,
  type LocationAdapter,
} from '../location/location.adapter';
import {
  isValidBrazilianPhone,
  normalizeDigits,
} from '../partners/partner-data';
import type { BusinessHourInputDto } from './dto/business-hours.dto';
import type {
  CreatePartnerUnitDto,
  UpdatePartnerUnitDto,
} from './dto/create-partner-unit.dto';
import type { ListAdminUnitsQueryDto } from './dto/list-admin-units-query.dto';
import type {
  AdminPartnerUnitListResponseDto,
  PartnerUnitListResponseDto,
  PartnerUnitResponseDto,
  UnitBusinessHoursResponseDto,
  UnitPlansResponseDto,
  UnitServicesResponseDto,
  UnitVehicleTypesResponseDto,
} from './dto/partner-unit-response.dto';
import {
  getMissingRequirements,
  toPartnerUnitResponse,
  toPlanOptions,
  toServiceOptions,
  toVehicleTypeOptions,
  UNIT_DETAILS_INCLUDE,
  type UnitWithDetails,
} from './partner-unit.mapper';

const ADDRESS_FIELDS: (keyof UpdatePartnerUnitDto)[] = [
  'postalCode',
  'street',
  'addressNumber',
  'addressComplement',
  'neighborhood',
  'city',
  'state',
];

type NormalizedUnitAddress = GeocodeAddressInput & {
  formattedAddress: string;
};

function requiredTrimmed(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException({
      code: 'INVALID_UNIT_DATA',
      message: `Informe ${field} da unidade.`,
    });
  }

  return normalized;
}

function formatAddress(input: GeocodeAddressInput): string {
  return [
    `${input.street}, ${input.addressNumber}`,
    input.addressComplement,
    input.neighborhood,
    `${input.city} - ${input.state}`,
    input.postalCode,
  ]
    .filter(Boolean)
    .join(', ');
}

@Injectable()
export class PartnerUnitsService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(LOCATION_ADAPTER)
    private readonly locationAdapter: LocationAdapter,
  ) {}

  async listForPartner(userId: string): Promise<PartnerUnitListResponseDto> {
    const [units, catalogs] = await Promise.all([
      this.prismaService.partnerUnit.findMany({
        include: UNIT_DETAILS_INCLUDE,
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
        where: { partner: { members: { some: { userId } } } },
      }),
      this.loadCatalogs(),
    ]);

    return {
      items: units.map((unit) => toPartnerUnitResponse(unit, catalogs)),
    };
  }

  async createForPartner(
    userId: string,
    input: CreatePartnerUnitDto,
  ): Promise<PartnerUnitResponseDto> {
    const partner = await this.prismaService.partner.findFirst({
      where: { members: { some: { userId } } },
    });

    if (!partner) {
      throw new NotFoundException({
        code: 'PARTNER_NOT_FOUND',
        message: 'Nenhum parceiro está vinculado a esta conta.',
      });
    }

    this.assertPartnerActive(partner.status);
    this.validatePhone(input.phone, 'telefone');

    if (input.whatsapp) {
      this.validatePhone(input.whatsapp, 'WhatsApp');
    }

    const address = this.normalizeAddress(input);
    const location = await this.tryGeocode(address);
    const created = await this.prismaService.partnerUnit.create({
      data: {
        addressComplement: address.addressComplement || null,
        addressNumber: address.addressNumber,
        city: address.city,
        formattedAddress:
          location?.formattedAddress ?? address.formattedAddress,
        lastGeocodedAt: location ? new Date() : null,
        latitude: location?.latitude,
        longitude: location?.longitude,
        mapProviderId: location?.providerId,
        name: requiredTrimmed(input.name, 'o nome'),
        neighborhood: address.neighborhood,
        partnerId: partner.id,
        phoneNormalized: normalizeDigits(input.phone),
        postalCodeNormalized: address.postalCode,
        state: address.state,
        status: PartnerUnitStatus.DRAFT,
        street: address.street,
        whatsappNormalized: input.whatsapp
          ? normalizeDigits(input.whatsapp)
          : null,
      },
      include: UNIT_DETAILS_INCLUDE,
    });

    return this.mapUnit(created);
  }

  async findForPartner(
    userId: string,
    unitId: string,
  ): Promise<PartnerUnitResponseDto> {
    return this.mapUnit(await this.findPartnerUnit(userId, unitId));
  }

  async updateForPartner(
    userId: string,
    unitId: string,
    input: UpdatePartnerUnitDto,
  ): Promise<PartnerUnitResponseDto> {
    const unit = await this.findPartnerUnit(userId, unitId);
    this.assertPartnerActive(unit.partner.status);
    this.assertUnitNotSuspended(unit.status);
    await this.updateUnit(unit, input);

    return this.findForPartner(userId, unitId);
  }

  async updatePartnerStatus(
    userId: string,
    unitId: string,
    status: PartnerUnitStatus,
  ): Promise<PartnerUnitResponseDto> {
    const unit = await this.findPartnerUnit(userId, unitId);
    this.assertPartnerActive(unit.partner.status);
    this.assertUnitNotSuspended(unit.status);

    if (
      status !== PartnerUnitStatus.ACTIVE &&
      status !== PartnerUnitStatus.INACTIVE
    ) {
      throw new ForbiddenException({
        code: 'UNIT_STATUS_NOT_ALLOWED',
        message: 'O parceiro pode apenas ativar ou inativar uma unidade.',
      });
    }

    if (status === PartnerUnitStatus.ACTIVE) {
      this.assertUnitComplete(unit);
    }

    await this.prismaService.partnerUnit.update({
      data: { status },
      where: { id: unitId },
    });

    return this.findForPartner(userId, unitId);
  }

  async listAdmin(
    query: ListAdminUnitsQueryDto,
  ): Promise<AdminPartnerUnitListResponseDto> {
    const partnerSearch = query.partner?.trim();
    const partnerDigits = partnerSearch ? normalizeDigits(partnerSearch) : '';
    const where: Prisma.PartnerUnitWhereInput = {
      ...(query.city
        ? { city: { equals: query.city.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.partnerId ? { partnerId: query.partnerId } : {}),
      ...(partnerSearch
        ? {
            partner: {
              OR: [
                {
                  tradeName: {
                    contains: partnerSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  legalName: {
                    contains: partnerSearch,
                    mode: 'insensitive',
                  },
                },
                ...(partnerDigits
                  ? [{ cnpjNormalized: { contains: partnerDigits } }]
                  : []),
              ],
            },
          }
        : {}),
      ...(query.state ? { state: query.state.trim().toUpperCase() } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [units, total, catalogs] = await Promise.all([
      this.prismaService.partnerUnit.findMany({
        include: UNIT_DETAILS_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        where,
      }),
      this.prismaService.partnerUnit.count({ where }),
      this.loadCatalogs(),
    ]);

    return {
      items: units.map((unit) => toPartnerUnitResponse(unit, catalogs, true)),
      meta: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findAdmin(unitId: string): Promise<PartnerUnitResponseDto> {
    return this.mapUnit(await this.findUnit(unitId), true);
  }

  async updateAdmin(
    unitId: string,
    input: UpdatePartnerUnitDto,
  ): Promise<PartnerUnitResponseDto> {
    const unit = await this.findUnit(unitId);
    await this.updateUnit(unit, input);

    return this.findAdmin(unitId);
  }

  async updateAdminStatus(
    unitId: string,
    status: PartnerUnitStatus,
  ): Promise<PartnerUnitResponseDto> {
    const unit = await this.findUnit(unitId);

    if (status === PartnerUnitStatus.DRAFT) {
      throw new BadRequestException({
        code: 'UNIT_STATUS_NOT_ALLOWED',
        message: 'O status DRAFT é controlado automaticamente pela API.',
      });
    }

    if (status === PartnerUnitStatus.ACTIVE) {
      this.assertUnitComplete(unit);
    }

    await this.prismaService.partnerUnit.update({
      data: { status },
      where: { id: unitId },
    });

    return this.findAdmin(unitId);
  }

  async getBusinessHours(
    userId: string,
    unitId: string,
  ): Promise<UnitBusinessHoursResponseDto> {
    const unit = await this.findPartnerUnit(userId, unitId);
    return {
      items: unit.businessHours.map((hour) => ({
        closesAt: hour.closesAt,
        dayOfWeek: hour.dayOfWeek,
        isClosed: hour.isClosed,
        opensAt: hour.opensAt,
      })),
    };
  }

  async replaceBusinessHours(
    userId: string,
    unitId: string,
    items: BusinessHourInputDto[],
  ): Promise<UnitBusinessHoursResponseDto> {
    const unit = await this.findWritablePartnerUnit(userId, unitId);
    this.validateBusinessHours(items);

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.businessHour.deleteMany({ where: { unitId } });
      await transaction.businessHour.createMany({
        data: items.map((hour) => ({
          closesAt: hour.isClosed ? null : hour.closesAt,
          dayOfWeek: hour.dayOfWeek,
          isClosed: hour.isClosed,
          opensAt: hour.isClosed ? null : hour.opensAt,
          unitId,
        })),
      });
    });
    await this.reconcileActiveStatus(unit.id);

    return this.getBusinessHours(userId, unitId);
  }

  async getServices(
    userId: string,
    unitId: string,
  ): Promise<UnitServicesResponseDto> {
    const [unit, services] = await Promise.all([
      this.findPartnerUnit(userId, unitId),
      this.prismaService.service.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return { items: toServiceOptions(unit, services) };
  }

  async replaceServices(
    userId: string,
    unitId: string,
    serviceIds: string[],
  ): Promise<UnitServicesResponseDto> {
    const unit = await this.findWritablePartnerUnit(userId, unitId);
    const historicalServiceIds = new Set(
      unit.services
        .filter(({ service }) => service.status === ServiceStatus.INACTIVE)
        .map(({ serviceId }) => serviceId),
    );
    const activeRequestedIds = serviceIds.filter(
      (serviceId) => !historicalServiceIds.has(serviceId),
    );
    const activeServices = await this.prismaService.service.findMany({
      select: { id: true },
      where: {
        id: { in: activeRequestedIds },
        status: ServiceStatus.ACTIVE,
      },
    });

    if (activeServices.length !== activeRequestedIds.length) {
      throw new BadRequestException({
        code: 'INVALID_UNIT_SERVICES',
        message: 'Selecione somente serviços ativos do catálogo oficial.',
      });
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.unitService.deleteMany({
        where: { service: { status: ServiceStatus.ACTIVE }, unitId },
      });
      if (activeRequestedIds.length) {
        await transaction.unitService.createMany({
          data: activeRequestedIds.map((serviceId) => ({ serviceId, unitId })),
        });
      }
    });
    await this.reconcileActiveStatus(unit.id);

    return this.getServices(userId, unitId);
  }

  async getVehicleTypes(
    userId: string,
    unitId: string,
  ): Promise<UnitVehicleTypesResponseDto> {
    return {
      items: toVehicleTypeOptions(await this.findPartnerUnit(userId, unitId)),
    };
  }

  async replaceVehicleTypes(
    userId: string,
    unitId: string,
    vehicleTypes: VehicleType[],
  ): Promise<UnitVehicleTypesResponseDto> {
    const unit = await this.findWritablePartnerUnit(userId, unitId);
    await this.prismaService.$transaction(async (transaction) => {
      await transaction.unitVehicleType.deleteMany({ where: { unitId } });
      if (vehicleTypes.length) {
        await transaction.unitVehicleType.createMany({
          data: vehicleTypes.map((vehicleType) => ({ unitId, vehicleType })),
        });
      }
    });
    await this.reconcileActiveStatus(unit.id);

    return this.getVehicleTypes(userId, unitId);
  }

  async getPlans(
    userId: string,
    unitId: string,
  ): Promise<UnitPlansResponseDto> {
    const [unit, plans] = await Promise.all([
      this.findPartnerUnit(userId, unitId),
      this.prismaService.plan.findMany({ orderBy: { displayOrder: 'asc' } }),
    ]);
    return { items: toPlanOptions(unit, plans) };
  }

  async replacePlans(
    userId: string,
    unitId: string,
    planIds: string[],
  ): Promise<UnitPlansResponseDto> {
    const unit = await this.findWritablePartnerUnit(userId, unitId);
    const historicalPlanIds = new Set(
      unit.acceptedPlans
        .filter(({ plan }) => plan.status === PlanStatus.INACTIVE)
        .map(({ planId }) => planId),
    );
    const activeRequestedIds = planIds.filter(
      (planId) => !historicalPlanIds.has(planId),
    );
    const activePlans = await this.prismaService.plan.findMany({
      select: { id: true },
      where: { id: { in: activeRequestedIds }, status: PlanStatus.ACTIVE },
    });

    if (activePlans.length !== activeRequestedIds.length) {
      throw new BadRequestException({
        code: 'INVALID_UNIT_PLANS',
        message: 'Selecione somente planos oficiais ativos.',
      });
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.unitAcceptedPlan.deleteMany({
        where: { plan: { status: PlanStatus.ACTIVE }, unitId },
      });
      if (activeRequestedIds.length) {
        await transaction.unitAcceptedPlan.createMany({
          data: activeRequestedIds.map((planId) => ({ planId, unitId })),
        });
      }
    });
    await this.reconcileActiveStatus(unit.id);

    return this.getPlans(userId, unitId);
  }

  private async updateUnit(
    unit: UnitWithDetails,
    input: UpdatePartnerUnitDto,
  ): Promise<void> {
    if (input.phone !== undefined) this.validatePhone(input.phone, 'telefone');
    if (input.whatsapp) this.validatePhone(input.whatsapp, 'WhatsApp');

    const addressChanged = ADDRESS_FIELDS.some(
      (field) => input[field] !== undefined,
    );
    let address: NormalizedUnitAddress | undefined;
    let location: GeocodeAddressResult | null | undefined;

    if (addressChanged) {
      address = this.normalizeAddress({
        addressComplement:
          input.addressComplement ?? unit.addressComplement ?? undefined,
        addressNumber: input.addressNumber ?? unit.addressNumber,
        city: input.city ?? unit.city,
        neighborhood: input.neighborhood ?? unit.neighborhood,
        postalCode: input.postalCode ?? unit.postalCodeNormalized,
        state: input.state ?? unit.state,
        street: input.street ?? unit.street,
      });
      location = await this.tryGeocode(address);
    }

    await this.prismaService.partnerUnit.update({
      data: {
        ...(input.name !== undefined
          ? { name: requiredTrimmed(input.name, 'o nome') }
          : {}),
        ...(input.phone !== undefined
          ? { phoneNormalized: normalizeDigits(input.phone) }
          : {}),
        ...(input.whatsapp !== undefined
          ? {
              whatsappNormalized: input.whatsapp
                ? normalizeDigits(input.whatsapp)
                : null,
            }
          : {}),
        ...(address
          ? {
              addressComplement: address.addressComplement || null,
              addressNumber: address.addressNumber,
              city: address.city,
              formattedAddress:
                location?.formattedAddress ?? address.formattedAddress,
              lastGeocodedAt: location ? new Date() : null,
              latitude: location?.latitude ?? null,
              longitude: location?.longitude ?? null,
              mapProviderId: location?.providerId ?? null,
              neighborhood: address.neighborhood,
              postalCodeNormalized: address.postalCode,
              state: address.state,
              street: address.street,
              ...(unit.status === PartnerUnitStatus.ACTIVE && !location
                ? { status: PartnerUnitStatus.DRAFT }
                : {}),
            }
          : {}),
      },
      where: { id: unit.id },
    });
  }

  private normalizeAddress(
    input: Pick<
      CreatePartnerUnitDto,
      | 'addressComplement'
      | 'addressNumber'
      | 'city'
      | 'neighborhood'
      | 'postalCode'
      | 'state'
      | 'street'
    >,
  ): NormalizedUnitAddress {
    const postalCode = normalizeDigits(input.postalCode);

    if (postalCode.length !== 8) {
      throw new BadRequestException({
        code: 'INVALID_UNIT_POSTAL_CODE',
        message: 'Informe um CEP válido com oito dígitos.',
      });
    }

    const normalized: GeocodeAddressInput = {
      addressComplement: input.addressComplement?.trim() || null,
      addressNumber: requiredTrimmed(input.addressNumber, 'o número'),
      city: requiredTrimmed(input.city, 'a cidade'),
      neighborhood: requiredTrimmed(input.neighborhood, 'o bairro'),
      postalCode,
      state: requiredTrimmed(input.state, 'o estado').toUpperCase(),
      street: requiredTrimmed(input.street, 'a rua'),
    };

    return { ...normalized, formattedAddress: formatAddress(normalized) };
  }

  private async tryGeocode(
    address: GeocodeAddressInput,
  ): Promise<GeocodeAddressResult | null> {
    try {
      return await this.locationAdapter.geocode({
        addressComplement: address.addressComplement,
        addressNumber: address.addressNumber,
        city: address.city,
        neighborhood: address.neighborhood,
        postalCode: address.postalCode,
        state: address.state,
        street: address.street,
      });
    } catch {
      return null;
    }
  }

  private validatePhone(value: string, label: string): void {
    if (!isValidBrazilianPhone(value)) {
      throw new BadRequestException({
        code: 'INVALID_UNIT_PHONE',
        message: `Informe um ${label} válido com DDD.`,
      });
    }
  }

  private validateBusinessHours(items: BusinessHourInputDto[]): void {
    const uniqueDays = new Set(items.map(({ dayOfWeek }) => dayOfWeek));

    if (items.length !== 7 || uniqueDays.size !== 7) {
      throw new BadRequestException({
        code: 'INVALID_BUSINESS_HOURS',
        message: 'Configure exatamente uma opção para cada dia da semana.',
      });
    }

    for (const item of items) {
      if (item.isClosed && (item.opensAt || item.closesAt)) {
        throw new BadRequestException({
          code: 'CLOSED_DAY_HAS_HOURS',
          message: 'Um dia fechado não pode receber horários.',
        });
      }

      if (
        !item.isClosed &&
        (!item.opensAt || !item.closesAt || item.opensAt >= item.closesAt)
      ) {
        throw new BadRequestException({
          code: 'INVALID_BUSINESS_HOURS',
          message: 'A abertura deve ser anterior ao fechamento.',
        });
      }
    }
  }

  private assertPartnerActive(status: PartnerStatus): void {
    if (status === PartnerStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'PARTNER_SUSPENDED',
        message: 'O parceiro suspenso não pode alterar unidades.',
      });
    }
  }

  private assertUnitNotSuspended(status: PartnerUnitStatus): void {
    if (status === PartnerUnitStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'UNIT_SUSPENDED',
        message: 'A unidade suspensa só pode ser alterada pelo administrador.',
      });
    }
  }

  private assertUnitComplete(unit: UnitWithDetails): void {
    const missingRequirements = getMissingRequirements(unit);

    if (missingRequirements.length) {
      throw new ConflictException({
        code: 'UNIT_INCOMPLETE',
        message: 'Conclua a configuração antes de ativar a unidade.',
        missingRequirements,
      });
    }
  }

  private async findPartnerUnit(
    userId: string,
    unitId: string,
  ): Promise<UnitWithDetails> {
    const unit = await this.prismaService.partnerUnit.findFirst({
      include: UNIT_DETAILS_INCLUDE,
      where: { id: unitId, partner: { members: { some: { userId } } } },
    });

    if (!unit) {
      throw this.unitNotFound();
    }

    return unit;
  }

  private async findWritablePartnerUnit(
    userId: string,
    unitId: string,
  ): Promise<UnitWithDetails> {
    const unit = await this.findPartnerUnit(userId, unitId);
    this.assertPartnerActive(unit.partner.status);
    this.assertUnitNotSuspended(unit.status);
    return unit;
  }

  private async findUnit(unitId: string): Promise<UnitWithDetails> {
    const unit = await this.prismaService.partnerUnit.findUnique({
      include: UNIT_DETAILS_INCLUDE,
      where: { id: unitId },
    });

    if (!unit) throw this.unitNotFound();
    return unit;
  }

  private unitNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PARTNER_UNIT_NOT_FOUND',
      message: 'Unidade parceira não encontrada.',
    });
  }

  private async loadCatalogs() {
    const [plans, services] = await Promise.all([
      this.prismaService.plan.findMany({ orderBy: { displayOrder: 'asc' } }),
      this.prismaService.service.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return { plans, services };
  }

  private async mapUnit(
    unit: UnitWithDetails,
    includePartner = false,
  ): Promise<PartnerUnitResponseDto> {
    return toPartnerUnitResponse(
      unit,
      await this.loadCatalogs(),
      includePartner,
    );
  }

  private async reconcileActiveStatus(unitId: string): Promise<void> {
    const unit = await this.findUnit(unitId);

    if (
      unit.status === PartnerUnitStatus.ACTIVE &&
      getMissingRequirements(unit).length
    ) {
      await this.prismaService.partnerUnit.update({
        data: { status: PartnerUnitStatus.DRAFT },
        where: { id: unitId },
      });
    }
  }
}
