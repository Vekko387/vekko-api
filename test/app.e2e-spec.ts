import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { Role } from '../src/generated/prisma/enums';
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
  const firebaseAuthAdapter = {
    getUserIdentity: jest.fn(),
    verifyIdToken: jest.fn(
      (
        token: string,
      ): Promise<{
        email: string;
        firebaseUid: string;
      }> => {
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
    await app.init();
    prismaService = app.get(PrismaService);
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

  it('returns 403 when the PostgreSQL role is incorrect', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/test-auth/admin')
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
      await prismaService.user.deleteMany({
        where: {
          firebaseUid: authenticatedFirebaseUid,
        },
      });
    }

    if (app) {
      await app.close();
    }
  });
});
