import { Module } from '@nestjs/common';
import { FirebaseAdminClient } from './adapters/firebase-admin.client';
import { FirebaseAuthAdapter } from './adapters/firebase-auth.adapter';
import { FIREBASE_AUTH_CLIENT } from './adapters/firebase-admin.client';
import { AuthController } from './auth.controller';
import { StagingUserProvisionerService } from './services/staging-user-provisioner.service';
import { UsersService } from './services/users.service';

@Module({
  controllers: [AuthController],
  providers: [
    FirebaseAdminClient,
    {
      provide: FIREBASE_AUTH_CLIENT,
      useExisting: FirebaseAdminClient,
    },
    FirebaseAuthAdapter,
    UsersService,
    StagingUserProvisionerService,
  ],
  exports: [
    FIREBASE_AUTH_CLIENT,
    FirebaseAuthAdapter,
    StagingUserProvisionerService,
    UsersService,
  ],
})
export class AuthModule {}
