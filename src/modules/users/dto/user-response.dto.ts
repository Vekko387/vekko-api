import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '../../../generated/prisma/enums';

export class CustomerProfileResponseDto {
  @ApiPropertyOptional({ example: 'Lucas Silva', nullable: true, type: String })
  fullName: string | null;

  @ApiPropertyOptional({ example: '52998224725', nullable: true, type: String })
  cpfNormalized: string | null;

  @ApiPropertyOptional({ example: '34999998888', nullable: true, type: String })
  phoneNormalized: string | null;

  @ApiProperty({ example: true })
  complete: boolean;

  @ApiPropertyOptional({
    example: '2026-08-02T12:00:00.000Z',
    nullable: true,
    type: String,
  })
  completedAt: Date | null;
}

export class CustomerUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'cliente@exemplo.com', nullable: true, type: String })
  email: string | null;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status: UserStatus;

  @ApiProperty({ enum: Role, enumName: 'Role', isArray: true })
  roles: Role[];

  @ApiProperty({ type: CustomerProfileResponseDto })
  profile: CustomerProfileResponseDto;

  @ApiProperty({ example: 2 })
  activeVehicleCount: number;

  @ApiProperty({ example: '2026-08-02T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-02T12:00:00.000Z' })
  updatedAt: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class CustomerUserListResponseDto {
  @ApiProperty({ type: CustomerUserResponseDto, isArray: true })
  items: CustomerUserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
