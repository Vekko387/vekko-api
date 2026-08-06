import type { PrismaService } from '../../database/prisma.service';
import { PartnerStatus, PartnerUnitStatus } from '../../generated/prisma/enums';
import type { UnitWithDetails } from './partner-unit.mapper';
import { PartnerUnitsService } from './partner-units.service';

const now = new Date('2026-08-06T18:00:00.000Z');

function createUnit(): UnitWithDetails {
  return {
    acceptedPlans: [],
    addressComplement: null,
    addressNumber: '123',
    businessHours: [],
    city: 'Uberlândia',
    createdAt: now,
    formattedAddress: 'Avenida Afonso Pena, 123',
    id: '00000000-0000-4000-8000-000000000201',
    lastGeocodedAt: null,
    latitude: null,
    longitude: null,
    mapProviderId: null,
    name: 'Unidade Centro',
    neighborhood: 'Centro',
    partner: {
      id: '00000000-0000-4000-8000-000000000202',
      status: PartnerStatus.ACTIVE,
      tradeName: 'Parceiro E2E',
    },
    partnerId: '00000000-0000-4000-8000-000000000202',
    phoneNormalized: '3433333333',
    postalCodeNormalized: '38400000',
    services: [],
    state: 'MG',
    status: PartnerUnitStatus.DRAFT,
    street: 'Avenida Afonso Pena',
    updatedAt: now,
    vehicleTypes: [],
    whatsappNormalized: null,
  };
}

describe('PartnerUnitsService', () => {
  it('requests a fresh geocode whenever a structured address field changes', async () => {
    const unit = createUnit();
    const update = jest.fn().mockResolvedValue(unit);
    const prismaService = {
      partnerUnit: {
        findFirst: jest.fn().mockResolvedValue(unit),
        update,
      },
      plan: { findMany: jest.fn().mockResolvedValue([]) },
      service: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const geocode = jest.fn().mockResolvedValue({
      formattedAddress: 'Rua Nova, 500 - Centro, Uberlândia - MG',
      latitude: -18.9186,
      longitude: -48.2772,
      providerId: 'new-place-id',
    });
    const service = new PartnerUnitsService(prismaService, {
      geocode,
    });

    await service.updateForPartner('user-id', unit.id, {
      addressNumber: '500',
      street: 'Rua Nova',
    });

    expect(geocode).toHaveBeenCalledWith({
      addressComplement: null,
      addressNumber: '500',
      city: 'Uberlândia',
      neighborhood: 'Centro',
      postalCode: '38400000',
      state: 'MG',
      street: 'Rua Nova',
    });
    const updateCalls: unknown = update.mock.calls;
    expect(updateCalls).toMatchObject([
      [
        {
          data: {
            addressNumber: '500',
            formattedAddress: 'Rua Nova, 500 - Centro, Uberlândia - MG',
            latitude: -18.9186,
            longitude: -48.2772,
            mapProviderId: 'new-place-id',
            street: 'Rua Nova',
          },
          where: { id: unit.id },
        },
      ],
    ]);
  });
});
