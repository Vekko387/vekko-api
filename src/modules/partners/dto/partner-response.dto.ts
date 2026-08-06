import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PartnerPhotoType,
  PartnerStatus,
} from '../../../generated/prisma/enums';

export class PartnerPhotoResponseDto {
  @ApiProperty({ enum: PartnerPhotoType, enumName: 'PartnerPhotoType' })
  type: PartnerPhotoType;

  @ApiProperty({ format: 'uri' })
  url: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class PartnerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  legalName: string;

  @ApiProperty()
  tradeName: string;

  @ApiProperty()
  cnpj: string;

  @ApiProperty()
  businessCategory: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  websiteOrInstagram: string | null;

  @ApiProperty()
  contactEmail: string;

  @ApiProperty()
  contactPhone: string;

  @ApiProperty()
  whatsapp: string;

  @ApiProperty()
  responsibleName: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  responsibleCpf: string | null;

  @ApiProperty()
  responsiblePhone: string;

  @ApiProperty()
  responsibleEmail: string;

  @ApiProperty()
  responsibleRole: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  street: string;

  @ApiProperty()
  addressNumber: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  addressComplement: string | null;

  @ApiProperty()
  neighborhood: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty({ enum: PartnerStatus, enumName: 'PartnerStatus' })
  status: PartnerStatus;

  @ApiProperty({ isArray: true, type: PartnerPhotoResponseDto })
  photos: PartnerPhotoResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class PartnerListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class PartnerListResponseDto {
  @ApiProperty({ isArray: true, type: PartnerResponseDto })
  items: PartnerResponseDto[];

  @ApiProperty({ type: PartnerListMetaDto })
  meta: PartnerListMetaDto;
}
