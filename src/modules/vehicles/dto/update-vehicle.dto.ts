import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { VehicleType } from '../../../generated/prisma/enums';

export class UpdateVehicleDto {
  @ApiPropertyOptional({ example: 'ABC-1D23', maxLength: 12 })
  @IsOptional()
  @IsString()
  @Length(7, 12)
  plate?: string;

  @ApiPropertyOptional({ enum: VehicleType, enumName: 'VehicleType' })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiPropertyOptional({ example: 'Toyota', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  brand?: string;

  @ApiPropertyOptional({ example: 'Corolla', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  model?: string;

  @ApiPropertyOptional({ example: 'Prata', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @ApiPropertyOptional({ example: 2024, minimum: 1900, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number | null;

  @ApiPropertyOptional({ example: 'Meu carro', maxLength: 60, nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  nickname?: string | null;
}
