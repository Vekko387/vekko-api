import type { Role, UserStatus } from '../../generated/prisma/enums';
import { CustomerUserResponseDto } from './dto/user-response.dto';

export type CustomerUserRecord = {
  id: string;
  email: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    fullName: string | null;
    cpfNormalized: string | null;
    phoneNormalized: string | null;
    profileCompletedAt: Date | null;
  } | null;
  roles: Array<{ role: Role }>;
  _count: { vehicles: number };
};

export function toCustomerUserResponse(
  user: CustomerUserRecord,
): CustomerUserResponseDto {
  return {
    activeVehicleCount: user._count.vehicles,
    createdAt: user.createdAt,
    email: user.email,
    id: user.id,
    profile: {
      complete: Boolean(user.profile?.profileCompletedAt),
      completedAt: user.profile?.profileCompletedAt ?? null,
      cpfNormalized: user.profile?.cpfNormalized ?? null,
      fullName: user.profile?.fullName ?? null,
      phoneNormalized: user.profile?.phoneNormalized ?? null,
    },
    roles: user.roles.map(({ role }) => role).sort(),
    status: user.status,
    updatedAt: user.updatedAt,
  };
}
