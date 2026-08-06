import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PlanBenefitMode,
  PlanCode,
  PlanStatus,
  VehicleType,
} from '../../../generated/prisma/enums';

export class PlanBenefitResponseDto {
  @ApiProperty({ enum: PlanBenefitMode, enumName: 'PlanBenefitMode' })
  mode: PlanBenefitMode;

  @ApiPropertyOptional({ example: 4, nullable: true, type: Number })
  washesPerCycle: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true, type: Number })
  maxUsesPerDay: number | null;
}

export class PlanVehicleEligibilityResponseDto {
  @ApiProperty({ enum: VehicleType, enumName: 'VehicleType' })
  vehicleType: VehicleType;

  @ApiProperty({ example: true })
  allowed: boolean;
}

export class AdminPlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: PlanCode, enumName: 'PlanCode' })
  code: PlanCode;

  @ApiProperty({ example: 'Essential' })
  name: string;

  @ApiProperty({ example: 'Mais frequência para a rotina do seu veículo.' })
  description: string;

  @ApiProperty({ description: 'Mensalidade em centavos.', example: 11990 })
  monthlyPriceCents: number;

  @ApiProperty({ enum: PlanStatus, enumName: 'PlanStatus' })
  status: PlanStatus;

  @ApiProperty({ example: 2 })
  displayOrder: number;

  @ApiProperty({ type: PlanBenefitResponseDto })
  benefit: PlanBenefitResponseDto;

  @ApiProperty({ type: PlanVehicleEligibilityResponseDto, isArray: true })
  vehicleEligibilities: PlanVehicleEligibilityResponseDto[];

  @ApiProperty({ example: '2026-08-03T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-03T12:00:00.000Z' })
  updatedAt: Date;
}

export class AdminPlanListResponseDto {
  @ApiProperty({ type: AdminPlanResponseDto, isArray: true })
  items: AdminPlanResponseDto[];
}

export class CustomerPlanResponseDto extends AdminPlanResponseDto {
  @ApiProperty({
    description: 'Elegibilidade calculada pela API para o veículo informado.',
    example: true,
  })
  eligible: boolean;

  @ApiPropertyOptional({
    example: 'BASIC_NOT_AVAILABLE_FOR_VEHICLE_TYPE',
    nullable: true,
    type: String,
  })
  ineligibilityCode: string | null;

  @ApiPropertyOptional({
    example: 'O plano Basic não está disponível para SUV ou Pickup.',
    nullable: true,
    type: String,
  })
  ineligibilityMessage: string | null;
}

export class CustomerPlanListResponseDto {
  @ApiProperty({ type: CustomerPlanResponseDto, isArray: true })
  items: CustomerPlanResponseDto[];
}
