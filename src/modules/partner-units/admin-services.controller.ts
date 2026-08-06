import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ServiceListResponseDto,
  ServiceResponseDto,
} from './dto/partner-unit-response.dto';
import {
  CreateServiceDto,
  UpdateServiceDto,
  UpdateServiceStatusDto,
} from './dto/service-catalog.dto';
import { ServicesCatalogService } from './services-catalog.service';

@ApiTags('admin services')
@ApiBearerAuth('firebase')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/services')
export class AdminServicesController {
  constructor(private readonly servicesCatalog: ServicesCatalogService) {}

  @ApiOperation({ summary: 'Lista o catálogo central de serviços.' })
  @ApiOkResponse({ type: ServiceListResponseDto })
  @Get()
  list() {
    return this.servicesCatalog.list();
  }

  @ApiOperation({ summary: 'Cria um serviço no catálogo central.' })
  @ApiOkResponse({ type: ServiceResponseDto })
  @Post()
  create(@Body() input: CreateServiceDto) {
    return this.servicesCatalog.create(input);
  }

  @ApiOperation({ summary: 'Edita nome ou descrição de um serviço.' })
  @ApiOkResponse({ type: ServiceResponseDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateServiceDto,
  ) {
    return this.servicesCatalog.update(id, input);
  }

  @ApiOperation({ summary: 'Ativa ou inativa um serviço sem excluí-lo.' })
  @ApiOkResponse({ type: ServiceResponseDto })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateServiceStatusDto,
  ) {
    return this.servicesCatalog.updateStatus(id, input.status);
  }
}
