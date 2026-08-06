import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminPartnerApplicationsController } from './admin-partner-applications.controller';
import {
  FIREBASE_PASSWORD_RESET_EMAIL_CLIENT,
  FirebasePasswordResetEmailHttpClient,
} from './adapters/firebase-password-reset-email.client';
import { PartnerApplicationsController } from './partner-applications.controller';
import { PartnersController } from './partners.controller';
import { AdminPartnersController } from './admin-partners.controller';
import { PartnerApplicationsService } from './services/partner-applications.service';
import { PartnerApprovalService } from './services/partner-approval.service';
import { PartnerDetailsService } from './services/partner-details.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  controllers: [
    PartnerApplicationsController,
    AdminPartnerApplicationsController,
    PartnersController,
    AdminPartnersController,
  ],
  imports: [AuthModule, StorageModule],
  providers: [
    FirebasePasswordResetEmailHttpClient,
    {
      provide: FIREBASE_PASSWORD_RESET_EMAIL_CLIENT,
      useExisting: FirebasePasswordResetEmailHttpClient,
    },
    PartnerApplicationsService,
    PartnerApprovalService,
    PartnerDetailsService,
  ],
})
export class PartnersModule {}
