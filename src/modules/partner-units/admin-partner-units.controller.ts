import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdatePartnerUnitDto } from './dto/create-partner-unit.dto';
import { ListAdminUnitsQueryDto } from './dto/list-admin-units-query.dto';
import {
  AdminPartnerUnitListResponseDto,
  PartnerUnitResponseDto,
} from './dto/partner-unit-response.dto';
import { UpdateUnitStatusDto } from './dto/update-unit-status.dto';
import { PartnerUnitsService } from './partner-units.service';

@ApiTags('admin partner units')
@ApiBearerAuth('firebase')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/partner-units')
export class AdminPartnerUnitsController {
  constructor(private readonly partnerUnitsService: PartnerUnitsService) {}

  @ApiOperation({ summary: 'Lista e filtra todas as unidades parceiras.' })
  @ApiOkResponse({ type: AdminPartnerUnitListResponseDto })
  @Get()
  list(@Query() query: ListAdminUnitsQueryDto) {
    return this.partnerUnitsService.listAdmin(query);
  }

  @ApiOperation({ summary: 'Consulta todos os dados de uma unidade.' })
  @ApiOkResponse({ type: PartnerUnitResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerUnitsService.findAdmin(id);
  }

  @ApiOperation({ summary: 'Edita os dados de uma unidade.' })
  @ApiOkResponse({ type: PartnerUnitResponseDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePartnerUnitDto,
  ) {
    return this.partnerUnitsService.updateAdmin(id, input);
  }

  @ApiOperation({ summary: 'Ativa, inativa ou suspende uma unidade.' })
  @ApiOkResponse({ type: PartnerUnitResponseDto })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUnitStatusDto,
  ) {
    return this.partnerUnitsService.updateAdminStatus(id, input.status);
  }
}
