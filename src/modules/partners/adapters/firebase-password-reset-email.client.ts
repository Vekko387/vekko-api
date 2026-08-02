import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const FIREBASE_PASSWORD_RESET_EMAIL_CLIENT = Symbol(
  'FIREBASE_PASSWORD_RESET_EMAIL_CLIENT',
);

export interface FirebasePasswordResetEmailClient {
  sendPasswordResetEmail(email: string): Promise<void>;
}

export class FirebasePasswordResetEmailDeliveryError extends Error {
  constructor() {
    super('Firebase password reset email delivery failed.');
    this.name = 'FirebasePasswordResetEmailDeliveryError';
  }
}

@Injectable()
export class FirebasePasswordResetEmailHttpClient implements FirebasePasswordResetEmailClient {
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(email: string): Promise<void> {
    const webApiKey =
      this.configService.getOrThrow<string>('firebase.webApiKey');
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(webApiKey)}`,
      {
        body: JSON.stringify({
          email,
          requestType: 'PASSWORD_RESET',
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Locale': 'pt-BR',
        },
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new FirebasePasswordResetEmailDeliveryError();
    }
  }
}
