import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { MeResponseDto } from './dto/me-response.dto';
import type { AuthenticatedUser } from './types/authenticated-user';

@ApiTags('auth')
@ApiBearerAuth('firebase')
@Controller('auth')
export class AuthController {
  @ApiOperation({
    summary: 'Retorna o usuário autenticado e suas roles locais.',
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido, expirado ou revogado.',
  })
  @ApiForbiddenResponse({
    description: 'Usuário autenticado sem permissão para o recurso.',
  })
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): MeResponseDto {
    return user;
  }
}
