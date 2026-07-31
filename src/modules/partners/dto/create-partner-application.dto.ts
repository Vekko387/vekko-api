import { Transform, type TransformFnParams } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeDigits, normalizeEmail } from '../partner-data';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function uppercase({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function digits({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? normalizeDigits(value) : value;
}

function email({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? normalizeEmail(value) : value;
}

export class CreatePartnerApplicationDto {
  @ApiProperty({ example: 'VEKKO Serviços Automotivos LTDA' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  legalName: string;

  @ApiProperty({ example: 'Auto Center Exemplo' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  tradeName: string;

  @ApiProperty({ example: '11222333000181' })
  @Transform(digits)
  @Matches(/^\d{14}$/u)
  cnpj: string;

  @ApiProperty({ example: 'Maria da Silva' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  responsibleName: string;

  @ApiProperty({ example: 'parceiro@exemplo.com' })
  @Transform(email)
  @IsEmail()
  @MaxLength(320)
  contactEmail: string;

  @ApiProperty({ example: '85999999999' })
  @Transform(digits)
  @Matches(/^\d{10,13}$/u)
  contactPhone: string;

  @ApiProperty({ example: '60160120' })
  @Transform(digits)
  @Matches(/^\d{8}$/u)
  postalCode: string;

  @ApiProperty({ example: 'Avenida Exemplo' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  street: string;

  @ApiProperty({ example: '123' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  addressNumber: string;

  @ApiPropertyOptional({ example: 'Sala 4' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressComplement?: string;

  @ApiProperty({ example: 'Aldeota' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  neighborhood: string;

  @ApiProperty({ example: 'Fortaleza' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city: string;

  @ApiProperty({ example: 'CE' })
  @Transform(uppercase)
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/u)
  state: string;

  @ApiProperty({ example: 'Centro automotivo' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessCategory: string;

  @ApiProperty({
    example: 'Lavagem, revisão preventiva e pequenos reparos automotivos.',
  })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  serviceDescription: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  termsAccepted: boolean;
}
