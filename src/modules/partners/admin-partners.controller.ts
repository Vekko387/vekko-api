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
import { ListPartnersQueryDto } from './dto/list-partners-query.dto';
import {
  PartnerListResponseDto,
  PartnerResponseDto,
} from './dto/partner-response.dto';
import { UpdatePartnerDetailsDto } from './dto/update-partner-details.dto';
import { UpdatePartnerStatusDto } from './dto/update-partner-status.dto';
import { PartnerDetailsService } from './services/partner-details.service';

@ApiTags('admin partners')
@ApiBearerAuth('firebase')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/partners')
export class AdminPartnersController {
  constructor(private readonly partnerDetailsService: PartnerDetailsService) {}

  @ApiOperation({ summary: 'Lista estabelecimentos aprovados.' })
  @ApiOkResponse({ type: PartnerListResponseDto })
  @Get()
  list(@Query() query: ListPartnersQueryDto): Promise<PartnerListResponseDto> {
    return this.partnerDetailsService.list(query);
  }

  @ApiOperation({ summary: 'Consulta todos os dados de um parceiro.' })
  @ApiOkResponse({ type: PartnerResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PartnerResponseDto> {
    return this.partnerDetailsService.findById(id);
  }

  @ApiOperation({ summary: 'Edita os dados permitidos de um parceiro.' })
  @ApiOkResponse({ type: PartnerResponseDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePartnerDetailsDto,
  ): Promise<PartnerResponseDto> {
    return this.partnerDetailsService.updateByAdmin(id, input);
  }

  @ApiOperation({ summary: 'Bloqueia ou desbloqueia um parceiro aprovado.' })
  @ApiOkResponse({ type: PartnerResponseDto })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePartnerStatusDto,
  ): Promise<PartnerResponseDto> {
    return this.partnerDetailsService.updateStatus(id, input.status);
  }
}
