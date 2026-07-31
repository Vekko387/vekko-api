import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminPartnerApplicationsController } from './admin-partner-applications.controller';
import {
  FIREBASE_PASSWORD_RESET_EMAIL_CLIENT,
  FirebasePasswordResetEmailHttpClient,
} from './adapters/firebase-password-reset-email.client';
import { PartnerApplicationsController } from './partner-applications.controller';
import { PartnerApplicationsService } from './services/partner-applications.service';
import { PartnerApprovalService } from './services/partner-approval.service';

@Module({
  controllers: [
    PartnerApplicationsController,
    AdminPartnerApplicationsController,
  ],
  imports: [AuthModule],
  providers: [
    FirebasePasswordResetEmailHttpClient,
    {
      provide: FIREBASE_PASSWORD_RESET_EMAIL_CLIENT,
      useExisting: FirebasePasswordResetEmailHttpClient,
    },
    PartnerApplicationsService,
    PartnerApprovalService,
  ],
})
export class PartnersModule {}
