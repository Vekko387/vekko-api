import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma.service';
import {
  PartnerPhotoType,
  PartnerStatus,
} from '../../../generated/prisma/enums';
import type { StorageAdapter } from '../../storage/storage.adapter';
import { PartnerDetailsService } from './partner-details.service';

const activePartner = {
  addressComplement: null,
  addressNumber: '123',
  applicationId: '25b2db78-a10f-4ab5-81ee-d5fc0f2e1b49',
  businessCategory: 'Centro automotivo',
  city: 'Uberlândia',
  cnpjNormalized: '11222333000181',
  contactEmail: 'contato@partner.test',
  contactPhone: '34999999999',
  createdAt: new Date('2026-08-06T12:00:00.000Z'),
  id: '710177f4-d653-4e52-a5ed-d69cc6cf87d7',
  legalName: 'Parceiro Teste LTDA',
  neighborhood: 'Centro',
  photos: [],
  postalCodeNormalized: '38400000',
  responsibleCpfNormalized: '52998224725',
  responsibleEmail: 'responsavel@partner.test',
  responsibleName: 'Maria Parceira',
  responsiblePhone: '34988888888',
  responsibleRole: 'Proprietária',
  serviceDescription: 'Estabelecimento automotivo de teste.',
  state: 'MG',
  status: PartnerStatus.ACTIVE,
  street: 'Avenida Teste',
  tradeName: 'Auto Teste',
  updatedAt: new Date('2026-08-06T12:00:00.000Z'),
  websiteOrInstagram: null,
  whatsappNormalized: '34999999999',
};

function createFixture(
  partner: Omit<typeof activePartner, 'status'> & {
    status: PartnerStatus;
  } = activePartner,
) {
  const findFirst = jest.fn().mockResolvedValue(partner);
  const findUnique = jest.fn().mockResolvedValue(partner);
  const update = jest.fn().mockResolvedValue(partner);
  const upsert = jest.fn().mockResolvedValue({});
  const prismaService = {
    partner: { findFirst, findUnique, update },
    partnerPhoto: { upsert },
  } as unknown as PrismaService;
  const storageUpload = jest.fn().mockResolvedValue({
    url: 'https://files.vekko.test/staging/partners/id/logo',
  });
  const storageAdapter = {
    upload: storageUpload,
  } as jest.Mocked<StorageAdapter>;
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'storage.prefix') return 'staging';
      throw new Error(`Unexpected config key: ${key}`);
    }),
  } as unknown as ConfigService;
  const service = new PartnerDetailsService(
    prismaService,
    configService,
    storageAdapter,
  );

  return {
    findFirst,
    findUnique,
    service,
    storageUpload,
    update,
    upsert,
  };
}

describe('PartnerDetailsService', () => {
  it('resolves the establishment only through the authenticated membership', async () => {
    const fixture = createFixture();

    await expect(fixture.service.findMe('user-id')).resolves.toMatchObject({
      id: activePartner.id,
      status: PartnerStatus.ACTIVE,
    });
    expect(fixture.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { members: { some: { userId: 'user-id' } } },
      }),
    );
  });

  it('keeps suspended partners readable but blocks their edits', async () => {
    const fixture = createFixture({
      ...activePartner,
      status: PartnerStatus.SUSPENDED,
    });

    await expect(
      fixture.service.updateMe('user-id', { tradeName: 'Novo nome' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fixture.update).not.toHaveBeenCalled();
  });

  it('stores the binary in R2 and persists only the resulting URL', async () => {
    const photoUrl = 'https://files.vekko.test/staging/partners/id/logo';
    const fixture = createFixture();
    fixture.findUnique.mockResolvedValue({
      ...activePartner,
      photos: [
        {
          createdAt: activePartner.createdAt,
          id: 'photo-id',
          partnerId: activePartner.id,
          type: PartnerPhotoType.LOGO,
          updatedAt: activePartner.updatedAt,
          url: photoUrl,
        },
      ],
    });
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);

    await expect(
      fixture.service.uploadMyPhoto('user-id', PartnerPhotoType.LOGO, {
        buffer: png,
        mimetype: 'image/png',
        originalname: 'logo.png',
        size: png.length,
      }),
    ).resolves.toMatchObject({ photos: [{ type: PartnerPhotoType.LOGO }] });
    const storageCalls: unknown = fixture.storageUpload.mock.calls;
    expect(storageCalls).toMatchObject([
      [
        {
          body: png,
          contentType: 'image/png',
          key: `staging/partners/${activePartner.id}/logo`,
        },
      ],
    ]);
    const upsertCalls: unknown = fixture.upsert.mock.calls;
    expect(upsertCalls).toMatchObject([
      [
        {
          create: { url: photoUrl },
          update: { url: photoUrl },
        },
      ],
    ]);
  });
});
