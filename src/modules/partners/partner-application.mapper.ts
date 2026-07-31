import type { PartnerApplicationModel } from '../../generated/prisma/models/PartnerApplication';
import {
  PartnerApplicationResponseDto,
  PartnerApplicationSubmissionResponseDto,
} from './dto/partner-application-response.dto';

const REVIEW_WINDOW_MS = 48 * 60 * 60 * 1_000;

export function toPartnerApplicationSubmissionResponse(
  application: PartnerApplicationModel,
): PartnerApplicationSubmissionResponseDto {
  return {
    id: application.id,
    reviewDeadlineAt: new Date(
      application.submittedAt.getTime() + REVIEW_WINDOW_MS,
    ),
    status: application.status,
    submittedAt: application.submittedAt,
  };
}

export function toPartnerApplicationResponse(
  application: PartnerApplicationModel,
): PartnerApplicationResponseDto {
  return {
    ...toPartnerApplicationSubmissionResponse(application),
    addressComplement: application.addressComplement ?? undefined,
    addressNumber: application.addressNumber,
    businessCategory: application.businessCategory,
    city: application.city,
    cnpj: application.cnpjNormalized,
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone,
    invitationSent: application.invitationSentAt !== null,
    legalName: application.legalName,
    neighborhood: application.neighborhood,
    postalCode: application.postalCodeNormalized,
    rejectionReason: application.rejectionReason ?? undefined,
    responsibleName: application.responsibleName,
    reviewedAt: application.reviewedAt ?? undefined,
    reviewedById: application.reviewedById ?? undefined,
    serviceDescription: application.serviceDescription,
    state: application.state,
    street: application.street,
    tradeName: application.tradeName,
  };
}
