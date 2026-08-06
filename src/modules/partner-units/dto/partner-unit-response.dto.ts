import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PartnerUnitStatus,
  PlanCode,
  PlanStatus,
  ServiceStatus,
  VehicleType,
} from '../../../generated/prisma/enums';

export class BusinessHourResponseDto {
  @ApiProperty({ maximum: 6, minimum: 0 })
  dayOfWeek: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  opensAt: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  closesAt: string | null;

  @ApiProperty()
  isClosed: boolean;
}

export class UnitServiceOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({ enum: ServiceStatus })
  status: ServiceStatus;

  @ApiProperty()
  selected: boolean;
}

export class UnitVehicleTypeOptionResponseDto {
  @ApiProperty({ enum: VehicleType })
  type: VehicleType;

  @ApiProperty()
  selected: boolean;
}

export class UnitPlanOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: PlanCode })
  code: PlanCode;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: PlanStatus })
  status: PlanStatus;

  @ApiProperty()
  selected: boolean;
}

export class UnitConfigurationResponseDto {
  @ApiProperty({ type: BusinessHourResponseDto, isArray: true })
  businessHours: BusinessHourResponseDto[];

  @ApiProperty({ type: UnitServiceOptionResponseDto, isArray: true })
  services: UnitServiceOptionResponseDto[];

  @ApiProperty({ type: UnitVehicleTypeOptionResponseDto, isArray: true })
  vehicleTypes: UnitVehicleTypeOptionResponseDto[];

  @ApiProperty({ type: UnitPlanOptionResponseDto, isArray: true })
  plans: UnitPlanOptionResponseDto[];
}

export class UnitPartnerSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  tradeName: string;

  @ApiProperty()
  status: string;
}

export class PartnerUnitResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  partnerId: string;

  @ApiPropertyOptional({ type: UnitPartnerSummaryResponseDto })
  partner?: UnitPartnerSummaryResponseDto;

  @ApiProperty()
  name: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  street: string;

  @ApiProperty()
  addressNumber: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  addressComplement: string | null;

  @ApiProperty()
  neighborhood: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  formattedAddress: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  longitude: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  mapProviderId: string | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  lastGeocodedAt: Date | null;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  whatsapp: string | null;

  @ApiProperty({ enum: PartnerUnitStatus })
  status: PartnerUnitStatus;

  @ApiProperty()
  isComplete: boolean;

  @ApiProperty({ isArray: true, type: String })
  missingRequirements: string[];

  @ApiProperty({ type: UnitConfigurationResponseDto })
  configuration: UnitConfigurationResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PartnerUnitListResponseDto {
  @ApiProperty({ type: PartnerUnitResponseDto, isArray: true })
  items: PartnerUnitResponseDto[];
}

export class AdminPartnerUnitListResponseDto extends PartnerUnitListResponseDto {
  @ApiProperty()
  meta: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

export class UnitBusinessHoursResponseDto {
  @ApiProperty({ type: BusinessHourResponseDto, isArray: true })
  items: BusinessHourResponseDto[];
}

export class UnitServicesResponseDto {
  @ApiProperty({ type: UnitServiceOptionResponseDto, isArray: true })
  items: UnitServiceOptionResponseDto[];
}

export class UnitVehicleTypesResponseDto {
  @ApiProperty({ type: UnitVehicleTypeOptionResponseDto, isArray: true })
  items: UnitVehicleTypeOptionResponseDto[];
}

export class UnitPlansResponseDto {
  @ApiProperty({ type: UnitPlanOptionResponseDto, isArray: true })
  items: UnitPlanOptionResponseDto[];
}

export class ServiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({ enum: ServiceStatus })
  status: ServiceStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ServiceListResponseDto {
  @ApiProperty({ type: ServiceResponseDto, isArray: true })
  items: ServiceResponseDto[];
}
