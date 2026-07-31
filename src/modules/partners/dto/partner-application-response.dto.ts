import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerApplicationStatus } from '../../../generated/prisma/enums';

export class PartnerApplicationSubmissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: PartnerApplicationStatus })
  status: PartnerApplicationStatus;

  @ApiProperty({ format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({ format: 'date-time' })
  reviewDeadlineAt: Date;
}

export class PartnerApplicationResponseDto extends PartnerApplicationSubmissionResponseDto {
  @ApiProperty()
  legalName: string;

  @ApiProperty()
  tradeName: string;

  @ApiProperty()
  cnpj: string;

  @ApiProperty()
  responsibleName: string;

  @ApiProperty()
  contactEmail: string;

  @ApiProperty()
  contactPhone: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  street: string;

  @ApiProperty()
  addressNumber: string;

  @ApiPropertyOptional()
  addressComplement?: string;

  @ApiProperty()
  neighborhood: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  businessCategory: string;

  @ApiProperty()
  serviceDescription: string;

  @ApiPropertyOptional({ format: 'date-time' })
  reviewedAt?: Date;

  @ApiPropertyOptional({ format: 'uuid' })
  reviewedById?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty({
    description: 'Indica se o convite padrão do Firebase foi enviado.',
  })
  invitationSent: boolean;
}

export class PartnerApplicationListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class PartnerApplicationListResponseDto {
  @ApiProperty({ isArray: true, type: PartnerApplicationResponseDto })
  items: PartnerApplicationResponseDto[];

  @ApiProperty({ type: PartnerApplicationListMetaDto })
  meta: PartnerApplicationListMetaDto;
}
