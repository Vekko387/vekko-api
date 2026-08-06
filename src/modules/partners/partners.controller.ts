import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerPhotoType, Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PartnerResponseDto } from './dto/partner-response.dto';
import { UpdatePartnerDetailsDto } from './dto/update-partner-details.dto';
import {
  PartnerDetailsService,
  type UploadedPartnerPhoto,
} from './services/partner-details.service';

const PARTNER_ROLES = [
  Role.PARTNER_OWNER,
  Role.PARTNER_MANAGER,
  Role.PARTNER_EMPLOYEE,
] as const;

@ApiTags('partners')
@ApiBearerAuth('firebase')
@Roles(...PARTNER_ROLES)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnerDetailsService: PartnerDetailsService) {}

  @ApiOperation({ summary: 'Consulta o próprio estabelecimento parceiro.' })
  @ApiOkResponse({ type: PartnerResponseDto })
  @Get('me')
  findMe(@CurrentUser() user: AuthenticatedUser): Promise<PartnerResponseDto> {
    return this.partnerDetailsService.findMe(user.id);
  }

  @ApiOperation({ summary: 'Atualiza os dados permitidos do estabelecimento.' })
  @ApiOkResponse({ type: PartnerResponseDto })
  @ApiForbiddenResponse({ description: 'Estabelecimento suspenso.' })
  @Roles(Role.PARTNER_OWNER, Role.PARTNER_MANAGER)
  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdatePartnerDetailsDto,
  ): Promise<PartnerResponseDto> {
    return this.partnerDetailsService.updateMe(user.id, input);
  }

  @ApiOperation({ summary: 'Envia ou substitui uma foto do estabelecimento.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      properties: { file: { format: 'binary', type: 'string' } },
      required: ['file'],
      type: 'object',
    },
  })
  @ApiOkResponse({ type: PartnerResponseDto })
  @Roles(Role.PARTNER_OWNER, Role.PARTNER_MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @Put('me/photos/:type')
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type', new ParseEnumPipe(PartnerPhotoType))
    type: PartnerPhotoType,
    @UploadedFile() file?: UploadedPartnerPhoto,
  ): Promise<PartnerResponseDto> {
    return this.partnerDetailsService.uploadMyPhoto(user.id, type, file);
  }
}
