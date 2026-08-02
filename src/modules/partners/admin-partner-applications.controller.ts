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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ListPartnerApplicationsQueryDto } from './dto/list-partner-applications-query.dto';
import {
  PartnerApplicationListResponseDto,
  PartnerApplicationResponseDto,
} from './dto/partner-application-response.dto';
import { RejectPartnerApplicationDto } from './dto/reject-partner-application.dto';
import { PartnerApplicationsService } from './services/partner-applications.service';
import { PartnerApprovalService } from './services/partner-approval.service';

@ApiTags('admin partner applications')
@ApiBearerAuth('firebase')
@ApiUnauthorizedResponse({ description: 'Autenticação obrigatória.' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores.' })
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/partner-applications')
export class AdminPartnerApplicationsController {
  constructor(
    private readonly partnerApplicationsService: PartnerApplicationsService,
    private readonly partnerApprovalService: PartnerApprovalService,
  ) {}

  @ApiOperation({ summary: 'Lista solicitações de parceria.' })
  @ApiOkResponse({ type: PartnerApplicationListResponseDto })
  @Get()
  list(
    @Query() query: ListPartnerApplicationsQueryDto,
  ): Promise<PartnerApplicationListResponseDto> {
    return this.partnerApplicationsService.list(query);
  }

  @ApiOperation({ summary: 'Consulta uma solicitação de parceria.' })
  @ApiOkResponse({ type: PartnerApplicationResponseDto })
  @ApiNotFoundResponse({ description: 'Solicitação não encontrada.' })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PartnerApplicationResponseDto> {
    return this.partnerApplicationsService.findOne(id);
  }

  @ApiOperation({ summary: 'Aprova e provisiona o proprietário parceiro.' })
  @ApiOkResponse({ type: PartnerApplicationResponseDto })
  @ApiNotFoundResponse({ description: 'Solicitação não encontrada.' })
  @ApiConflictResponse({ description: 'A solicitação já foi rejeitada.' })
  @Patch(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() reviewer: AuthenticatedUser,
  ): Promise<PartnerApplicationResponseDto> {
    return this.partnerApprovalService.approve(id, reviewer.id);
  }

  @ApiOperation({ summary: 'Rejeita uma solicitação de parceria.' })
  @ApiOkResponse({ type: PartnerApplicationResponseDto })
  @ApiNotFoundResponse({ description: 'Solicitação não encontrada.' })
  @ApiConflictResponse({ description: 'A solicitação já foi analisada.' })
  @Patch(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() reviewer: AuthenticatedUser,
    @Body() input: RejectPartnerApplicationDto,
  ): Promise<PartnerApplicationResponseDto> {
    return this.partnerApplicationsService.reject(id, reviewer.id, input);
  }

  @ApiOperation({ summary: 'Reenvia o convite padrão do Firebase.' })
  @ApiOkResponse({ type: PartnerApplicationResponseDto })
  @ApiNotFoundResponse({ description: 'Solicitação não encontrada.' })
  @ApiConflictResponse({ description: 'O parceiro ainda não foi aprovado.' })
  @Post(':id/resend-invitation')
  resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PartnerApplicationResponseDto> {
    return this.partnerApprovalService.resendInvitation(id);
  }
}
