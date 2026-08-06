import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ListCustomerPlansQueryDto } from './dto/list-customer-plans-query.dto';
import {
  CustomerPlanListResponseDto,
  CustomerPlanResponseDto,
} from './dto/plan-response.dto';
import { PlansService } from './plans.service';

@ApiTags('plans')
@ApiBearerAuth('firebase')
@Roles(Role.CUSTOMER)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({
    summary:
      'Lista planos ativos e calcula a elegibilidade para um veículo do cliente.',
  })
  @ApiOkResponse({ type: CustomerPlanListResponseDto })
  @ApiNotFoundResponse({
    description: 'Veículo não encontrado para o cliente.',
  })
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCustomerPlansQueryDto,
  ): Promise<CustomerPlanListResponseDto> {
    return this.plansService.listForCustomer(user.id, query.vehicleId);
  }

  @ApiOperation({
    summary: 'Consulta um plano ativo para um veículo do cliente.',
  })
  @ApiOkResponse({ type: CustomerPlanResponseDto })
  @ApiNotFoundResponse({ description: 'Plano ou veículo não encontrado.' })
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListCustomerPlansQueryDto,
  ): Promise<CustomerPlanResponseDto> {
    return this.plansService.findForCustomer(user.id, query.vehicleId, id);
  }
}
