import { PlanCode, VehicleType } from '../../generated/prisma/enums';

export const VEHICLE_TYPES = [
  VehicleType.HATCH,
  VehicleType.SEDAN,
  VehicleType.SUV,
  VehicleType.PICKUP,
] as const;

export function isBasicVehicleRestriction(
  planCode: PlanCode,
  vehicleType: VehicleType,
): boolean {
  return (
    planCode === PlanCode.BASIC &&
    (vehicleType === VehicleType.SUV || vehicleType === VehicleType.PICKUP)
  );
}

export function isPlanEligibleForVehicle(
  planCode: PlanCode,
  vehicleType: VehicleType,
  configuredAsAllowed: boolean,
): boolean {
  return (
    configuredAsAllowed && !isBasicVehicleRestriction(planCode, vehicleType)
  );
}
