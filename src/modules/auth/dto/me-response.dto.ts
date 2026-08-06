import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '../../../generated/prisma/enums';

export class UserProfileResponseDto {
  @ApiPropertyOptional({ example: 'Lucas Silva' })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'CPF normalizado, quando já cadastrado no perfil.',
    example: '12345678901',
  })
  cpfNormalized?: string;

  @ApiPropertyOptional({ example: '34999999999' })
  phoneNormalized?: string;

  @ApiPropertyOptional({ example: '2026-08-02T12:00:00.000Z' })
  profileCompletedAt?: Date;
}

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'firebase-uid' })
  firebaseUid: string;

  @ApiProperty({
    example: 'usuario@exemplo.com',
    nullable: true,
    type: String,
  })
  email: string | null;

  @ApiProperty({ type: UserProfileResponseDto })
  profile: UserProfileResponseDto;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status: UserStatus;

  @ApiProperty({
    enum: Role,
    enumName: 'Role',
    example: [Role.CUSTOMER],
    isArray: true,
  })
  roles: Role[];
}
