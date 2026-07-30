import type { Role } from '../../../generated/prisma/enums';

export type FirebaseIdentity = {
  email?: string;
  firebaseUid: string;
};

export type AuthenticatedUserProfile = {
  cpfNormalized?: string;
};

export type AuthenticatedUser = {
  email: string | null;
  firebaseUid: string;
  id: string;
  profile: AuthenticatedUserProfile;
  roles: Role[];
};
