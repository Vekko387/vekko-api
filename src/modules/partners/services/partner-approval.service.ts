import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { UserRecord } from 'firebase-admin/auth';
import { PrismaService } from '../../../database/prisma.service';
import {
  PartnerApplicationStatus,
  PartnerMemberRole,
  Role,
} from '../../../generated/prisma/enums';
import {
  FIREBASE_AUTH_CLIENT,
  type FirebaseAuthClient,
} from '../../auth/adapters/firebase-admin.client';
import {
  FIREBASE_PASSWORD_RESET_EMAIL_CLIENT,
  type FirebasePasswordResetEmailClient,
} from '../adapters/firebase-password-reset-email.client';
import { PartnerApplicationResponseDto } from '../dto/partner-application-response.dto';
import { toPartnerApplicationResponse } from '../partner-application.mapper';

function isFirebaseEmailAlreadyInUse(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/email-already-exists'
  );
}

@Injectable()
export class PartnerApprovalService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(FIREBASE_AUTH_CLIENT)
    private readonly firebaseAuthClient: FirebaseAuthClient,
    @Inject(FIREBASE_PASSWORD_RESET_EMAIL_CLIENT)
    private readonly passwordResetEmailClient: FirebasePasswordResetEmailClient,
  ) {}

  async approve(
    applicationId: string,
    reviewerId: string,
  ): Promise<PartnerApplicationResponseDto> {
    const application = await this.prismaService.partnerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Solicitação de parceiro não encontrada.');
    }

    if (application.status === PartnerApplicationStatus.REJECTED) {
      throw new ConflictException(
        'Uma solicitação rejeitada não pode ser aprovada.',
      );
    }

    const firebaseUser = await this.ensureFirebaseUser(
      application.contactEmail,
      application.responsibleName,
    );
    const approvedApplication = await this.prismaService.$transaction(
      async (transaction) => {
        const currentApplication =
          await transaction.partnerApplication.findUniqueOrThrow({
            where: { id: applicationId },
          });

        if (currentApplication.status === PartnerApplicationStatus.REJECTED) {
          throw new ConflictException(
            'Uma solicitação rejeitada não pode ser aprovada.',
          );
        }

        const user = await transaction.user.upsert({
          create: {
            email: application.contactEmail,
            firebaseUid: firebaseUser.uid,
            profile: { create: {} },
          },
          update: { email: application.contactEmail },
          where: { firebaseUid: firebaseUser.uid },
        });

        await transaction.userProfile.upsert({
          create: { userId: user.id },
          update: {},
          where: { userId: user.id },
        });
        await transaction.userRole.upsert({
          create: { role: Role.PARTNER_OWNER, userId: user.id },
          update: {},
          where: {
            userId_role: { role: Role.PARTNER_OWNER, userId: user.id },
          },
        });

        const partner = await transaction.partner.upsert({
          create: {
            addressComplement: application.addressComplement,
            addressNumber: application.addressNumber,
            applicationId: application.id,
            businessCategory: application.businessCategory,
            city: application.city,
            cnpjNormalized: application.cnpjNormalized,
            contactEmail: application.contactEmail,
            contactPhone: application.contactPhone,
            legalName: application.legalName,
            neighborhood: application.neighborhood,
            postalCodeNormalized: application.postalCodeNormalized,
            serviceDescription: application.serviceDescription,
            state: application.state,
            street: application.street,
            tradeName: application.tradeName,
          },
          update: {},
          where: { applicationId: application.id },
        });

        await transaction.partnerMember.upsert({
          create: {
            partnerId: partner.id,
            role: PartnerMemberRole.OWNER,
            userId: user.id,
          },
          update: { role: PartnerMemberRole.OWNER },
          where: {
            partnerId_userId: { partnerId: partner.id, userId: user.id },
          },
        });

        if (
          currentApplication.status === PartnerApplicationStatus.PENDING_REVIEW
        ) {
          return transaction.partnerApplication.update({
            data: {
              rejectionReason: null,
              reviewedAt: new Date(),
              reviewedById: reviewerId,
              status: PartnerApplicationStatus.APPROVED,
            },
            where: { id: applicationId },
          });
        }

        return currentApplication;
      },
    );

    if (!approvedApplication.invitationSentAt) {
      await this.trySendInvitation(applicationId, application.contactEmail);
    }

    const refreshedApplication =
      await this.prismaService.partnerApplication.findUniqueOrThrow({
        where: { id: applicationId },
      });

    return toPartnerApplicationResponse(refreshedApplication);
  }

  async resendInvitation(
    applicationId: string,
  ): Promise<PartnerApplicationResponseDto> {
    const application = await this.prismaService.partnerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Solicitação de parceiro não encontrada.');
    }

    if (application.status !== PartnerApplicationStatus.APPROVED) {
      throw new ConflictException(
        'O convite só pode ser enviado para parceiros aprovados.',
      );
    }

    await this.ensureFirebaseUser(
      application.contactEmail,
      application.responsibleName,
    );

    try {
      await this.passwordResetEmailClient.sendPasswordResetEmail(
        application.contactEmail,
      );
    } catch {
      throw new ServiceUnavailableException(
        'A conta foi aprovada, mas o Firebase não enviou o convite. Tente novamente.',
      );
    }

    const updated = await this.prismaService.partnerApplication.update({
      data: { invitationSentAt: new Date() },
      where: { id: applicationId },
    });

    return toPartnerApplicationResponse(updated);
  }

  private async ensureFirebaseUser(
    email: string,
    displayName: string,
  ): Promise<UserRecord> {
    try {
      let firebaseUser = await this.firebaseAuthClient.findUserByEmail(email);

      if (!firebaseUser) {
        try {
          firebaseUser = await this.firebaseAuthClient.createUser({
            disabled: false,
            displayName,
            email,
            emailVerified: false,
          });
        } catch (error) {
          if (!isFirebaseEmailAlreadyInUse(error)) {
            throw error;
          }

          firebaseUser = await this.firebaseAuthClient.findUserByEmail(email);
        }
      }

      if (!firebaseUser) {
        throw new Error('Firebase user reconciliation failed.');
      }

      if (firebaseUser.disabled) {
        firebaseUser = await this.firebaseAuthClient.updateUser(
          firebaseUser.uid,
          {
            disabled: false,
          },
        );
      }

      return firebaseUser;
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível provisionar a conta do parceiro no Firebase.',
      );
    }
  }

  private async trySendInvitation(
    applicationId: string,
    email: string,
  ): Promise<void> {
    try {
      await this.passwordResetEmailClient.sendPasswordResetEmail(email);
      await this.prismaService.partnerApplication.update({
        data: { invitationSentAt: new Date() },
        where: { id: applicationId },
      });
    } catch {
      // A aprovação permanece válida e o Admin pode reenviar o convite.
    }
  }
}
