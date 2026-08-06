import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus, VehicleType } from '../../../generated/prisma/enums';
import { PaginationMetaDto } from '../../users/dto/user-response.dto';

export class VehicleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ABC1D23' })
  plateNormalized: string;

  @ApiProperty({ enum: VehicleType, enumName: 'VehicleType' })
  type: VehicleType;

  @ApiProperty({ example: 'Toyota' })
  brand: string;

  @ApiProperty({ example: 'Corolla' })
  model: string;

  @ApiProperty({ example: 'Prata' })
  color: string;

  @ApiPropertyOptional({ example: 2024, nullable: true, type: Number })
  year: number | null;

  @ApiPropertyOptional({ example: 'Meu carro', nullable: true, type: String })
  nickname: string | null;

  @ApiProperty({ enum: VehicleStatus, enumName: 'VehicleStatus' })
  status: VehicleStatus;

  @ApiProperty({ example: true })
  isPrimary: boolean;

  @ApiProperty({ example: '2026-08-02T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-02T12:00:00.000Z' })
  updatedAt: Date;
}

export class VehicleListResponseDto {
  @ApiProperty({ type: VehicleResponseDto, isArray: true })
  items: VehicleResponseDto[];
}

export class VehicleOwnerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'cliente@exemplo.com', nullable: true, type: String })
  email: string | null;

  @ApiPropertyOptional({ example: 'Lucas Silva', nullable: true, type: String })
  fullName: string | null;

  @ApiPropertyOptional({ example: '52998224725', nullable: true, type: String })
  cpfNormalized: string | null;
}

export class AdminVehicleResponseDto extends VehicleResponseDto {
  @ApiProperty({ type: VehicleOwnerResponseDto })
  owner: VehicleOwnerResponseDto;
}

export class AdminVehicleListResponseDto {
  @ApiProperty({ type: AdminVehicleResponseDto, isArray: true })
  items: AdminVehicleResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
