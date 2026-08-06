import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PartnerStatus } from '../../../generated/prisma/enums';

export class ListPartnersQueryDto {
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

  @ApiPropertyOptional({ description: 'Busca por empresa, CNPJ ou e-mail.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PartnerStatus, enumName: 'PartnerStatus' })
  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;
}
