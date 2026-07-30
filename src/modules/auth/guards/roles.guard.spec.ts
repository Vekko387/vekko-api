import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Role } from '../../../generated/prisma/enums';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../auth.constants';
import { RolesGuard } from './roles.guard';

function createContext(roles: Role[]): ExecutionContext {
  const request = {
    headers: {},
    user: {
      email: 'usuario@vekko.test',
      firebaseUid: 'firebase-user',
      id: 'b2211b22-e27f-462f-bf09-c42b5457a489',
      profile: {},
      roles,
    },
  } as Request;

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

describe('RolesGuard', () => {
  it('allows a user with one of the required PostgreSQL roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) {
          return false;
        }

        return key === ROLES_KEY ? [Role.PARTNER_OWNER, Role.ADMIN] : undefined;
      }),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext([Role.PARTNER_OWNER]))).toBe(true);
  });

  it('returns 403 when the required role is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === ROLES_KEY ? [Role.ADMIN] : false,
      ),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext([Role.CUSTOMER]))).toThrow(
      ForbiddenException,
    );
  });

  it('allows authenticated routes that do not declare roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext([Role.CUSTOMER]))).toBe(true);
  });
});
