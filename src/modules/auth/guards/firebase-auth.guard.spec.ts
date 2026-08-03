import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Role, UserStatus } from '../../../generated/prisma/enums';
import { FirebaseAuthAdapter } from '../adapters/firebase-auth.adapter';
import { FirebaseTokenVerificationError } from '../errors/firebase-token-verification.error';
import { UsersService } from '../services/users.service';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { FirebaseAuthGuard } from './firebase-auth.guard';

function createContext(request: Request): ExecutionContext {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getNext: jest.fn(),
      getRequest: () => request,
      getResponse: jest.fn(),
    }),
  } as unknown as ExecutionContext;
}

describe('FirebaseAuthGuard', () => {
  let firebaseAuthAdapter: jest.Mocked<FirebaseAuthAdapter>;
  let reflector: jest.Mocked<Reflector>;
  let usersService: jest.Mocked<UsersService>;
  let guard: FirebaseAuthGuard;
  let findOrCreateCustomer: jest.MockedFunction<
    UsersService['findOrCreateCustomer']
  >;
  let verifyIdToken: jest.MockedFunction<FirebaseAuthAdapter['verifyIdToken']>;

  const authenticatedUser: AuthenticatedUser = {
    email: 'cliente@vekko.test',
    firebaseUid: 'firebase-customer',
    id: 'bbf3a09e-c57d-4c6c-81cc-4a58bb738c05',
    profile: {},
    roles: [Role.CUSTOMER],
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    verifyIdToken = jest.fn();
    firebaseAuthAdapter = {
      getUserIdentity: jest.fn(),
      verifyIdToken,
    } as unknown as jest.Mocked<FirebaseAuthAdapter>;
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;
    findOrCreateCustomer = jest.fn();
    usersService = {
      findOrCreateCustomer,
      provisionInternalUser: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    guard = new FirebaseAuthGuard(reflector, firebaseAuthAdapter, usersService);
  });

  it('allows routes marked as public without reading a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const request = {
      headers: {},
    } as Request;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('returns 401 when the Bearer Token is absent', async () => {
    const request = {
      headers: {},
    } as Request;

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 401 when Firebase rejects the token', async () => {
    firebaseAuthAdapter.verifyIdToken.mockRejectedValue(
      new FirebaseTokenVerificationError(),
    );
    const request = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    } as Request;

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loads the local user and attaches it to request.user', async () => {
    firebaseAuthAdapter.verifyIdToken.mockResolvedValue({
      email: 'cliente@vekko.test',
      firebaseUid: 'firebase-customer',
    });
    usersService.findOrCreateCustomer.mockResolvedValue(authenticatedUser);
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as Request;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(authenticatedUser);
    expect(findOrCreateCustomer).toHaveBeenCalledWith({
      email: 'cliente@vekko.test',
      firebaseUid: 'firebase-customer',
    });
  });

  it('blocks a local account even when Firebase accepts the token', async () => {
    firebaseAuthAdapter.verifyIdToken.mockResolvedValue({
      email: 'cliente@vekko.test',
      firebaseUid: 'firebase-customer',
    });
    usersService.findOrCreateCustomer.mockResolvedValue({
      ...authenticatedUser,
      status: UserStatus.BLOCKED,
    });
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as Request;

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      response: {
        code: 'ACCOUNT_BLOCKED',
      },
    });
  });
});
