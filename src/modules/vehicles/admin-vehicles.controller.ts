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
import { ListAdminVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import {
  AdminVehicleListResponseDto,
  AdminVehicleResponseDto,
} from './dto/vehicle-response.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('admin vehicles')
@ApiBearerAuth('firebase')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/vehicles')
export class AdminVehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({ summary: 'Lista veículos com paginação e filtros.' })
  @ApiOkResponse({ type: AdminVehicleListResponseDto })
  @Get()
  list(
    @Query() query: ListAdminVehiclesQueryDto,
  ): Promise<AdminVehicleListResponseDto> {
    return this.vehiclesService.listAdmin(query);
  }

  @ApiOperation({ summary: 'Consulta um veículo e seu proprietário.' })
  @ApiOkResponse({ type: AdminVehicleResponseDto })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminVehicleResponseDto> {
    return this.vehiclesService.findAdmin(id);
  }

  @ApiOperation({
    summary: 'Inativa ou reativa um veículo administrativamente.',
  })
  @ApiOkResponse({ type: AdminVehicleResponseDto })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateVehicleStatusDto,
  ): Promise<AdminVehicleResponseDto> {
    return this.vehiclesService.updateStatusAdmin(id, input);
  }
}
