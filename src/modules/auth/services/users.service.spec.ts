import { PrismaService } from '../../../database/prisma.service';
import { Role } from '../../../generated/prisma/enums';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const customerRecord = {
    createdAt: new Date(),
    email: 'cliente@vekko.test',
    firebaseUid: 'firebase-customer',
    id: 'a957f910-3183-4644-907e-0c6da6e693cb',
    profile: {
      cpfNormalized: null,
    },
    roles: [
      {
        assignedAt: new Date(),
        role: Role.CUSTOMER,
        userId: 'a957f910-3183-4644-907e-0c6da6e693cb',
      },
    ],
    updatedAt: new Date(),
  };

  it('creates new Firebase identities with CUSTOMER as the only automatic role', async () => {
    type UpsertInput = {
      create: {
        roles: {
          create: {
            role: Role;
          };
        };
      };
      where: {
        firebaseUid: string;
      };
    };
    const upsert = jest.fn<
      Promise<typeof customerRecord>,
      [input: UpsertInput]
    >();
    upsert.mockResolvedValue(customerRecord);
    const prismaService = {
      user: {
        upsert,
      },
    } as unknown as PrismaService;
    const service = new UsersService(prismaService);

    await expect(
      service.findOrCreateCustomer({
        email: 'cliente@vekko.test',
        firebaseUid: 'firebase-customer',
      }),
    ).resolves.toEqual({
      email: 'cliente@vekko.test',
      firebaseUid: 'firebase-customer',
      id: customerRecord.id,
      profile: {},
      roles: [Role.CUSTOMER],
    });
    const upsertInput = upsert.mock.calls[0]?.[0];

    expect(upsertInput?.create.roles.create.role).toBe(Role.CUSTOMER);
    expect(upsertInput?.where).toEqual({
      firebaseUid: 'firebase-customer',
    });
  });

  it('loads roles already authorized in PostgreSQL', async () => {
    const partnerRecord = {
      ...customerRecord,
      firebaseUid: 'firebase-partner',
      roles: [
        {
          assignedAt: new Date(),
          role: Role.PARTNER_OWNER,
          userId: customerRecord.id,
        },
      ],
    };
    const prismaService = {
      user: {
        upsert: jest.fn().mockResolvedValue(partnerRecord),
      },
    } as unknown as PrismaService;
    const service = new UsersService(prismaService);

    const user = await service.findOrCreateCustomer({
      firebaseUid: 'firebase-partner',
    });

    expect(user.roles).toEqual([Role.PARTNER_OWNER]);
  });
});
