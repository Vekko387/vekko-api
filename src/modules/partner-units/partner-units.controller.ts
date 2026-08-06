import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ReplaceBusinessHoursDto } from './dto/business-hours.dto';
import {
  CreatePartnerUnitDto,
  UpdatePartnerUnitDto,
} from './dto/create-partner-unit.dto';
import {
  PartnerUnitListResponseDto,
  PartnerUnitResponseDto,
  UnitBusinessHoursResponseDto,
  UnitPlansResponseDto,
  UnitServicesResponseDto,
  UnitVehicleTypesResponseDto,
} from './dto/partner-unit-response.dto';
import {
  ReplaceUnitPlansDto,
  ReplaceUnitServicesDto,
  ReplaceUnitVehicleTypesDto,
} from './dto/unit-configuration.dto';
import { UpdateUnitStatusDto } from './dto/update-unit-status.dto';
import { PartnerUnitsService } from './partner-units.service';

const PARTNER_ROLES = [
  Role.PARTNER_OWNER,
  Role.PARTNER_MANAGER,
  Role.PARTNER_EMPLOYEE,
] as const;
const PARTNER_WRITE_ROLES = [Role.PARTNER_OWNER, Role.PARTNER_MANAGER] as const;

@ApiTags('partner units')
@ApiBearerAuth('firebase')
@Roles(...PARTNER_ROLES)
@Controller('partner/units')
export class PartnerUnitsController {
  constructor(private readonly partnerUnitsService: PartnerUnitsService) {}

  @ApiOperation({ summary: 'Lista as unidades do próprio parceiro.' })
  @ApiOkResponse({ type: PartnerUnitListResponseDto })
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.partnerUnitsService.listForPartner(user.id);
  }

  @ApiOperation({ summary: 'Cadastra uma unidade em estado DRAFT.' })
  @ApiOkResponse({ type: PartnerUnitResponseDto })
  @Roles(...PARTNER_WRITE_ROLES)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePartnerUnitDto,
  ) {
    return this.partnerUnitsService.createForPartner(user.id, input);
  }

  @ApiOperation({ summary: 'Consulta uma unidade do próprio parceiro.' })
  @ApiOkResponse({ type: PartnerUnitResponseDto })
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partnerUnitsService.findForPartner(user.id, id);
  }

  @ApiOperation({ summary: 'Edita dados e regeocodifica o endereço alterado.' })
  @ApiOkResponse({ type: PartnerUnitResponseDto })
  @Roles(...PARTNER_WRITE_ROLES)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePartnerUnitDto,
  ) {
    return this.partnerUnitsService.updateForPartner(user.id, id, input);
  }

  @ApiOperation({ summary: 'Ativa ou inativa uma unidade completa.' })
  @ApiOkResponse({ type: PartnerUnitResponseDto })
  @Roles(...PARTNER_WRITE_ROLES)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUnitStatusDto,
  ) {
    return this.partnerUnitsService.updatePartnerStatus(
      user.id,
      id,
      input.status,
    );
  }

  @ApiOkResponse({ type: UnitBusinessHoursResponseDto })
  @Get(':id/business-hours')
  getBusinessHours(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partnerUnitsService.getBusinessHours(user.id, id);
  }

  @ApiOkResponse({ type: UnitBusinessHoursResponseDto })
  @Roles(...PARTNER_WRITE_ROLES)
  @Put(':id/business-hours')
  replaceBusinessHours(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplaceBusinessHoursDto,
  ) {
    return this.partnerUnitsService.replaceBusinessHours(
      user.id,
      id,
      input.items,
    );
  }

  @ApiOkResponse({ type: UnitServicesResponseDto })
  @Get(':id/services')
  getServices(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partnerUnitsService.getServices(user.id, id);
  }

  @ApiOkResponse({ type: UnitServicesResponseDto })
  @Roles(...PARTNER_WRITE_ROLES)
  @Put(':id/services')
  replaceServices(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplaceUnitServicesDto,
  ) {
    return this.partnerUnitsService.replaceServices(
      user.id,
      id,
      input.serviceIds,
    );
  }

  @ApiOkResponse({ type: UnitVehicleTypesResponseDto })
  @Get(':id/vehicle-types')
  getVehicleTypes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partnerUnitsService.getVehicleTypes(user.id, id);
  }

  @ApiOkResponse({ type: UnitVehicleTypesResponseDto })
  @Roles(...PARTNER_WRITE_ROLES)
  @Put(':id/vehicle-types')
  replaceVehicleTypes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplaceUnitVehicleTypesDto,
  ) {
    return this.partnerUnitsService.replaceVehicleTypes(
      user.id,
      id,
      input.vehicleTypes,
    );
  }

  @ApiOkResponse({ type: UnitPlansResponseDto })
  @Get(':id/plans')
  getPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partnerUnitsService.getPlans(user.id, id);
  }

  @ApiOkResponse({ type: UnitPlansResponseDto })
  @Roles(...PARTNER_WRITE_ROLES)
  @Put(':id/plans')
  replacePlans(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplaceUnitPlansDto,
  ) {
    return this.partnerUnitsService.replacePlans(user.id, id, input.planIds);
  }
}
