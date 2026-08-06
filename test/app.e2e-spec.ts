import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import {
  PlanCode,
  PlanStatus,
  Role,
  UserStatus,
  VehicleType,
} from '../src/generated/prisma/enums';
import { FirebaseAuthAdapter } from '../src/modules/auth/adapters/firebase-auth.adapter';
import { Roles } from '../src/modules/auth/decorators/roles.decorator';
import { FirebaseTokenVerificationError } from '../src/modules/auth/errors/firebase-token-verification.error';

@Controller('test-auth')
class AuthorizationProbeController {
  @Get('customer')
  @Roles(Role.CUSTOMER)
  customer(): { allowed: true } {
    return { allowed: true };
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  admin(): { allowed: true } {
    return { allowed: true };
  }
}

describe('Infrastructure health (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  const authenticatedFirebaseUid = `e2e-auth-${randomUUID()}`;
  const otherFirebaseUid = `e2e-auth-${randomUUID()}`;
  const adminFirebaseUid = `e2e-admin-${randomUUID()}`;
  const partnerApplicationCnpj = '11222333000181';
  let primaryVehicleId = '';
  let hatchVehicleId = '';
  let suvVehicleId = '';
  let pickupVehicleId = '';
  const firebaseAuthAdapter = {
    getUserIdentity: jest.fn(),
    verifyIdToken: jest.fn(
      (
        token: string,
      ): Promise<{
        email: string;
        firebaseUid: string;
      }> => {
        if (token === 'other-token') {
          return Promise.resolve({
            email: 'other.customer.e2e@vekko.test',
            firebaseUid: otherFirebaseUid,
          });
        }

        if (token === 'admin-token') {
          return Promise.resolve({
            email: 'admin.e2e@vekko.test',
            firebaseUid: adminFirebaseUid,
          });
        }

        if (token !== 'valid-token') {
          return Promise.reject(new FirebaseTokenVerificationError());
        }

        return Promise.resolve({
          email: 'customer.e2e@vekko.test',
          firebaseUid: authenticatedFirebaseUid,
        });
      },
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthorizationProbeController],
      imports: [AppModule],
    })
      .overrideProvider(FirebaseAuthAdapter)
      .useValue(firebaseAuthAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prismaService = app.get(PrismaService);
    await prismaService.partnerApplication.deleteMany({
      where: { cnpjNormalized: partnerApplicationCnpj },
    });
  });

  it('reports process liveness', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200)
      .expect(({ body }: { body: { service: string; status: string } }) => {
        expect(body.service).toBe('vekko-api');
        expect(body.status).toBe('ok');
      });
  });

  it('reports PostgreSQL and Redis readiness', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            details: Record<string, { status: string }>;
            status: string;
          };
        }) => {
          expect(body.status).toBe('ok');
          expect(body.details.postgresql?.status).toBe('up');
          expect(body.details.redis?.status).toBe('up');
        },
      );
  });

  it('returns 401 for a private route without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('returns 401 for an invalid token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('allows a valid token and returns the local user from /auth/me', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            email: string;
            firebaseUid: string;
            id: string;
            profile: Record<string, unknown>;
            roles: Role[];
          };
        }) => {
          expect(body.id).toEqual(expect.any(String));
          expect(body.firebaseUid).toBe(authenticatedFirebaseUid);
          expect(body.email).toBe('customer.e2e@vekko.test');
          expect(body.profile).toEqual({});
          expect(body.roles).toEqual([Role.CUSTOMER]);
        },
      );
  });

  it('allows access when the PostgreSQL role is correct', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/test-auth/customer')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect({ allowed: true });
  });

  it('completes the customer profile and keeps CPF immutable', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({
        cpf: '529.982.247-25',
        fullName: 'Cliente E2E',
        phone: '(34) 99999-8888',
      })
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            profile: {
              complete: boolean;
              cpfNormalized: string;
              fullName: string;
              phoneNormalized: string;
            };
          };
        }) => {
          expect(body.profile).toEqual(
            expect.objectContaining({
              complete: true,
              cpfNormalized: '52998224725',
              fullName: 'Cliente E2E',
              phoneNormalized: '34999998888',
            }),
          );
        },
      );

    await request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ cpf: '529.982.247-25' })
      .expect(200)
      .expect(({ body }: { body: { profile: { cpfNormalized: string } } }) => {
        expect(body.profile.cpfNormalized).toBe('52998224725');
      });

    await request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ cpf: '111.444.777-35' })
      .expect(409)
      .expect(
        ({
          body,
        }: {
          body: { code: string; message: string; statusCode: number };
        }) => {
          expect(body.statusCode).toBe(409);
          expect(body.code).toBe('CPF_IMMUTABLE');
          expect(body.message).toBe(
            'O CPF não pode ser alterado após o primeiro cadastro.',
          );
        },
      );
  });

  it('creates, normalizes and protects customer vehicles', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', 'Bearer valid-token')
      .send({
        brand: 'Toyota',
        color: 'Prata',
        model: 'Corolla',
        plate: 'abc-1d23',
        type: 'SEDAN',
      })
      .expect(201)
      .expect(
        ({
          body,
        }: {
          body: {
            id: string;
            isPrimary: boolean;
            plateNormalized: string;
            year: number | null;
            nickname: string | null;
          };
        }) => {
          primaryVehicleId = body.id;
          expect(body.isPrimary).toBe(true);
          expect(body.plateNormalized).toBe('ABC1D23');
          expect(body.year).toBeNull();
          expect(body.nickname).toBeNull();
        },
      );

    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', 'Bearer valid-token')
      .send({
        brand: 'Toyota',
        color: 'Prata',
        model: 'Corolla',
        plate: 'ABC 1D23',
        type: 'SEDAN',
      })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('VEHICLE_PLATE_ALREADY_IN_USE');
      });
  });

  it('enforces the five active vehicles per CPF limit', async () => {
    const additionalVehicles = [
      { plate: 'DEF1234', type: VehicleType.HATCH },
      { plate: 'GHI2J34', type: VehicleType.SUV },
      { plate: 'JKL3456', type: VehicleType.PICKUP },
      { plate: 'MNO4P56', type: VehicleType.HATCH },
    ];

    for (const { plate, type } of additionalVehicles) {
      await request(app.getHttpServer())
        .post('/api/v1/vehicles')
        .set('Authorization', 'Bearer valid-token')
        .send({
          brand: 'Marca E2E',
          color: 'Preto',
          model: 'Modelo E2E',
          plate,
          type,
        })
        .expect(201)
        .expect(({ body }: { body: { id: string } }) => {
          if (type === VehicleType.HATCH && !hatchVehicleId) {
            hatchVehicleId = body.id;
          }

          if (type === VehicleType.SUV) suvVehicleId = body.id;
          if (type === VehicleType.PICKUP) pickupVehicleId = body.id;
        });
    }

    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', 'Bearer valid-token')
      .send({
        brand: 'Marca E2E',
        color: 'Branco',
        model: 'Sexto veículo',
        plate: 'PQR5678',
        type: 'SUV',
      })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('VEHICLE_LIMIT_REACHED');
      });
  });

  it('does not expose a vehicle to another customer', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer other-token')
      .send({
        cpf: '111.444.777-35',
        fullName: 'Outro Cliente E2E',
        phone: '(34) 98888-7777',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${primaryVehicleId}`)
      .set('Authorization', 'Bearer other-token')
      .expect(404)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('VEHICLE_NOT_FOUND');
      });
  });

  it.each([
    ['Hatch', () => hatchVehicleId],
    ['Sedan', () => primaryVehicleId],
  ])(
    'shows all four plans as eligible for %s',
    async (_label, getVehicleId) => {
      await request(app.getHttpServer())
        .get(`/api/v1/plans?vehicleId=${getVehicleId()}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200)
        .expect(
          ({
            body,
          }: {
            body: {
              items: Array<{
                benefit: {
                  maxUsesPerDay: number | null;
                  mode: string;
                  washesPerCycle: number | null;
                };
                code: PlanCode;
                eligible: boolean;
                monthlyPriceCents: number;
              }>;
            };
          }) => {
            expect(body.items).toHaveLength(4);
            expect(body.items.every(({ eligible }) => eligible)).toBe(true);
            expect(body.items.map(({ code }) => code)).toEqual([
              PlanCode.BASIC,
              PlanCode.ESSENTIAL,
              PlanCode.PREMIUM,
              PlanCode.UNLIMITED,
            ]);

            const unlimited = body.items.find(
              ({ code }) => code === PlanCode.UNLIMITED,
            );
            expect(unlimited).toEqual(
              expect.objectContaining({
                benefit: {
                  maxUsesPerDay: 1,
                  mode: 'UNLIMITED',
                  washesPerCycle: null,
                },
                monthlyPriceCents: 37990,
              }),
            );
          },
        );
    },
  );

  it.each([
    ['SUV', () => suvVehicleId],
    ['Pickup', () => pickupVehicleId],
  ])('shows Basic as unavailable for %s', async (_label, getVehicleId) => {
    await request(app.getHttpServer())
      .get(`/api/v1/plans?vehicleId=${getVehicleId()}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            items: Array<{
              code: PlanCode;
              eligible: boolean;
              ineligibilityCode: string | null;
            }>;
          };
        }) => {
          const basic = body.items.find(({ code }) => code === PlanCode.BASIC);
          expect(basic).toEqual(
            expect.objectContaining({
              eligible: false,
              ineligibilityCode: 'BASIC_NOT_AVAILABLE_FOR_VEHICLE_TYPE',
            }),
          );
        },
      );
  });

  it('does not calculate plans with a vehicle from another account', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/plans?vehicleId=${primaryVehicleId}`)
      .set('Authorization', 'Bearer other-token')
      .expect(404)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('VEHICLE_NOT_FOUND');
      });
  });

  it('does not allow a customer to access plan administration', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/plans')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('allows an admin to manage only the official plans', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    const admin = await prismaService.user.findUniqueOrThrow({
      where: { firebaseUid: adminFirebaseUid },
    });
    await prismaService.userRole.upsert({
      create: { role: Role.ADMIN, userId: admin.id },
      update: {},
      where: { userId_role: { role: Role.ADMIN, userId: admin.id } },
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/plans')
      .set('Authorization', 'Bearer admin-token')
      .expect(200)
      .expect(({ body }: { body: { items: unknown[] } }) => {
        expect(body.items).toHaveLength(4);
      });

    await request(app.getHttpServer())
      .post('/api/v1/admin/plans')
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'Plano extra' })
      .expect(404);
  });

  it('protects immutable plan codes and the Basic eligibility rule', async () => {
    const basic = await prismaService.plan.findUniqueOrThrow({
      where: { code: PlanCode.BASIC },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/plans/${basic.id}`)
      .set('Authorization', 'Bearer admin-token')
      .send({ code: PlanCode.ESSENTIAL })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('PLAN_CODE_IMMUTABLE');
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/plans/${basic.id}`)
      .set('Authorization', 'Bearer admin-token')
      .send({
        eligibleVehicleTypes: [
          VehicleType.HATCH,
          VehicleType.SEDAN,
          VehicleType.SUV,
        ],
      })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('BASIC_PLAN_VEHICLE_RESTRICTION');
      });
  });

  it('reflects admin price changes and hides inactive plans from customers', async () => {
    const essential = await prismaService.plan.findUniqueOrThrow({
      where: { code: PlanCode.ESSENTIAL },
    });
    const premium = await prismaService.plan.findUniqueOrThrow({
      where: { code: PlanCode.PREMIUM },
    });
    const temporaryPrice = essential.monthlyPriceCents + 100;

    try {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/plans/${essential.id}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ monthlyPriceCents: temporaryPrice })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/plans/${premium.id}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: PlanStatus.INACTIVE })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/plans?vehicleId=${primaryVehicleId}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200)
        .expect(
          ({
            body,
          }: {
            body: {
              items: Array<{
                code: PlanCode;
                monthlyPriceCents: number;
              }>;
            };
          }) => {
            expect(body.items).toHaveLength(3);
            expect(
              body.items.find(({ code }) => code === PlanCode.ESSENTIAL)
                ?.monthlyPriceCents,
            ).toBe(temporaryPrice);
            expect(
              body.items.some(({ code }) => code === PlanCode.PREMIUM),
            ).toBe(false);
          },
        );
    } finally {
      await prismaService.plan.update({
        data: { monthlyPriceCents: essential.monthlyPriceCents },
        where: { id: essential.id },
      });
      await prismaService.plan.update({
        data: { status: PlanStatus.ACTIVE },
        where: { id: premium.id },
      });
    }
  });

  it('blocks API access even while the Firebase token is still valid', async () => {
    await prismaService.user.update({
      data: { status: UserStatus.BLOCKED },
      where: { firebaseUid: authenticatedFirebaseUid },
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(403)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('ACCOUNT_BLOCKED');
      });

    await prismaService.user.update({
      data: { status: UserStatus.ACTIVE },
      where: { firebaseUid: authenticatedFirebaseUid },
    });
  });

  it('returns 403 when the PostgreSQL role is incorrect', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/test-auth/admin')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('accepts a public partner application without Firebase authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/partner-applications')
      .send({
        addressNumber: '123',
        businessCategory: 'Centro automotivo',
        city: 'Fortaleza',
        cnpj: partnerApplicationCnpj,
        contactEmail: 'partner.application.e2e@vekko.test',
        contactPhone: '85999999999',
        legalName: 'Parceiro E2E LTDA',
        neighborhood: 'Aldeota',
        postalCode: '60160120',
        responsibleName: 'Parceiro E2E',
        serviceDescription: 'Serviços automotivos para o teste E2E.',
        state: 'CE',
        street: 'Avenida Exemplo',
        termsAccepted: true,
        tradeName: 'Auto Center E2E',
      })
      .expect(201)
      .expect(
        ({
          body,
        }: {
          body: {
            id: string;
            reviewDeadlineAt: string;
            status: string;
            submittedAt: string;
          };
        }) => {
          expect(body.id).toEqual(expect.any(String));
          expect(body.status).toBe('PENDING_REVIEW');
          expect(new Date(body.reviewDeadlineAt).getTime()).toBe(
            new Date(body.submittedAt).getTime() + 48 * 60 * 60 * 1_000,
          );
        },
      );
  });

  it('protects partner application review endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/partner-applications')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/partner-applications')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('persists the minimum authentication foundation', async () => {
    const firebaseUid = `e2e-${randomUUID()}`;

    const user = await prismaService.user.create({
      data: {
        firebaseUid,
        profile: {
          create: {},
        },
        roles: {
          create: {
            role: Role.CUSTOMER,
          },
        },
      },
      include: {
        profile: true,
        roles: true,
      },
    });

    try {
      expect(user.profile?.userId).toBe(user.id);
      expect(user.roles).toEqual([
        expect.objectContaining({ role: Role.CUSTOMER }),
      ]);
    } finally {
      await prismaService.user.delete({ where: { id: user.id } });
    }
  });

  afterAll(async () => {
    if (prismaService) {
      await prismaService.partnerApplication.deleteMany({
        where: { cnpjNormalized: partnerApplicationCnpj },
      });
      await prismaService.vehicle.deleteMany({
        where: {
          user: {
            firebaseUid: { in: [authenticatedFirebaseUid, otherFirebaseUid] },
          },
        },
      });
      await prismaService.user.deleteMany({
        where: {
          firebaseUid: {
            in: [authenticatedFirebaseUid, otherFirebaseUid, adminFirebaseUid],
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });
});
