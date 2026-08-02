import { ConfigService } from '@nestjs/config';
import {
  FirebasePasswordResetEmailDeliveryError,
  FirebasePasswordResetEmailHttpClient,
} from './firebase-password-reset-email.client';

describe('FirebasePasswordResetEmailHttpClient', () => {
  const fetchMock = jest.fn();
  const client = new FirebasePasswordResetEmailHttpClient(
    new ConfigService({
      firebase: {
        webApiKey: 'firebase-web-api-key',
      },
    }),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('requests the default Firebase password reset email in Portuguese', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await expect(
      client.sendPasswordResetEmail('partner@vekko.test'),
    ).resolves.toBeUndefined();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=firebase-web-api-key',
    );
    expect(request.body).toBe(
      JSON.stringify({
        email: 'partner@vekko.test',
        requestType: 'PASSWORD_RESET',
      }),
    );
    expect(request.headers).toEqual(
      expect.objectContaining({ 'X-Firebase-Locale': 'pt-BR' }),
    );
    expect(request.method).toBe('POST');
  });

  it('maps provider failures without exposing the API key or response', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(
      client.sendPasswordResetEmail('partner@vekko.test'),
    ).rejects.toBeInstanceOf(FirebasePasswordResetEmailDeliveryError);
  });
});
