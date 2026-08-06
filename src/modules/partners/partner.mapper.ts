import { Prisma } from '../../generated/prisma/client';
import {
  PartnerListResponseDto,
  PartnerResponseDto,
} from './dto/partner-response.dto';

export const PARTNER_DETAILS_INCLUDE = {
  photos: { orderBy: { type: 'asc' } },
} as const;

export type PartnerWithDetails = Prisma.PartnerGetPayload<{
  include: typeof PARTNER_DETAILS_INCLUDE;
}>;

export function toPartnerResponse(
  partner: PartnerWithDetails,
): PartnerResponseDto {
  return {
    addressComplement: partner.addressComplement,
    addressNumber: partner.addressNumber,
    businessCategory: partner.businessCategory,
    city: partner.city,
    cnpj: partner.cnpjNormalized,
    contactEmail: partner.contactEmail,
    contactPhone: partner.contactPhone,
    createdAt: partner.createdAt,
    description: partner.serviceDescription,
    id: partner.id,
    legalName: partner.legalName,
    neighborhood: partner.neighborhood,
    photos: partner.photos.map((photo) => ({
      type: photo.type,
      updatedAt: photo.updatedAt,
      url: photo.url,
    })),
    postalCode: partner.postalCodeNormalized,
    responsibleCpf: partner.responsibleCpfNormalized,
    responsibleEmail: partner.responsibleEmail,
    responsibleName: partner.responsibleName,
    responsiblePhone: partner.responsiblePhone,
    responsibleRole: partner.responsibleRole,
    state: partner.state,
    status: partner.status,
    street: partner.street,
    tradeName: partner.tradeName,
    updatedAt: partner.updatedAt,
    websiteOrInstagram: partner.websiteOrInstagram,
    whatsapp: partner.whatsappNormalized,
  };
}

export function toPartnerListResponse(
  partners: PartnerWithDetails[],
  pagination: { limit: number; page: number; total: number },
): PartnerListResponseDto {
  return {
    items: partners.map(toPartnerResponse),
    meta: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
}
