import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums';

export class UserProfileResponseDto {
  @ApiPropertyOptional({
    description: 'CPF normalizado, quando já cadastrado no perfil.',
    example: '12345678901',
  })
  cpfNormalized?: string;
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

  @ApiProperty({
    enum: Role,
    enumName: 'Role',
    example: [Role.CUSTOMER],
    isArray: true,
  })
  roles: Role[];
}
