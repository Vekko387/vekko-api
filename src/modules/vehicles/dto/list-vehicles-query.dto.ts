import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { VehicleStatus, VehicleType } from '../../../generated/prisma/enums';

export class ListVehiclesQueryDto {
  @ApiPropertyOptional({ enum: VehicleStatus, enumName: 'VehicleStatus' })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}

export class ListAdminVehiclesQueryDto extends ListVehiclesQueryDto {
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

  @ApiPropertyOptional({ description: 'Busca por placa, veículo ou cliente.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VehicleType, enumName: 'VehicleType' })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiPropertyOptional({
    description: 'Filtra veículos por proprietário.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
