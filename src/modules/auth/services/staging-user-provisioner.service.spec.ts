import { ConfigService } from '@nestjs/config';
import { Role } from '../../../generated/prisma/enums';
import { FirebaseAuthAdapter } from '../adapters/firebase-auth.adapter';
import { UsersService } from './users.service';
import { StagingUserProvisionerService } from './staging-user-provisioner.service';

describe('StagingUserProvisionerService', () => {
  const provisionedUser = {
    email: 'admin@vekko.test',
    firebaseUid: 'firebase-admin',
    id: 'a9410d65-b313-47f8-a3a7-d0fec9c5ea4a',
    profile: {},
    roles: [Role.ADMIN],
  };

  function createService(environment: string) {
    const getUserIdentity = jest.fn().mockResolvedValue({
      email: 'admin@vekko.test',
      firebaseUid: 'firebase-admin',
    });
    const firebaseAuthAdapter = {
      getUserIdentity,
    } as unknown as jest.Mocked<FirebaseAuthAdapter>;
    const provisionInternalUser = jest.fn().mockResolvedValue(provisionedUser);
    const usersService = {
      provisionInternalUser,
    } as unknown as jest.Mocked<UsersService>;
    const service = new StagingUserProvisionerService(
      new ConfigService({
        app: {
          environment,
        },
      }),
      firebaseAuthAdapter,
      usersService,
    );

    return {
      firebaseAuthAdapter,
      getUserIdentity,
      provisionInternalUser,
      service,
      usersService,
    };
  }

  it('provisions an existing Firebase identity with an internal role in staging', async () => {
    const { getUserIdentity, provisionInternalUser, service } =
      createService('staging');

    await expect(
      service.provision('firebase-admin', Role.ADMIN),
    ).resolves.toEqual(provisionedUser);
    expect(getUserIdentity).toHaveBeenCalledWith('firebase-admin');
    expect(provisionInternalUser).toHaveBeenCalledWith(
      expect.objectContaining({ firebaseUid: 'firebase-admin' }),
      Role.ADMIN,
    );
  });

  it('never accepts CUSTOMER through the internal provisioning path', async () => {
    const { service } = createService('staging');

    await expect(
      service.provision('firebase-customer', Role.CUSTOMER),
    ).rejects.toThrow('Invalid Firebase UID or internal role.');
  });

  it('is disabled outside staging', async () => {
    const { service } = createService('production');

    await expect(
      service.provision('firebase-admin', Role.ADMIN),
    ).rejects.toThrow('Internal user provisioning is restricted to staging.');
  });
});
