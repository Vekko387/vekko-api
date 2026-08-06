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
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import {
  CustomerUserListResponseDto,
  CustomerUserResponseDto,
} from './dto/user-response.dto';
import { CustomerUsersService } from './users.service';

@ApiTags('admin users')
@ApiBearerAuth('firebase')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: CustomerUsersService) {}

  @ApiOperation({ summary: 'Lista clientes com paginação e filtros.' })
  @ApiOkResponse({ type: CustomerUserListResponseDto })
  @Get()
  list(
    @Query() query: ListAdminUsersQueryDto,
  ): Promise<CustomerUserListResponseDto> {
    return this.usersService.list(query);
  }

  @ApiOperation({ summary: 'Consulta um cliente e seu resumo de veículos.' })
  @ApiOkResponse({ type: CustomerUserResponseDto })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerUserResponseDto> {
    return this.usersService.findCustomerById(id);
  }

  @ApiOperation({ summary: 'Bloqueia ou desbloqueia uma conta de cliente.' })
  @ApiOkResponse({ type: CustomerUserResponseDto })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserStatusDto,
  ): Promise<CustomerUserResponseDto> {
    return this.usersService.updateStatus(id, input.status);
  }
}
