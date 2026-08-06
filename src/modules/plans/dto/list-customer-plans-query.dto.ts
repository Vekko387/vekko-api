import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ListCustomerPlansQueryDto {
  @ApiProperty({
    description: 'Veículo ativo do cliente usado no cálculo de elegibilidade.',
    format: 'uuid',
  })
  @IsUUID()
  vehicleId: string;
}
