import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { Role } from '../src/generated/prisma/enums';

describe('Infrastructure health (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await app.close();
  });
});
