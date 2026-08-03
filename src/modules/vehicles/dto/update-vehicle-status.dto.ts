import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { VehicleStatus } from '../../../generated/prisma/enums';

export class UpdateVehicleStatusDto {
  @ApiProperty({ enum: VehicleStatus, enumName: 'VehicleStatus' })
  @IsEnum(VehicleStatus)
  status: VehicleStatus;

  @ApiPropertyOptional({
    description:
      'Novo veículo principal quando o veículo principal atual for inativado.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  replacementPrimaryVehicleId?: string;
}
