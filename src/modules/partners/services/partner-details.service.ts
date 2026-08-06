import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client';
import {
  PartnerPhotoType,
  PartnerStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import {
  STORAGE_ADAPTER,
  type StorageAdapter,
} from '../../storage/storage.adapter';
import { ListPartnersQueryDto } from '../dto/list-partners-query.dto';
import {
  PartnerListResponseDto,
  PartnerResponseDto,
} from '../dto/partner-response.dto';
import { UpdatePartnerDetailsDto } from '../dto/update-partner-details.dto';
import {
  isValidBrazilianPhone,
  isValidCpf,
  normalizeDigits,
  normalizeEmail,
} from '../partner-data';
import {
  PARTNER_DETAILS_INCLUDE,
  toPartnerListResponse,
  toPartnerResponse,
  type PartnerWithDetails,
} from '../partner.mapper';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export type UploadedPartnerPhoto = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

function detectImageContentType(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

@Injectable()
export class PartnerDetailsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapter,
  ) {}

  async findMe(userId: string): Promise<PartnerResponseDto> {
    return toPartnerResponse(await this.findOwnedPartner(userId));
  }

  async updateMe(
    userId: string,
    input: UpdatePartnerDetailsDto,
  ): Promise<PartnerResponseDto> {
    const partner = await this.findOwnedPartner(userId);
    this.assertActive(partner);
    await this.updateDetails(partner.id, input);

    return this.findById(partner.id);
  }

  async uploadMyPhoto(
    userId: string,
    type: PartnerPhotoType,
    file?: UploadedPartnerPhoto,
  ): Promise<PartnerResponseDto> {
    const partner = await this.findOwnedPartner(userId);
    this.assertActive(partner);

    if (!file || file.size === 0 || file.buffer.length === 0) {
      throw new BadRequestException({
        code: 'PARTNER_PHOTO_REQUIRED',
        message: 'Selecione uma imagem para enviar.',
      });
    }

    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException({
        code: 'PARTNER_PHOTO_TOO_LARGE',
        message: 'A foto deve ter no máximo 5 MB.',
      });
    }

    const contentType = detectImageContentType(file.buffer);

    if (!contentType) {
      throw new BadRequestException({
        code: 'PARTNER_PHOTO_INVALID_TYPE',
        message: 'Envie uma imagem JPEG, PNG ou WebP válida.',
      });
    }

    const prefix = this.configService
      .getOrThrow<string>('storage.prefix')
      .replace(/^\/+|\/+$/gu, '');
    const key = `${prefix}/partners/${partner.id}/${type.toLowerCase()}`;

    try {
      const stored = await this.storageAdapter.upload({
        body: file.buffer,
        cacheControl: PHOTO_CACHE_CONTROL,
        contentType,
        key,
      });

      await this.prismaService.partnerPhoto.upsert({
        create: { partnerId: partner.id, type, url: stored.url },
        update: { url: stored.url },
        where: { partnerId_type: { partnerId: partner.id, type } },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new ServiceUnavailableException({
        code: 'PARTNER_PHOTO_STORAGE_UNAVAILABLE',
        message: 'Não foi possível armazenar a foto agora. Tente novamente.',
      });
    }

    return this.findById(partner.id);
  }

  async list(query: ListPartnersQueryDto): Promise<PartnerListResponseDto> {
    const search = query.search?.trim();
    const searchDigits = search ? normalizeDigits(search) : '';
    const where: Prisma.PartnerWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { legalName: { contains: search, mode: 'insensitive' } },
              { tradeName: { contains: search, mode: 'insensitive' } },
              { contactEmail: { contains: search, mode: 'insensitive' } },
              ...(searchDigits
                ? [{ cnpjNormalized: { contains: searchDigits } }]
                : []),
            ],
          }
        : {}),
    };
    const [partners, total] = await this.prismaService.$transaction([
      this.prismaService.partner.findMany({
        include: PARTNER_DETAILS_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        where,
      }),
      this.prismaService.partner.count({ where }),
    ]);

    return toPartnerListResponse(partners, {
      limit: query.limit,
      page: query.page,
      total,
    });
  }

  async findById(id: string): Promise<PartnerResponseDto> {
    const partner = await this.prismaService.partner.findUnique({
      include: PARTNER_DETAILS_INCLUDE,
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException('Estabelecimento parceiro não encontrado.');
    }

    return toPartnerResponse(partner);
  }

  async updateByAdmin(
    id: string,
    input: UpdatePartnerDetailsDto,
  ): Promise<PartnerResponseDto> {
    await this.findById(id);
    await this.updateDetails(id, input);

    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: PartnerStatus,
  ): Promise<PartnerResponseDto> {
    await this.findById(id);
    await this.prismaService.partner.update({
      data: { status },
      where: { id },
    });

    return this.findById(id);
  }

  private async findOwnedPartner(userId: string): Promise<PartnerWithDetails> {
    const partner = await this.prismaService.partner.findFirst({
      include: PARTNER_DETAILS_INCLUDE,
      where: { members: { some: { userId } } },
    });

    if (!partner) {
      throw new NotFoundException(
        'Nenhum estabelecimento está vinculado a esta conta.',
      );
    }

    return partner;
  }

  private assertActive(partner: PartnerWithDetails): void {
    if (partner.status === PartnerStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'PARTNER_SUSPENDED',
        message:
          'O estabelecimento está suspenso e não pode ser alterado neste momento.',
      });
    }
  }

  private async updateDetails(
    partnerId: string,
    input: UpdatePartnerDetailsDto,
  ): Promise<void> {
    if (input.responsibleCpf !== undefined) {
      const cpf = normalizeDigits(input.responsibleCpf);

      if (!isValidCpf(cpf)) {
        throw new BadRequestException({
          code: 'INVALID_RESPONSIBLE_CPF',
          message: 'Informe um CPF válido para o responsável.',
        });
      }
    }

    for (const phone of [
      input.contactPhone,
      input.whatsapp,
      input.responsiblePhone,
    ]) {
      if (phone !== undefined && !isValidBrazilianPhone(phone)) {
        throw new BadRequestException({
          code: 'INVALID_PARTNER_PHONE',
          message: 'Informe telefones válidos com DDD.',
        });
      }
    }

    await this.prismaService.partner.update({
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
      where: { id: partnerId },
    });
  }
}
