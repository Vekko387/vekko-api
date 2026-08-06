import type { Prisma } from '../../generated/prisma/client';
import {
  PartnerStatus,
  PartnerUnitStatus,
  PlanCode,
  PlanStatus,
  ServiceStatus,
  VehicleType,
} from '../../generated/prisma/enums';
import {
  getMissingRequirements,
  type UnitWithDetails,
} from './partner-unit.mapper';

function createUnit(overrides: Partial<UnitWithDetails> = {}): UnitWithDetails {
  const now = new Date('2026-08-06T18:00:00.000Z');
  return {
    acceptedPlans: [
      {
        createdAt: now,
        plan: {
          code: PlanCode.ESSENTIAL,
          createdAt: now,
          description: 'Plano ativo',
          displayOrder: 2,
          id: '00000000-0000-4000-8000-000000000002',
          monthlyPriceCents: 11990,
          name: 'Essential',
          status: PlanStatus.ACTIVE,
          updatedAt: now,
        },
        planId: '00000000-0000-4000-8000-000000000002',
        unitId: 'unit-id',
      },
    ],
    addressComplement: null,
    addressNumber: '123',
    businessHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      closesAt: dayOfWeek === 0 ? null : '18:00',
      createdAt: now,
      dayOfWeek,
      isClosed: dayOfWeek === 0,
      opensAt: dayOfWeek === 0 ? null : '08:00',
      unitId: 'unit-id',
      updatedAt: now,
    })),
    city: 'Uberlândia',
    createdAt: now,
    formattedAddress: 'Avenida Afonso Pena, 123',
    id: 'unit-id',
    lastGeocodedAt: now,
    latitude: -18.9186 as unknown as Prisma.Decimal,
    longitude: -48.2772 as unknown as Prisma.Decimal,
    mapProviderId: 'place-id',
    name: 'Unidade Centro',
    neighborhood: 'Centro',
    partner: {
      id: 'partner-id',
      status: PartnerStatus.ACTIVE,
      tradeName: 'Parceiro',
    },
    partnerId: 'partner-id',
    phoneNormalized: '3433333333',
    postalCodeNormalized: '38400000',
    services: [
      {
        createdAt: now,
        service: {
          code: 'CAR_WASH',
          createdAt: now,
          description: null,
          id: 'service-id',
          name: 'Lavagem automotiva',
          status: ServiceStatus.ACTIVE,
          updatedAt: now,
        },
        serviceId: 'service-id',
        unitId: 'unit-id',
      },
    ],
    state: 'MG',
    status: PartnerUnitStatus.DRAFT,
    street: 'Avenida Afonso Pena',
    updatedAt: now,
    vehicleTypes: [
      {
        createdAt: now,
        unitId: 'unit-id',
        vehicleType: VehicleType.HATCH,
      },
    ],
    whatsappNormalized: null,
    ...overrides,
  };
}

describe('partner unit completion rules', () => {
  it('accepts a unit only after all activation requirements are configured', () => {
    expect(getMissingRequirements(createUnit())).toEqual([]);
  });

  it('reports invalid location and missing operational configuration', () => {
    expect(
      getMissingRequirements(
        createUnit({
          acceptedPlans: [],
          businessHours: [],
          lastGeocodedAt: null,
          latitude: null,
          longitude: null,
          services: [],
          vehicleTypes: [],
        }),
      ),
    ).toEqual([
      'LOCATION',
      'BUSINESS_HOURS',
      'SERVICE',
      'VEHICLE_TYPE',
      'PLAN',
    ]);
  });

  it('does not count inactive services or plans toward activation', () => {
    const unit = createUnit();
    unit.services[0].service.status = ServiceStatus.INACTIVE;
    unit.acceptedPlans[0].plan.status = PlanStatus.INACTIVE;

    expect(getMissingRequirements(unit)).toEqual(['SERVICE', 'PLAN']);
  });
});
