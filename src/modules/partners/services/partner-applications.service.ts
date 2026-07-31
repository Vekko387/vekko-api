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
import { isValidCnpj, normalizeDigits, normalizeEmail } from '../partner-data';
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
          serviceDescription: input.serviceDescription.trim(),
          state: input.state.trim().toUpperCase(),
          street: input.street.trim(),
          termsAcceptedAt: new Date(),
          tradeName: input.tradeName.trim(),
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
}
