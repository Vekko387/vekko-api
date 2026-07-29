import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns the service status', () => {
    expect(controller.check()).toEqual(
      expect.objectContaining({
        environment: 'test',
        service: 'vekko-api',
        status: 'ok',
        version: '0.1.0',
      }),
    );
  });
});
