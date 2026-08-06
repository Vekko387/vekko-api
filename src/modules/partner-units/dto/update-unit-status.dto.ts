import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PartnerUnitStatus } from '../../../generated/prisma/enums';

export class UpdateUnitStatusDto {
  @ApiProperty({ enum: PartnerUnitStatus, enumName: 'PartnerUnitStatus' })
  @IsEnum(PartnerUnitStatus)
  status: PartnerUnitStatus;
}
