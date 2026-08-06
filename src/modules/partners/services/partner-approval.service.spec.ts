import type { UserRecord } from 'firebase-admin/auth';
import type { PrismaService } from '../../../database/prisma.service';
import {
  PartnerApplicationStatus,
  PartnerMemberRole,
  Role,
} from '../../../generated/prisma/enums';
import type { FirebaseAuthClient } from '../../auth/adapters/firebase-admin.client';
import type { FirebasePasswordResetEmailClient } from '../adapters/firebase-password-reset-email.client';
import { PartnerApprovalService } from './partner-approval.service';

const reviewedAt = new Date('2026-07-31T16:00:00.000Z');
const pendingApplication = {
  addressComplement: null,
  addressNumber: '123',
  businessCategory: 'Centro automotivo',
  city: 'Fortaleza',
  cnpjNormalized: '11222333000181',
  contactEmail: 'partner@example.com',
  contactPhone: '85999999999',
  id: '6178321f-5e67-4968-96ab-1623641852ae',
  invitationSentAt: null,
  legalName: 'Parceiro Exemplo LTDA',
  neighborhood: 'Aldeota',
  postalCodeNormalized: '60160120',
  rejectionReason: null,
  responsibleName: 'Maria da Silva',
  responsibleCpfNormalized: '52998224725',
  responsibleEmail: 'maria@example.com',
  responsiblePhone: '85988888888',
  responsibleRole: 'Proprietária',
  reviewedAt: null,
  reviewedById: null,
  serviceDescription: 'Serviços automotivos completos.',
  state: 'CE',
  status: PartnerApplicationStatus.PENDING_REVIEW,
  street: 'Avenida Exemplo',
  submittedAt: new Date('2026-07-31T15:00:00.000Z'),
  termsAcceptedAt: new Date('2026-07-31T15:00:00.000Z'),
  tradeName: 'Auto Center Exemplo',
  websiteOrInstagram: 'https://instagram.com/autocenter',
  whatsappNormalized: '85999999999',
};
const approvedApplication = {
  ...pendingApplication,
  reviewedAt,
  reviewedById: '0c60e058-f20b-442c-b788-b28d636fb5ee',
  status: PartnerApplicationStatus.APPROVED,
};

function createFixture(emailDeliverySucceeds: boolean) {
  const partnerMemberUpsert = jest.fn().mockResolvedValue({});
  const userRoleUpsert = jest.fn().mockResolvedValue({});
  const applicationReviewUpdate = jest
    .fn()
    .mockResolvedValue(approvedApplication);
  const transaction = {
    partner: {
      upsert: jest.fn().mockResolvedValue({ id: 'partner-id' }),
    },
    partnerApplication: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(pendingApplication),
      update: applicationReviewUpdate,
    },
    partnerMember: {
      upsert: partnerMemberUpsert,
    },
    partnerUnit: {
      upsert: jest.fn().mockResolvedValue({ id: 'partner-id' }),
    },
    user: {
      upsert: jest.fn().mockResolvedValue({ id: 'user-id' }),
    },
    userProfile: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    userRole: {
      upsert: userRoleUpsert,
    },
  };
  const updateInvitation = jest.fn().mockResolvedValue({
    ...approvedApplication,
    invitationSentAt: reviewedAt,
  });
  const prismaService = {
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
    partnerApplication: {
      findUnique: jest.fn().mockResolvedValue(pendingApplication),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        ...approvedApplication,
        invitationSentAt: emailDeliverySucceeds ? reviewedAt : null,
      }),
      update: updateInvitation,
    },
  } as unknown as PrismaService;
  const firebaseUser = {
    disabled: false,
    email: 'partner@example.com',
    uid: 'firebase-partner-owner',
  } as UserRecord;
  const createFirebaseUser = jest.fn().mockResolvedValue(firebaseUser);
  const firebaseAuthClient = {
    createUser: createFirebaseUser,
    findUserByEmail: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<FirebaseAuthClient>;
  const sendPasswordResetEmail = emailDeliverySucceeds
    ? jest.fn().mockResolvedValue(undefined)
    : jest.fn().mockRejectedValue(new Error('provider unavailable'));
  const passwordResetEmailClient = {
    sendPasswordResetEmail,
  } as jest.Mocked<FirebasePasswordResetEmailClient>;
  const service = new PartnerApprovalService(
    prismaService,
    firebaseAuthClient,
    passwordResetEmailClient,
  );

  return {
    applicationReviewUpdate,
    createFirebaseUser,
    partnerMemberUpsert,
    partnerUnitUpsert: transaction.partnerUnit.upsert,
    sendPasswordResetEmail,
    service,
    transaction,
    updateInvitation,
    userRoleUpsert,
  };
}

describe('PartnerApprovalService', () => {
  it('creates the Firebase identity and grants PARTNER_OWNER only on approval', async () => {
    const fixture = createFixture(true);

    await expect(
      fixture.service.approve(
        pendingApplication.id,
        approvedApplication.reviewedById,
      ),
    ).resolves.toMatchObject({ invitationSent: true });
    const createFirebaseUserCalls: unknown =
      fixture.createFirebaseUser.mock.calls;
    expect(createFirebaseUserCalls).toMatchObject([
      [
        {
          disabled: false,
          email: pendingApplication.contactEmail,
        },
      ],
    ]);
    const userRoleCalls: unknown = fixture.userRoleUpsert.mock.calls;
    expect(userRoleCalls).toMatchObject([
      [{ create: { role: Role.PARTNER_OWNER, userId: 'user-id' } }],
    ]);
    const partnerMemberCalls: unknown = fixture.partnerMemberUpsert.mock.calls;
    expect(partnerMemberCalls).toMatchObject([
      [{ create: { role: PartnerMemberRole.OWNER } }],
    ]);
    expect(fixture.sendPasswordResetEmail).toHaveBeenCalledWith(
      pendingApplication.contactEmail,
    );
    const partnerUnitCalls: unknown = fixture.partnerUnitUpsert.mock.calls;
    expect(partnerUnitCalls).toMatchObject([
      [
        {
          create: {
            id: 'partner-id',
            name: 'Unidade principal',
            partnerId: 'partner-id',
          },
          where: { id: 'partner-id' },
        },
      ],
    ]);
  });

  it('keeps the approval valid when Firebase email delivery is temporarily unavailable', async () => {
    const fixture = createFixture(false);

    await expect(
      fixture.service.approve(
        pendingApplication.id,
        approvedApplication.reviewedById,
      ),
    ).resolves.toMatchObject({ invitationSent: false });
    const applicationReviewCalls: unknown =
      fixture.applicationReviewUpdate.mock.calls;
    expect(applicationReviewCalls).toMatchObject([
      [{ data: { status: PartnerApplicationStatus.APPROVED } }],
    ]);
    expect(fixture.updateInvitation).not.toHaveBeenCalled();
  });
});
