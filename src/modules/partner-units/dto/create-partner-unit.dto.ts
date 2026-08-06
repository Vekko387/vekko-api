import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreatePartnerUnitDto {
  @ApiProperty({ example: 'Unidade Centro', maxLength: 160 })
  @IsString()
  @Length(2, 160)
  name: string;

  @ApiProperty({ example: '38400-000' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/u)
  postalCode: string;

  @ApiProperty({ example: 'Avenida Afonso Pena', maxLength: 160 })
  @IsString()
  @Length(2, 160)
  street: string;

  @ApiProperty({ example: '123', maxLength: 30 })
  @IsString()
  @Length(1, 30)
  addressNumber: string;

  @ApiPropertyOptional({ example: 'Loja 2', maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  addressComplement?: string;

  @ApiProperty({ example: 'Centro', maxLength: 120 })
  @IsString()
  @Length(2, 120)
  neighborhood: string;

  @ApiProperty({ example: 'Uberlândia', maxLength: 120 })
  @IsString()
  @Length(2, 120)
  city: string;

  @ApiProperty({ example: 'MG' })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/u)
  state: string;

  @ApiProperty({ example: '(34) 3333-3333', maxLength: 20 })
  @IsString()
  @Length(10, 20)
  phone: string;

  @ApiPropertyOptional({ example: '(34) 99999-9999', maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  whatsapp?: string;
}

export class UpdatePartnerUnitDto extends PartialType(CreatePartnerUnitDto) {}
