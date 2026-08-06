import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type GeocodeAddressInput,
  type GeocodeAddressResult,
  type LocationAdapter,
  LocationNotFoundError,
  LocationUnavailableError,
} from './location.adapter';

type GoogleGeocodingResult = {
  formatted_address?: unknown;
  geometry?: { location?: { lat?: unknown; lng?: unknown } };
  place_id?: unknown;
};

type GoogleGeocodingResponse = {
  error_message?: unknown;
  results?: unknown;
  status?: unknown;
};

function buildAddress(input: GeocodeAddressInput): string {
  return [
    `${input.street}, ${input.addressNumber}`,
    input.addressComplement,
    input.neighborhood,
    `${input.city} - ${input.state}`,
    input.postalCode,
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ');
}

function parseFirstResult(value: unknown): GeocodeAddressResult {
  if (typeof value !== 'object' || value === null) {
    throw new LocationUnavailableError('Invalid geocoding response.');
  }

  const result = value as GoogleGeocodingResult;
  const latitude = result.geometry?.location?.lat;
  const longitude = result.geometry?.location?.lng;

  if (
    typeof result.formatted_address !== 'string' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number'
  ) {
    throw new LocationUnavailableError('Incomplete geocoding response.');
  }

  return {
    formattedAddress: result.formatted_address,
    latitude,
    longitude,
    ...(typeof result.place_id === 'string'
      ? { providerId: result.place_id }
      : {}),
  };
}

@Injectable()
export class GoogleGeocodingAdapter implements LocationAdapter {
  constructor(private readonly configService: ConfigService) {}

  async geocode(input: GeocodeAddressInput): Promise<GeocodeAddressResult> {
    const apiKey = this.configService.get<string>('location.googleMapsApiKey');

    if (!apiKey) {
      throw new LocationUnavailableError('Google Maps API key not configured.');
    }

    const timeoutMs =
      this.configService.getOrThrow<number>('location.timeoutMs');
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', buildAddress(input));
    url.searchParams.set('components', 'country:BR');
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('key', apiKey);

    let response: Response;

    try {
      response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new LocationUnavailableError();
    }

    if (!response.ok) {
      throw new LocationUnavailableError();
    }

    let payload: GoogleGeocodingResponse;

    try {
      payload = (await response.json()) as GoogleGeocodingResponse;
    } catch {
      throw new LocationUnavailableError('Invalid geocoding response.');
    }

    if (payload.status === 'ZERO_RESULTS') {
      throw new LocationNotFoundError();
    }

    if (payload.status !== 'OK' || !Array.isArray(payload.results)) {
      throw new LocationUnavailableError(
        typeof payload.error_message === 'string'
          ? payload.error_message
          : 'Geocoding request failed.',
      );
    }

    const firstResult: unknown = payload.results[0] as unknown;

    if (!firstResult) {
      throw new LocationNotFoundError();
    }

    return parseFirstResult(firstResult);
  }
}
