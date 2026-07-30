import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FirebaseIdentityLookupError,
  FirebaseTokenVerificationError,
} from '../errors/firebase-token-verification.error';
import type { FirebaseIdentity } from '../types/authenticated-user';
import { FIREBASE_AUTH_CLIENT } from './firebase-admin.client';
import type { FirebaseAuthClient } from './firebase-admin.client';

@Injectable()
export class FirebaseAuthAdapter {
  constructor(
    @Inject(FIREBASE_AUTH_CLIENT)
    private readonly firebaseAuthClient: FirebaseAuthClient,
    private readonly configService: ConfigService,
  ) {}

  async verifyIdToken(idToken: string): Promise<FirebaseIdentity> {
    try {
      const decodedToken = await this.firebaseAuthClient.verifyIdToken(
        idToken,
        true,
      );
      const expectedProjectId =
        this.configService.getOrThrow<string>('firebase.projectId');

      if (decodedToken.aud !== expectedProjectId || !decodedToken.uid.trim()) {
        throw new FirebaseTokenVerificationError();
      }

      return {
        email: decodedToken.email,
        firebaseUid: decodedToken.uid,
      };
    } catch {
      throw new FirebaseTokenVerificationError();
    }
  }

  async getUserIdentity(firebaseUid: string): Promise<FirebaseIdentity> {
    try {
      const firebaseUser = await this.firebaseAuthClient.getUser(firebaseUid);

      return {
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid,
      };
    } catch {
      throw new FirebaseIdentityLookupError();
    }
  }
}
