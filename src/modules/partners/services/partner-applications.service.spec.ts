import { BadRequestException, ConflictException } from '@nestjs/common';
import { PartnerApplicationStatus } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma.service';
import type { CreatePartnerApplicationDto } from '../dto/create-partner-application.dto';
import { PartnerApplicationsService } from './partner-applications.service';

const submittedAt = new Date('2026-07-31T15:00:00.000Z');
const application = {
  addressComplement: null,
  addressNumber: '123',
  businessCategory: 'Centro automotivo',
  city: 'Fortaleza',
  cnpjNormalized: '11222333000181',
  contactEmail: 'partner@example.com',
  contactPhone: '85999999999',
  id: '6178321f-5e67-4968-96ab-1623641852ae',
  invitationSentAt: null,
  legalName: 'Parceiro Exemplo LTDA',
  neighborhood: 'Aldeota',
  postalCodeNormalized: '60160120',
  rejectionReason: null,
  responsibleName: 'Maria da Silva',
  reviewedAt: null,
  reviewedById: null,
  serviceDescription: 'Serviços automotivos completos.',
  state: 'CE',
  status: PartnerApplicationStatus.PENDING_REVIEW,
  street: 'Avenida Exemplo',
  submittedAt,
  termsAcceptedAt: submittedAt,
  tradeName: 'Auto Center Exemplo',
};

const input: CreatePartnerApplicationDto = {
  addressNumber: '123',
  businessCategory: 'Centro automotivo',
  city: 'Fortaleza',
  cnpj: '11.222.333/0001-81',
  contactEmail: ' Partner@Example.COM ',
  contactPhone: '(85) 99999-9999',
  legalName: 'Parceiro Exemplo LTDA',
  neighborhood: 'Aldeota',
  postalCode: '60.160-120',
  responsibleName: 'Maria da Silva',
  serviceDescription: 'Serviços automotivos completos.',
  state: 'ce',
  street: 'Avenida Exemplo',
  termsAccepted: true,
  tradeName: 'Auto Center Exemplo',
};

describe('PartnerApplicationsService', () => {
  const findFirst = jest.fn();
  const create = jest.fn();
  const prismaService = {
    partnerApplication: {
      create,
      findFirst,
    },
  } as unknown as PrismaService;
  const service = new PartnerApplicationsService(prismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pending partner-only application without creating roles', async () => {
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(application);

    await expect(service.submit(input)).resolves.toEqual({
      id: application.id,
      reviewDeadlineAt: new Date('2026-08-02T15:00:00.000Z'),
      status: PartnerApplicationStatus.PENDING_REVIEW,
      submittedAt,
    });
    const createCalls: unknown = create.mock.calls;
    expect(createCalls).toMatchObject([
      [
        {
          data: {
            cnpjNormalized: '11222333000181',
            contactEmail: 'partner@example.com',
            contactPhone: '85999999999',
            postalCodeNormalized: '60160120',
            state: 'CE',
          },
        },
      ],
    ]);
  });

  it('rejects an invalid CNPJ before accessing the database', async () => {
    await expect(
      service.submit({ ...input, cnpj: '11222333000182' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('prevents another pending application for the same CNPJ', async () => {
    findFirst.mockResolvedValue(application);

    await expect(service.submit(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
  });
});
