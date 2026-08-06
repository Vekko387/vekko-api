import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PartnerUnitStatus } from '../../../generated/prisma/enums';

export class ListAdminUnitsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Busca por nome ou CNPJ do parceiro.' })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  partner?: string;

  @ApiPropertyOptional({ enum: PartnerUnitStatus })
  @IsOptional()
  @IsEnum(PartnerUnitStatus)
  status?: PartnerUnitStatus;

  @ApiPropertyOptional({ example: 'Uberlândia' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  city?: string;

  @ApiPropertyOptional({ example: 'MG' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;
}
