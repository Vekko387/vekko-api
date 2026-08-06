import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartnerApplicationStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePartnerApplicationDto } from '../dto/create-partner-application.dto';
import { ListPartnerApplicationsQueryDto } from '../dto/list-partner-applications-query.dto';
import {
  PartnerApplicationListResponseDto,
  PartnerApplicationResponseDto,
  PartnerApplicationSubmissionResponseDto,
} from '../dto/partner-application-response.dto';
import { RejectPartnerApplicationDto } from '../dto/reject-partner-application.dto';
import { UpdatePartnerApplicationDto } from '../dto/update-partner-details.dto';
import {
  isValidBrazilianPhone,
  isValidCnpj,
  isValidCpf,
  normalizeDigits,
  normalizeEmail,
} from '../partner-data';
import {
  toPartnerApplicationResponse,
  toPartnerApplicationSubmissionResponse,
} from '../partner-application.mapper';

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class PartnerApplicationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async submit(
    input: CreatePartnerApplicationDto,
  ): Promise<PartnerApplicationSubmissionResponseDto> {
    const cnpjNormalized = normalizeDigits(input.cnpj);

    if (!isValidCnpj(cnpjNormalized)) {
      throw new BadRequestException('Informe um CNPJ válido.');
    }

    this.assertValidResponsibleAndPhones(input);

    const existingApplication =
      await this.prismaService.partnerApplication.findFirst({
        where: {
          cnpjNormalized,
          status: {
            in: [
              PartnerApplicationStatus.PENDING_REVIEW,
              PartnerApplicationStatus.APPROVED,
            ],
          },
        },
      });

    if (existingApplication) {
      throw new ConflictException(
        'Já existe uma solicitação em análise ou um parceiro ativo para este CNPJ.',
      );
    }

    try {
      const application = await this.prismaService.partnerApplication.create({
        data: {
          addressComplement: input.addressComplement || null,
          addressNumber: input.addressNumber.trim(),
          businessCategory: input.businessCategory.trim(),
          city: input.city.trim(),
          cnpjNormalized,
          contactEmail: normalizeEmail(input.contactEmail),
          contactPhone: normalizeDigits(input.contactPhone),
          legalName: input.legalName.trim(),
          neighborhood: input.neighborhood.trim(),
          postalCodeNormalized: normalizeDigits(input.postalCode),
          responsibleName: input.responsibleName.trim(),
          responsibleCpfNormalized: normalizeDigits(input.responsibleCpf),
          responsibleEmail: normalizeEmail(input.responsibleEmail),
          responsiblePhone: normalizeDigits(input.responsiblePhone),
          responsibleRole: input.responsibleRole.trim(),
          serviceDescription: input.serviceDescription.trim(),
          state: input.state.trim().toUpperCase(),
          street: input.street.trim(),
          termsAcceptedAt: new Date(),
          tradeName: input.tradeName.trim(),
          websiteOrInstagram: input.websiteOrInstagram?.trim() || null,
          whatsappNormalized: normalizeDigits(input.whatsapp),
        },
      });

      return toPartnerApplicationSubmissionResponse(application);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Já existe uma solicitação em análise ou um parceiro ativo para este CNPJ.',
        );
      }

      throw error;
    }
  }

  async list(
    query: ListPartnerApplicationsQueryDto,
  ): Promise<PartnerApplicationListResponseDto> {
    const where = query.status ? { status: query.status } : {};
    const [applications, total] = await this.prismaService.$transaction([
      this.prismaService.partnerApplication.findMany({
        orderBy: { submittedAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        where,
      }),
      this.prismaService.partnerApplication.count({ where }),
    ]);

    return {
      items: applications.map(toPartnerApplicationResponse),
      meta: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<PartnerApplicationResponseDto> {
    const application = await this.prismaService.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Solicitação de parceiro não encontrada.');
    }

    return toPartnerApplicationResponse(application);
  }

  async update(
    id: string,
    input: UpdatePartnerApplicationDto,
  ): Promise<PartnerApplicationResponseDto> {
    this.assertValidResponsibleAndPhones(input);

    const cnpjNormalized = input.cnpj ? normalizeDigits(input.cnpj) : undefined;

    if (cnpjNormalized && !isValidCnpj(cnpjNormalized)) {
      throw new BadRequestException('Informe um CNPJ válido.');
    }

    if (cnpjNormalized) {
      const conflictingApplication =
        await this.prismaService.partnerApplication.findFirst({
          where: {
            cnpjNormalized,
            id: { not: id },
            status: {
              in: [
                PartnerApplicationStatus.PENDING_REVIEW,
                PartnerApplicationStatus.APPROVED,
              ],
            },
          },
        });

      if (conflictingApplication) {
        throw new ConflictException(
          'Já existe uma solicitação em análise ou um parceiro ativo para este CNPJ.',
        );
      }
    }

    const result = await this.prismaService.partnerApplication.updateMany({
      data: {
        ...(input.addressComplement !== undefined
          ? { addressComplement: input.addressComplement.trim() || null }
          : {}),
        ...(input.addressNumber !== undefined
          ? { addressNumber: input.addressNumber.trim() }
          : {}),
        ...(input.businessCategory !== undefined
          ? { businessCategory: input.businessCategory.trim() }
          : {}),
        ...(input.city !== undefined ? { city: input.city.trim() } : {}),
        ...(cnpjNormalized ? { cnpjNormalized } : {}),
        ...(input.contactEmail !== undefined
          ? { contactEmail: normalizeEmail(input.contactEmail) }
          : {}),
        ...(input.contactPhone !== undefined
          ? { contactPhone: normalizeDigits(input.contactPhone) }
          : {}),
        ...(input.legalName !== undefined
          ? { legalName: input.legalName.trim() }
          : {}),
        ...(input.neighborhood !== undefined
          ? { neighborhood: input.neighborhood.trim() }
          : {}),
        ...(input.postalCode !== undefined
          ? { postalCodeNormalized: normalizeDigits(input.postalCode) }
          : {}),
        ...(input.responsibleCpf !== undefined
          ? { responsibleCpfNormalized: normalizeDigits(input.responsibleCpf) }
          : {}),
        ...(input.responsibleEmail !== undefined
          ? { responsibleEmail: normalizeEmail(input.responsibleEmail) }
          : {}),
        ...(input.responsibleName !== undefined
          ? { responsibleName: input.responsibleName.trim() }
          : {}),
        ...(input.responsiblePhone !== undefined
          ? { responsiblePhone: normalizeDigits(input.responsiblePhone) }
          : {}),
        ...(input.responsibleRole !== undefined
          ? { responsibleRole: input.responsibleRole.trim() }
          : {}),
        ...(input.serviceDescription !== undefined
          ? { serviceDescription: input.serviceDescription.trim() }
          : {}),
        ...(input.state !== undefined
          ? { state: input.state.trim().toUpperCase() }
          : {}),
        ...(input.street !== undefined ? { street: input.street.trim() } : {}),
        ...(input.tradeName !== undefined
          ? { tradeName: input.tradeName.trim() }
          : {}),
        ...(input.websiteOrInstagram !== undefined
          ? {
              websiteOrInstagram: input.websiteOrInstagram.trim() || null,
            }
          : {}),
        ...(input.whatsapp !== undefined
          ? { whatsappNormalized: normalizeDigits(input.whatsapp) }
          : {}),
      },
      where: { id, status: PartnerApplicationStatus.PENDING_REVIEW },
    });

    if (result.count === 0) {
      const existing = await this.prismaService.partnerApplication.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Solicitação de parceiro não encontrada.');
      }

      throw new ConflictException(
        'Somente solicitações pendentes podem ser editadas.',
      );
    }

    return this.findOne(id);
  }

  async reject(
    id: string,
    reviewerId: string,
    input: RejectPartnerApplicationDto,
  ): Promise<PartnerApplicationResponseDto> {
    const result = await this.prismaService.partnerApplication.updateMany({
      data: {
        rejectionReason: input.reason.trim(),
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        status: PartnerApplicationStatus.REJECTED,
      },
      where: {
        id,
        status: PartnerApplicationStatus.PENDING_REVIEW,
      },
    });

    if (result.count === 0) {
      const existing = await this.prismaService.partnerApplication.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Solicitação de parceiro não encontrada.');
      }

      throw new ConflictException('Esta solicitação já foi analisada.');
    }

    return this.findOne(id);
  }

  private assertValidResponsibleAndPhones(
    input: Partial<CreatePartnerApplicationDto>,
  ): void {
    if (
      input.responsibleCpf !== undefined &&
      !isValidCpf(input.responsibleCpf)
    ) {
      throw new BadRequestException(
        'Informe um CPF válido para o responsável.',
      );
    }

    for (const phone of [
      input.contactPhone,
      input.whatsapp,
      input.responsiblePhone,
    ]) {
      if (phone !== undefined && !isValidBrazilianPhone(phone)) {
        throw new BadRequestException('Informe telefones válidos com DDD.');
      }
    }
  }
}
