import { PrismaService } from '../../database/prisma.service';
import { CustomerUsersService } from './users.service';

describe('CustomerUsersService', () => {
  it('rejects a CPF change after the first successful registration', async () => {
    const updateProfile = jest.fn();
    const transactionClient = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      userProfile: {
        findUnique: jest.fn().mockResolvedValue({
          cpfNormalized: '52998224725',
          fullName: 'Cliente VEKKO',
          phoneNormalized: '34999998888',
          profileCompletedAt: new Date('2026-08-02T12:00:00.000Z'),
          userId: 'a82de3ee-e2a5-4a50-bd84-62e2d0826461',
        }),
        update: updateProfile,
      },
    };
    const prismaService = {
      $transaction: jest.fn(
        async (
          operation: (
            transaction: typeof transactionClient,
          ) => Promise<unknown>,
        ) => operation(transactionClient),
      ),
    } as unknown as PrismaService;
    const service = new CustomerUsersService(prismaService);

    await expect(
      service.updateMyProfile('a82de3ee-e2a5-4a50-bd84-62e2d0826461', {
        cpf: '111.444.777-35',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'CPF_IMMUTABLE',
        message: 'O CPF não pode ser alterado após o primeiro cadastro.',
      },
    });
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
