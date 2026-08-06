import type {
  PlanBenefitMode,
  PlanCode,
  PlanStatus,
  VehicleType,
} from '../../generated/prisma/enums';
import {
  AdminPlanResponseDto,
  CustomerPlanResponseDto,
} from './dto/plan-response.dto';
import {
  isBasicVehicleRestriction,
  isPlanEligibleForVehicle,
  VEHICLE_TYPES,
} from './plan-rules';

export type PlanRecord = {
  id: string;
  code: PlanCode;
  name: string;
  description: string;
  monthlyPriceCents: number;
  status: PlanStatus;
  displayOrder: number;
  benefit: {
    mode: PlanBenefitMode;
    washesPerCycle: number | null;
    maxUsesPerDay: number | null;
  } | null;
  vehicleEligibilities: {
    vehicleType: VehicleType;
    allowed: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

function getBenefit(plan: PlanRecord) {
  if (!plan.benefit) {
    throw new Error(`Plan ${plan.code} does not have a benefit configuration.`);
  }

  return {
    maxUsesPerDay: plan.benefit.maxUsesPerDay,
    mode: plan.benefit.mode,
    washesPerCycle: plan.benefit.washesPerCycle,
  };
}

function sortedEligibilities(plan: PlanRecord) {
  return VEHICLE_TYPES.map((vehicleType) => ({
    allowed:
      plan.vehicleEligibilities.find(
        (eligibility) => eligibility.vehicleType === vehicleType,
      )?.allowed ?? false,
    vehicleType,
  }));
}

export function toAdminPlanResponse(plan: PlanRecord): AdminPlanResponseDto {
  return {
    benefit: getBenefit(plan),
    code: plan.code,
    createdAt: plan.createdAt,
    description: plan.description,
    displayOrder: plan.displayOrder,
    id: plan.id,
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    status: plan.status,
    updatedAt: plan.updatedAt,
    vehicleEligibilities: sortedEligibilities(plan),
  };
}

export function toCustomerPlanResponse(
  plan: PlanRecord,
  vehicleType: VehicleType,
): CustomerPlanResponseDto {
  const configuredAsAllowed =
    plan.vehicleEligibilities.find(
      (eligibility) => eligibility.vehicleType === vehicleType,
    )?.allowed ?? false;
  const eligible = isPlanEligibleForVehicle(
    plan.code,
    vehicleType,
    configuredAsAllowed,
  );
  const basicRestriction = isBasicVehicleRestriction(plan.code, vehicleType);

  return {
    ...toAdminPlanResponse(plan),
    eligible,
    ineligibilityCode: eligible
      ? null
      : basicRestriction
        ? 'BASIC_NOT_AVAILABLE_FOR_VEHICLE_TYPE'
        : 'PLAN_NOT_AVAILABLE_FOR_VEHICLE_TYPE',
    ineligibilityMessage: eligible
      ? null
      : basicRestriction
        ? 'O plano Basic não está disponível para SUV ou Pickup.'
        : 'Este plano não está disponível para o veículo selecionado.',
  };
}
