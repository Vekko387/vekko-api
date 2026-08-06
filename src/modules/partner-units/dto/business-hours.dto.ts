import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/u;

export class BusinessHourInputDto {
  @ApiProperty({ example: 1, maximum: 6, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  opensAt?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  closesAt?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isClosed: boolean;
}

export class ReplaceBusinessHoursDto {
  @ApiProperty({ type: BusinessHourInputDto, isArray: true })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessHourInputDto)
  items: BusinessHourInputDto[];
}
