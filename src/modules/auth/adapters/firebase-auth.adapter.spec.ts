import { ConfigService } from '@nestjs/config';
import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import {
  FirebaseIdentityLookupError,
  FirebaseTokenVerificationError,
} from '../errors/firebase-token-verification.error';
import type { FirebaseAuthClient } from './firebase-admin.client';
import { FirebaseAuthAdapter } from './firebase-auth.adapter';

describe('FirebaseAuthAdapter', () => {
  let adapter: FirebaseAuthAdapter;
  let firebaseAuthClient: jest.Mocked<FirebaseAuthClient>;
  let verifyIdToken: jest.MockedFunction<FirebaseAuthClient['verifyIdToken']>;

  beforeEach(() => {
    verifyIdToken = jest.fn();
    firebaseAuthClient = {
      createUser: jest.fn(),
      findUserByEmail: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
      verifyIdToken,
    };
    adapter = new FirebaseAuthAdapter(
      firebaseAuthClient,
      new ConfigService({
        firebase: {
          projectId: 'vekko-test',
        },
      }),
    );
  });

  it('validates the ID Token with revocation checking enabled', async () => {
    firebaseAuthClient.verifyIdToken.mockResolvedValue({
      aud: 'vekko-test',
      email: 'cliente@vekko.test',
      uid: 'firebase-customer',
    } as DecodedIdToken);

    await expect(adapter.verifyIdToken('valid-token')).resolves.toEqual({
      email: 'cliente@vekko.test',
      firebaseUid: 'firebase-customer',
    });
    expect(verifyIdToken).toHaveBeenCalledWith('valid-token', true);
  });

  it('rejects a token issued for another Firebase project', async () => {
    firebaseAuthClient.verifyIdToken.mockResolvedValue({
      aud: 'another-project',
      uid: 'firebase-customer',
    } as DecodedIdToken);

    await expect(
      adapter.verifyIdToken('wrong-audience'),
    ).rejects.toBeInstanceOf(FirebaseTokenVerificationError);
  });

  it('maps Firebase verification failures to a safe domain error', async () => {
    firebaseAuthClient.verifyIdToken.mockRejectedValue(
      new Error('sensitive SDK details'),
    );

    await expect(adapter.verifyIdToken('invalid-token')).rejects.toEqual(
      new FirebaseTokenVerificationError(),
    );
  });

  it('loads a Firebase user without exposing provider-specific data', async () => {
    firebaseAuthClient.getUser.mockResolvedValue({
      email: 'admin@vekko.test',
      uid: 'firebase-admin',
    } as UserRecord);

    await expect(adapter.getUserIdentity('firebase-admin')).resolves.toEqual({
      email: 'admin@vekko.test',
      firebaseUid: 'firebase-admin',
    });
  });

  it('maps Firebase user lookup failures to a safe domain error', async () => {
    firebaseAuthClient.getUser.mockRejectedValue(new Error('not found'));

    await expect(
      adapter.getUserIdentity('missing-user'),
    ).rejects.toBeInstanceOf(FirebaseIdentityLookupError);
  });
});
