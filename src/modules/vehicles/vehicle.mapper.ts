import type { VehicleStatus, VehicleType } from '../../generated/prisma/enums';
import {
  AdminVehicleResponseDto,
  VehicleResponseDto,
} from './dto/vehicle-response.dto';

export type VehicleRecord = {
  id: string;
  plateNormalized: string;
  type: VehicleType;
  brand: string;
  model: string;
  color: string;
  year: number | null;
  nickname: string | null;
  status: VehicleStatus;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toVehicleResponse(vehicle: VehicleRecord): VehicleResponseDto {
  return { ...vehicle };
}

export function toAdminVehicleResponse(
  vehicle: VehicleRecord & {
    user: {
      id: string;
      email: string | null;
      profile: {
        fullName: string | null;
        cpfNormalized: string | null;
      } | null;
    };
  },
): AdminVehicleResponseDto {
  const { user, ...vehicleData } = vehicle;

  return {
    ...vehicleData,
    owner: {
      cpfNormalized: user.profile?.cpfNormalized ?? null,
      email: user.email,
      fullName: user.profile?.fullName ?? null,
      id: user.id,
    },
  };
}
