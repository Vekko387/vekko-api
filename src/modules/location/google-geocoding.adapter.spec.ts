import type { ConfigService } from '@nestjs/config';
import {
  LocationNotFoundError,
  LocationUnavailableError,
} from './location.adapter';
import { GoogleGeocodingAdapter } from './google-geocoding.adapter';

const address = {
  addressNumber: '123',
  city: 'Uberlândia',
  neighborhood: 'Centro',
  postalCode: '38400000',
  state: 'MG',
  street: 'Avenida Afonso Pena',
};

function createAdapter(apiKey = 'test-key'): GoogleGeocodingAdapter {
  const configService = {
    get: jest.fn().mockReturnValue(apiKey || undefined),
    getOrThrow: jest.fn().mockReturnValue(5_000),
  } as unknown as ConfigService;

  return new GoogleGeocodingAdapter(configService);
}

describe('GoogleGeocodingAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps the normalized Google result without exposing the API key', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              formatted_address:
                'Av. Afonso Pena, 123 - Centro, Uberlândia - MG',
              geometry: { location: { lat: -18.9186, lng: -48.2772 } },
              place_id: 'google-place-id',
            },
          ],
          status: 'OK',
        }),
        { status: 200 },
      ),
    );

    await expect(createAdapter().geocode(address)).resolves.toEqual({
      formattedAddress: 'Av. Afonso Pena, 123 - Centro, Uberlândia - MG',
      latitude: -18.9186,
      longitude: -48.2772,
      providerId: 'google-place-id',
    });
    const requestInput = fetchMock.mock.calls[0]?.[0];
    expect(requestInput).toBeInstanceOf(URL);
    const requestedUrl =
      requestInput instanceof URL ? requestInput.toString() : '';
    expect(requestedUrl).toContain('components=country%3ABR');
    expect(requestedUrl).toContain('key=test-key');
  });

  it('distinguishes an address without results from a provider outage', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [], status: 'ZERO_RESULTS' }), {
        status: 200,
      }),
    );

    await expect(createAdapter().geocode(address)).rejects.toBeInstanceOf(
      LocationNotFoundError,
    );
  });

  it('fails safely when the server key is not configured', async () => {
    await expect(createAdapter('').geocode(address)).rejects.toBeInstanceOf(
      LocationUnavailableError,
    );
  });
});
