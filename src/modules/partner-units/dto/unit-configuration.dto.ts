import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum, IsUUID } from 'class-validator';
import { VehicleType } from '../../../generated/prisma/enums';

export class ReplaceUnitServicesDto {
  @ApiProperty({ format: 'uuid', isArray: true, type: String })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  serviceIds: string[];
}

export class ReplaceUnitVehicleTypesDto {
  @ApiProperty({ enum: VehicleType, enumName: 'VehicleType', isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(VehicleType, { each: true })
  vehicleTypes: VehicleType[];
}

export class ReplaceUnitPlansDto {
  @ApiProperty({ format: 'uuid', isArray: true, type: String })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  planIds: string[];
}
