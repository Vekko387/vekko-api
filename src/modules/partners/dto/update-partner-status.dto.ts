import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PartnerStatus } from '../../../generated/prisma/enums';

export class UpdatePartnerStatusDto {
  @ApiProperty({ enum: PartnerStatus, enumName: 'PartnerStatus' })
  @IsEnum(PartnerStatus)
  status: PartnerStatus;
}
