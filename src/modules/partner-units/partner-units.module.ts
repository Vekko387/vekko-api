import { Module } from '@nestjs/common';
import { LocationModule } from '../location/location.module';
import { AdminPartnerUnitsController } from './admin-partner-units.controller';
import { AdminServicesController } from './admin-services.controller';
import { PartnerUnitsController } from './partner-units.controller';
import { PartnerUnitsService } from './partner-units.service';
import { ServicesCatalogService } from './services-catalog.service';

@Module({
  controllers: [
    PartnerUnitsController,
    AdminPartnerUnitsController,
    AdminServicesController,
  ],
  imports: [LocationModule],
  providers: [PartnerUnitsService, ServicesCatalogService],
})
export class PartnerUnitsModule {}
