import type { Role, UserStatus } from '../../../generated/prisma/enums';

export type FirebaseIdentity = {
  email?: string;
  firebaseUid: string;
};

export type AuthenticatedUserProfile = {
  cpfNormalized?: string;
  fullName?: string;
  phoneNormalized?: string;
  profileCompletedAt?: Date;
};

export type AuthenticatedUser = {
  email: string | null;
  firebaseUid: string;
  id: string;
  profile: AuthenticatedUserProfile;
  roles: Role[];
  status: UserStatus;
};
