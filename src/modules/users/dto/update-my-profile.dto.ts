import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateMyProfileDto {
  @ApiPropertyOptional({ example: 'Lucas Silva', maxLength: 160, minLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 160)
  fullName?: string;

  @ApiPropertyOptional({
    description:
      'CPF editável somente no primeiro cadastro. Depois disso, torna-se imutável.',
    example: '529.982.247-25',
  })
  @IsOptional()
  @IsString()
  @Length(11, 18)
  cpf?: string;

  @ApiPropertyOptional({ example: '(34) 99999-8888', maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone?: string;
}
