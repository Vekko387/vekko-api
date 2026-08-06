import { Module } from '@nestjs/common';
import { GoogleGeocodingAdapter } from './google-geocoding.adapter';
import { LOCATION_ADAPTER } from './location.adapter';

@Module({
  exports: [LOCATION_ADAPTER],
  providers: [
    GoogleGeocodingAdapter,
    {
      provide: LOCATION_ADAPTER,
      useExisting: GoogleGeocodingAdapter,
    },
  ],
})
export class LocationModule {}
