import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import {
  VehicleListResponseDto,
  VehicleResponseDto,
} from './dto/vehicle-response.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth('firebase')
@Roles(Role.CUSTOMER)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({ summary: 'Cadastra um veículo para o cliente autenticado.' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  @ApiConflictResponse({
    description: 'Placa já utilizada ou limite de veículos atingido.',
  })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(user.id, input);
  }

  @ApiOperation({ summary: 'Lista os veículos do cliente autenticado.' })
  @ApiOkResponse({ type: VehicleListResponseDto })
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListVehiclesQueryDto,
  ): Promise<VehicleListResponseDto> {
    return this.vehiclesService.list(user.id, query);
  }

  @ApiOperation({ summary: 'Consulta um veículo do cliente autenticado.' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.findMine(user.id, id);
  }

  @ApiOperation({ summary: 'Edita um veículo do cliente autenticado.' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.update(user.id, id, input);
  }

  @ApiOperation({ summary: 'Define um veículo ativo como principal.' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @Patch(':id/primary')
  setPrimary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.setPrimary(user.id, id);
  }

  @ApiOperation({ summary: 'Inativa ou reativa um veículo.' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateVehicleStatusDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.updateStatus(user.id, id, input);
  }
}
