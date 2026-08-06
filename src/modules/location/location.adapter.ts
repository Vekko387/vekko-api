export const LOCATION_ADAPTER = Symbol('LOCATION_ADAPTER');

export type GeocodeAddressInput = {
  addressComplement?: string | null;
  addressNumber: string;
  city: string;
  neighborhood: string;
  postalCode: string;
  state: string;
  street: string;
};

export type GeocodeAddressResult = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  providerId?: string;
};

export interface LocationAdapter {
  geocode(input: GeocodeAddressInput): Promise<GeocodeAddressResult>;
}

export class LocationUnavailableError extends Error {
  constructor(message = 'Location provider unavailable.') {
    super(message);
    this.name = 'LocationUnavailableError';
  }
}

export class LocationNotFoundError extends Error {
  constructor() {
    super('The address could not be geocoded.');
    this.name = 'LocationNotFoundError';
  }
}
