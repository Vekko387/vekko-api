import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePartnerApplicationDto } from './create-partner-application.dto';

export class UpdatePartnerApplicationDto extends PartialType(
  OmitType(CreatePartnerApplicationDto, ['termsAccepted'] as const),
) {}

export class UpdatePartnerDetailsDto extends PartialType(
  OmitType(CreatePartnerApplicationDto, ['cnpj', 'termsAccepted'] as const),
) {}
