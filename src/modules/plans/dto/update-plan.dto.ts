import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PlanCode, VehicleType } from '../../../generated/prisma/enums';

export class UpdatePlanDto {
  @ApiPropertyOptional({
    description:
      'Código interno imutável. Informar outro valor retorna PLAN_CODE_IMMUTABLE.',
    enum: PlanCode,
    enumName: 'PlanCode',
  })
  @IsOptional()
  @IsEnum(PlanCode)
  code?: PlanCode;

  @ApiPropertyOptional({ example: 'Essential', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Mensalidade em centavos. Exemplo: R$ 119,90 = 11990.',
    example: 11990,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyPriceCents?: number;

  @ApiPropertyOptional({ example: 2, maximum: 4, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  displayOrder?: number;

  @ApiPropertyOptional({
    description:
      'Quantidade de lavagens por ciclo. Não se aplica ao plano Ilimitado.',
    example: 4,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  washesPerCycle?: number;

  @ApiPropertyOptional({
    description:
      'Tipos de veículo permitidos. Basic nunca pode incluir SUV ou Pickup.',
    enum: VehicleType,
    enumName: 'VehicleType',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(VehicleType, { each: true })
  eligibleVehicleTypes?: VehicleType[];
}
