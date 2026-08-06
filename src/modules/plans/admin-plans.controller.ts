import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AdminPlanListResponseDto,
  AdminPlanResponseDto,
} from './dto/plan-response.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto';
import { PlansService } from './plans.service';

@ApiTags('admin plans')
@ApiBearerAuth('firebase')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({
    summary: 'Lista os quatro planos oficiais, inclusive os inativos.',
  })
  @ApiOkResponse({ type: AdminPlanListResponseDto })
  @Get()
  list(): Promise<AdminPlanListResponseDto> {
    return this.plansService.listAdmin();
  }

  @ApiOperation({ summary: 'Consulta um dos quatro planos oficiais.' })
  @ApiOkResponse({ type: AdminPlanResponseDto })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminPlanResponseDto> {
    return this.plansService.findAdmin(id);
  }

  @ApiOperation({
    summary:
      'Edita conteúdo, preço, benefício, ordem e elegibilidade de um plano oficial.',
  })
  @ApiOkResponse({ type: AdminPlanResponseDto })
  @ApiConflictResponse({
    description:
      'Código imutável, restrição do Basic ou saldo indevido no Ilimitado.',
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePlanDto,
  ): Promise<AdminPlanResponseDto> {
    return this.plansService.updateAdmin(id, input);
  }

  @ApiOperation({ summary: 'Ativa ou inativa um plano oficial.' })
  @ApiOkResponse({ type: AdminPlanResponseDto })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePlanStatusDto,
  ): Promise<AdminPlanResponseDto> {
    return this.plansService.updateStatusAdmin(id, input);
  }
}
