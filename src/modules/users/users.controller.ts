import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { CustomerUserResponseDto } from './dto/user-response.dto';
import { CustomerUsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('firebase')
@Roles(Role.CUSTOMER)
@Controller('profile')
export class UsersController {
  constructor(private readonly usersService: CustomerUsersService) {}

  @ApiOperation({
    summary: 'Consulta o perfil completo do cliente autenticado.',
  })
  @ApiOkResponse({ type: CustomerUserResponseDto })
  @Get()
  findMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerUserResponseDto> {
    return this.usersService.findMe(user.id);
  }

  @ApiOperation({
    summary: 'Completa ou atualiza o perfil do cliente autenticado.',
  })
  @ApiOkResponse({ type: CustomerUserResponseDto })
  @ApiConflictResponse({
    description:
      'CPF já utilizado ou tentativa de alterar um CPF já cadastrado.',
  })
  @Patch()
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateMyProfileDto,
  ): Promise<CustomerUserResponseDto> {
    return this.usersService.updateMyProfile(user.id, input);
  }
}
