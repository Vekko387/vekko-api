import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePartnerApplicationDto } from './dto/create-partner-application.dto';
import { PartnerApplicationSubmissionResponseDto } from './dto/partner-application-response.dto';
import { PartnerApplicationsService } from './services/partner-applications.service';

@ApiTags('partner applications')
@Controller('partner-applications')
export class PartnerApplicationsController {
  constructor(
    private readonly partnerApplicationsService: PartnerApplicationsService,
  ) {}

  @ApiOperation({
    summary: 'Envia uma solicitação pública para se tornar parceiro.',
  })
  @ApiCreatedResponse({ type: PartnerApplicationSubmissionResponseDto })
  @ApiBadRequestResponse({ description: 'Dados cadastrais inválidos.' })
  @ApiConflictResponse({
    description: 'Já existe solicitação em análise ou parceiro ativo.',
  })
  @ApiTooManyRequestsResponse({ description: 'Muitas tentativas de cadastro.' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post()
  submit(
    @Body() input: CreatePartnerApplicationDto,
  ): Promise<PartnerApplicationSubmissionResponseDto> {
    return this.partnerApplicationsService.submit(input);
  }
}
