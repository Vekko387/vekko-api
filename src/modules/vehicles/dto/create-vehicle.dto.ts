import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC-1D23', maxLength: 12 })
  @IsString()
  @Length(7, 12)
  plate: string;

  @ApiProperty({ enum: VehicleType, enumName: 'VehicleType' })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({ example: 'Toyota', maxLength: 80 })
  @IsString()
  @Length(1, 80)
  brand: string;

  @ApiProperty({ example: 'Corolla', maxLength: 80 })
  @IsString()
  @Length(1, 80)
  model: string;

  @ApiProperty({ example: 'Prata', maxLength: 50 })
  @IsString()
  @Length(1, 50)
  color: string;

  @ApiPropertyOptional({ example: 2024, minimum: 1900 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 'Meu carro', maxLength: 60 })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  nickname?: string;
}
