import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  PlanBenefitMode,
  PlanCode,
  PlanStatus,
  PartnerUnitStatus,
  VehicleStatus,
  VehicleType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import {
  AdminPlanListResponseDto,
  AdminPlanResponseDto,
  CustomerPlanListResponseDto,
  CustomerPlanResponseDto,
} from './dto/plan-response.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto';
import { toAdminPlanResponse, toCustomerPlanResponse } from './plan.mapper';
import { isBasicVehicleRestriction, VEHICLE_TYPES } from './plan-rules';

const PLAN_INCLUDE = {
  benefit: true,
  vehicleEligibilities: true,
} as const;

@Injectable()
export class PlansService {
  constructor(private readonly prismaService: PrismaService) {}

  async listForCustomer(
    userId: string,
    vehicleId: string,
  ): Promise<CustomerPlanListResponseDto> {
    const vehicleType = await this.findOwnedActiveVehicleType(
      userId,
      vehicleId,
    );
    const plans = await this.prismaService.plan.findMany({
      include: PLAN_INCLUDE,
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
      where: { status: PlanStatus.ACTIVE },
    });

    return {
      items: plans.map((plan) => toCustomerPlanResponse(plan, vehicleType)),
    };
  }

  async findForCustomer(
    userId: string,
    vehicleId: string,
    planId: string,
  ): Promise<CustomerPlanResponseDto> {
    const vehicleType = await this.findOwnedActiveVehicleType(
      userId,
      vehicleId,
    );
    const plan = await this.prismaService.plan.findFirst({
      include: PLAN_INCLUDE,
      where: { id: planId, status: PlanStatus.ACTIVE },
    });

    if (!plan) {
      throw this.planNotFound();
    }

    return toCustomerPlanResponse(plan, vehicleType);
  }

  async listAdmin(): Promise<AdminPlanListResponseDto> {
    const plans = await this.prismaService.plan.findMany({
      include: PLAN_INCLUDE,
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });

    return { items: plans.map(toAdminPlanResponse) };
  }

  async findAdmin(planId: string): Promise<AdminPlanResponseDto> {
    return toAdminPlanResponse(await this.findPlan(planId));
  }

  async updateAdmin(
    planId: string,
    input: UpdatePlanDto,
  ): Promise<AdminPlanResponseDto> {
    const current = await this.findPlan(planId);
    this.validateImmutableCode(current.code, input.code);
    this.validateEligibility(current.code, input.eligibleVehicleTypes);
    this.validateBenefitUpdate(current.code, current.benefit?.mode, input);

    await this.prismaService.$transaction(async (transaction) => {
      await this.updateDisplayOrder(
        transaction,
        planId,
        current.displayOrder,
        input.displayOrder,
      );

      await transaction.plan.update({
        data: {
          ...(input.name !== undefined
            ? { name: this.requiredTrimmed(input.name, 'nome') }
            : {}),
          ...(input.description !== undefined
            ? {
                description: this.requiredTrimmed(
                  input.description,
                  'descrição',
                ),
              }
            : {}),
          ...(input.monthlyPriceCents !== undefined
            ? { monthlyPriceCents: input.monthlyPriceCents }
            : {}),
          ...(input.displayOrder !== undefined
            ? { displayOrder: input.displayOrder }
            : {}),
        },
        where: { id: planId },
      });

      if (input.washesPerCycle !== undefined) {
        await transaction.planBenefit.update({
          data: { washesPerCycle: input.washesPerCycle },
          where: { planId },
        });
      }

      if (input.eligibleVehicleTypes !== undefined) {
        await this.replaceEligibilities(
          transaction,
          planId,
          input.eligibleVehicleTypes,
        );
      }
    });

    return this.findAdmin(planId);
  }

  async updateStatusAdmin(
    planId: string,
    input: UpdatePlanStatusDto,
  ): Promise<AdminPlanResponseDto> {
    await this.findPlan(planId);
    await this.prismaService.plan.update({
      data: { status: input.status },
      where: { id: planId },
    });

    if (input.status === PlanStatus.INACTIVE) {
      await this.prismaService.partnerUnit.updateMany({
        data: { status: PartnerUnitStatus.DRAFT },
        where: {
          acceptedPlans: {
            none: { plan: { status: PlanStatus.ACTIVE } },
          },
          status: PartnerUnitStatus.ACTIVE,
        },
      });
    }

    return this.findAdmin(planId);
  }

  private async findOwnedActiveVehicleType(
    userId: string,
    vehicleId: string,
  ): Promise<VehicleType> {
    const vehicle = await this.prismaService.vehicle.findFirst({
      select: { type: true },
      where: { id: vehicleId, status: VehicleStatus.ACTIVE, userId },
    });

    if (!vehicle) {
      throw new NotFoundException({
        code: 'VEHICLE_NOT_FOUND',
        error: 'Not Found',
        message: 'Veículo não encontrado.',
      });
    }

    return vehicle.type;
  }

  private async findPlan(planId: string) {
    const plan = await this.prismaService.plan.findUnique({
      include: PLAN_INCLUDE,
      where: { id: planId },
    });

    if (!plan) {
      throw this.planNotFound();
    }

    return plan;
  }

  private planNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PLAN_NOT_FOUND',
      error: 'Not Found',
      message: 'Plano não encontrado.',
    });
  }

  private validateImmutableCode(
    currentCode: PlanCode,
    requestedCode?: PlanCode,
  ): void {
    if (requestedCode !== undefined && requestedCode !== currentCode) {
      throw new ConflictException({
        code: 'PLAN_CODE_IMMUTABLE',
        error: 'Conflict',
        message: 'O código interno do plano não pode ser alterado.',
      });
    }
  }

  private validateEligibility(
    planCode: PlanCode,
    vehicleTypes?: VehicleType[],
  ): void {
    if (
      vehicleTypes?.some((vehicleType) =>
        isBasicVehicleRestriction(planCode, vehicleType),
      )
    ) {
      throw new ConflictException({
        code: 'BASIC_PLAN_VEHICLE_RESTRICTION',
        error: 'Conflict',
        message: 'O plano Basic não pode ser liberado para SUV ou Pickup.',
      });
    }
  }

  private validateBenefitUpdate(
    planCode: PlanCode,
    benefitMode: PlanBenefitMode | undefined,
    input: UpdatePlanDto,
  ): void {
    if (
      input.washesPerCycle !== undefined &&
      (planCode === PlanCode.UNLIMITED ||
        benefitMode === PlanBenefitMode.UNLIMITED)
    ) {
      throw new ConflictException({
        code: 'UNLIMITED_PLAN_HAS_NO_BALANCE',
        error: 'Conflict',
        message: 'O plano Ilimitado não utiliza saldo de lavagens por ciclo.',
      });
    }
  }

  private requiredTrimmed(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException({
        code: 'INVALID_PLAN_DATA',
        error: 'Bad Request',
        message: `Informe ${field} do plano.`,
      });
    }

    return normalized;
  }

  private async updateDisplayOrder(
    transaction: Prisma.TransactionClient,
    planId: string,
    currentOrder: number,
    requestedOrder?: number,
  ): Promise<void> {
    if (requestedOrder === undefined || requestedOrder === currentOrder) {
      return;
    }

    if (requestedOrder > currentOrder) {
      await transaction.plan.updateMany({
        data: { displayOrder: { decrement: 1 } },
        where: {
          displayOrder: { gt: currentOrder, lte: requestedOrder },
          id: { not: planId },
        },
      });
      return;
    }

    await transaction.plan.updateMany({
      data: { displayOrder: { increment: 1 } },
      where: {
        displayOrder: { gte: requestedOrder, lt: currentOrder },
        id: { not: planId },
      },
    });
  }

  private async replaceEligibilities(
    transaction: Prisma.TransactionClient,
    planId: string,
    eligibleVehicleTypes: VehicleType[],
  ): Promise<void> {
    const allowed = new Set(eligibleVehicleTypes);

    for (const vehicleType of VEHICLE_TYPES) {
      await transaction.planVehicleEligibility.upsert({
        create: { allowed: allowed.has(vehicleType), planId, vehicleType },
        update: { allowed: allowed.has(vehicleType) },
        where: { planId_vehicleType: { planId, vehicleType } },
      });
    }
  }
}
