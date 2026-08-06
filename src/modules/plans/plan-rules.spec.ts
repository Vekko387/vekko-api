import { PlanCode, VehicleType } from '../../generated/prisma/enums';
import {
  isBasicVehicleRestriction,
  isPlanEligibleForVehicle,
} from './plan-rules';

describe('plan rules', () => {
  it.each([VehicleType.SUV, VehicleType.PICKUP])(
    'blocks Basic for %s even when configured as allowed',
    (vehicleType) => {
      expect(isBasicVehicleRestriction(PlanCode.BASIC, vehicleType)).toBe(true);
      expect(isPlanEligibleForVehicle(PlanCode.BASIC, vehicleType, true)).toBe(
        false,
      );
    },
  );

  it.each([VehicleType.HATCH, VehicleType.SEDAN])(
    'allows Basic for %s when configured as allowed',
    (vehicleType) => {
      expect(isPlanEligibleForVehicle(PlanCode.BASIC, vehicleType, true)).toBe(
        true,
      );
    },
  );

  it('respects administrative eligibility for the other plans', () => {
    expect(
      isPlanEligibleForVehicle(PlanCode.PREMIUM, VehicleType.SUV, false),
    ).toBe(false);
  });
});
