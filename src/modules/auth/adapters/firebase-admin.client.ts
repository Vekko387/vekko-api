import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { App } from 'firebase-admin/app';
import type { Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';

export const FIREBASE_AUTH_CLIENT = Symbol('FIREBASE_AUTH_CLIENT');

export interface FirebaseAuthClient {
  getUser(firebaseUid: string): Promise<UserRecord>;
  verifyIdToken(
    idToken: string,
    checkRevoked: boolean,
  ): Promise<DecodedIdToken>;
}

@Injectable()
export class FirebaseAdminClient
  implements FirebaseAuthClient, OnModuleDestroy
{
  private app?: App;
  private ownsApp = false;

  constructor(private readonly configService: ConfigService) {}

  async getUser(firebaseUid: string): Promise<UserRecord> {
    const firebaseAuth = await this.getFirebaseAuth();

    return firebaseAuth.getUser(firebaseUid);
  }

  async verifyIdToken(
    idToken: string,
    checkRevoked: boolean,
  ): Promise<DecodedIdToken> {
    const firebaseAuth = await this.getFirebaseAuth();

    return firebaseAuth.verifyIdToken(idToken, checkRevoked);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.app && this.ownsApp) {
      const { deleteApp } = await import('firebase-admin/app');

      await deleteApp(this.app);
    }
  }

  private async getFirebaseAuth(): Promise<Auth> {
    if (!this.app) {
      this.app = await this.getOrCreateApp();
    }

    const { getAuth } = await import('firebase-admin/auth');

    return getAuth(this.app);
  }

  private async getOrCreateApp(): Promise<App> {
    const { cert, getApps, initializeApp } = await import('firebase-admin/app');
    const environment =
      this.configService.getOrThrow<string>('app.environment');
    const appName = `vekko-api-${environment}`;
    const existingApp = getApps().find((app) => app.name === appName);

    if (existingApp) {
      return existingApp;
    }

    const clientEmail = this.configService.getOrThrow<string>(
      'firebase.clientEmail',
    );
    const privateKey = this.configService
      .getOrThrow<string>('firebase.privateKey')
      .replace(/\\n/gu, '\n');
    const projectId =
      this.configService.getOrThrow<string>('firebase.projectId');

    this.ownsApp = true;

    return initializeApp(
      {
        credential: cert({
          clientEmail,
          privateKey,
          projectId,
        }),
        projectId,
      },
      appName,
    );
  }
}
