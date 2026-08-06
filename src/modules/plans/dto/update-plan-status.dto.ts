import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PlanStatus } from '../../../generated/prisma/enums';

export class UpdatePlanStatusDto {
  @ApiProperty({ enum: PlanStatus, enumName: 'PlanStatus' })
  @IsEnum(PlanStatus)
  status: PlanStatus;
}
