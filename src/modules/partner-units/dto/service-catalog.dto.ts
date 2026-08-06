import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ServiceStatus } from '../../../generated/prisma/enums';

export class CreateServiceDto {
  @ApiProperty({ example: 'CAR_WASH', maxLength: 60 })
  @IsString()
  @Length(2, 60)
  @Matches(/^[A-Z][A-Z0-9_]*$/u)
  code: string;

  @ApiProperty({ example: 'Lavagem automotiva', maxLength: 120 })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class UpdateServiceDto extends PartialType(
  OmitType(CreateServiceDto, ['code'] as const),
) {}

export class UpdateServiceStatusDto {
  @ApiProperty({ enum: ServiceStatus, enumName: 'ServiceStatus' })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;
}
