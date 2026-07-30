import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const corsOrigins = configService.getOrThrow<string[]>('app.corsOrigins');
  const port = configService.getOrThrow<number>('app.port');

  app.setGlobalPrefix(apiPrefix);
  app.enableShutdownHooks();
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('VEKKO API')
    .setDescription('Contrato REST oficial da plataforma VEKKO.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        bearerFormat: 'Firebase ID Token',
        description: 'Firebase ID Token emitido para o projeto deste ambiente.',
        scheme: 'bearer',
        type: 'http',
      },
      'firebase',
    )
    .build();

  const openApiDocument = () =>
    SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, openApiDocument);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
