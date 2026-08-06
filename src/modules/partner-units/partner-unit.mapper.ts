import { Prisma } from '../../generated/prisma/client';
import {
  PlanStatus,
  ServiceStatus,
  VehicleType,
} from '../../generated/prisma/enums';
import type {
  PartnerUnitResponseDto,
  UnitPlanOptionResponseDto,
  UnitServiceOptionResponseDto,
  UnitVehicleTypeOptionResponseDto,
} from './dto/partner-unit-response.dto';

export const UNIT_DETAILS_INCLUDE = {
  acceptedPlans: { include: { plan: true } },
  businessHours: { orderBy: { dayOfWeek: 'asc' } },
  partner: { select: { id: true, status: true, tradeName: true } },
  services: { include: { service: true } },
  vehicleTypes: { orderBy: { vehicleType: 'asc' } },
} as const;

export type UnitWithDetails = Prisma.PartnerUnitGetPayload<{
  include: typeof UNIT_DETAILS_INCLUDE;
}>;

export type ServiceCatalogItem = Prisma.ServiceGetPayload<
  Record<string, never>
>;
export type PlanCatalogItem = Prisma.PlanGetPayload<Record<string, never>>;

const ALL_VEHICLE_TYPES = [
  VehicleType.HATCH,
  VehicleType.SEDAN,
  VehicleType.SUV,
  VehicleType.PICKUP,
] as const;

export function getMissingRequirements(unit: UnitWithDetails): string[] {
  const missing: string[] = [];
  const hasLocation =
    unit.latitude !== null &&
    unit.longitude !== null &&
    unit.lastGeocodedAt !== null;
  const configuredDays = new Set(
    unit.businessHours.map((hour) => hour.dayOfWeek),
  );
  const hasSevenDays =
    configuredDays.size === 7 &&
    Array.from({ length: 7 }, (_, day) => day).every((day) =>
      configuredDays.has(day),
    );
  const hasActiveService = unit.services.some(
    ({ service }) => service.status === ServiceStatus.ACTIVE,
  );
  const hasActivePlan = unit.acceptedPlans.some(
    ({ plan }) => plan.status === PlanStatus.ACTIVE,
  );

  if (!hasLocation) missing.push('LOCATION');
  if (!hasSevenDays) missing.push('BUSINESS_HOURS');
  if (!hasActiveService) missing.push('SERVICE');
  if (unit.vehicleTypes.length === 0) missing.push('VEHICLE_TYPE');
  if (!hasActivePlan) missing.push('PLAN');

  return missing;
}

export function toServiceOptions(
  unit: UnitWithDetails,
  catalog: ServiceCatalogItem[],
): UnitServiceOptionResponseDto[] {
  const selected = new Set(unit.services.map(({ serviceId }) => serviceId));

  return catalog.map((service) => ({
    code: service.code,
    description: service.description,
    id: service.id,
    name: service.name,
    selected: selected.has(service.id),
    status: service.status,
  }));
}

export function toPlanOptions(
  unit: UnitWithDetails,
  catalog: PlanCatalogItem[],
): UnitPlanOptionResponseDto[] {
  const selected = new Set(unit.acceptedPlans.map(({ planId }) => planId));

  return catalog.map((plan) => ({
    code: plan.code,
    id: plan.id,
    name: plan.name,
    selected: selected.has(plan.id),
    status: plan.status,
  }));
}

export function toVehicleTypeOptions(
  unit: UnitWithDetails,
): UnitVehicleTypeOptionResponseDto[] {
  const selected = new Set(
    unit.vehicleTypes.map(({ vehicleType }) => vehicleType),
  );

  return ALL_VEHICLE_TYPES.map((type) => ({
    selected: selected.has(type),
    type,
  }));
}

export function toPartnerUnitResponse(
  unit: UnitWithDetails,
  catalogs: {
    plans: PlanCatalogItem[];
    services: ServiceCatalogItem[];
  },
  includePartner = false,
): PartnerUnitResponseDto {
  const missingRequirements = getMissingRequirements(unit);

  return {
    addressComplement: unit.addressComplement,
    addressNumber: unit.addressNumber,
    city: unit.city,
    configuration: {
      businessHours: unit.businessHours.map((hour) => ({
        closesAt: hour.closesAt,
        dayOfWeek: hour.dayOfWeek,
        isClosed: hour.isClosed,
        opensAt: hour.opensAt,
      })),
      plans: toPlanOptions(unit, catalogs.plans),
      services: toServiceOptions(unit, catalogs.services),
      vehicleTypes: toVehicleTypeOptions(unit),
    },
    createdAt: unit.createdAt,
    formattedAddress: unit.formattedAddress,
    id: unit.id,
    isComplete: missingRequirements.length === 0,
    lastGeocodedAt: unit.lastGeocodedAt,
    latitude: unit.latitude === null ? null : Number(unit.latitude),
    longitude: unit.longitude === null ? null : Number(unit.longitude),
    mapProviderId: unit.mapProviderId,
    missingRequirements,
    name: unit.name,
    neighborhood: unit.neighborhood,
    partnerId: unit.partnerId,
    ...(includePartner
      ? {
          partner: {
            id: unit.partner.id,
            status: unit.partner.status,
            tradeName: unit.partner.tradeName,
          },
        }
      : {}),
    phone: unit.phoneNormalized,
    postalCode: unit.postalCodeNormalized,
    state: unit.state,
    status: unit.status,
    street: unit.street,
    updatedAt: unit.updatedAt,
    whatsapp: unit.whatsappNormalized,
  };
}
