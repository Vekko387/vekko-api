import { ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';
import { PrismaService } from '../database/prisma.service';
import { Role } from '../generated/prisma/enums';
import { FirebaseAdminClient } from '../modules/auth/adapters/firebase-admin.client';
import { FirebaseAuthAdapter } from '../modules/auth/adapters/firebase-auth.adapter';
import { StagingUserProvisionerService } from '../modules/auth/services/staging-user-provisioner.service';
import { UsersService } from '../modules/auth/services/users.service';

function readArgument(name: string): string | undefined {
  const index = process.argv.findIndex(
    (argument) => argument === `--${name}` || argument.startsWith(`--${name}=`),
  );

  if (index === -1) {
    return undefined;
  }

  const argument = process.argv[index];
  const separatorIndex = argument.indexOf('=');

  return separatorIndex >= 0
    ? argument.slice(separatorIndex + 1)
    : process.argv[index + 1];
}

function parseRole(value?: string): Role {
  if (!value || !Object.values(Role).includes(value as Role)) {
    throw new Error('A valid --role argument is required.');
  }

  return value as Role;
}

async function provision(): Promise<void> {
  const firebaseUid = readArgument('firebase-uid');
  const role = parseRole(readArgument('role'));

  if (!firebaseUid) {
    throw new Error('A --firebase-uid argument is required.');
  }

  const configService = new ConfigService(configuration());
  const prismaService = new PrismaService(configService);
  const firebaseAdminClient = new FirebaseAdminClient(configService);
  const firebaseAuthAdapter = new FirebaseAuthAdapter(
    firebaseAdminClient,
    configService,
  );
  const usersService = new UsersService(prismaService);
  const provisioner = new StagingUserProvisionerService(
    configService,
    firebaseAuthAdapter,
    usersService,
  );

  try {
    await prismaService.onModuleInit();
    const user = await provisioner.provision(firebaseUid, role);

    process.stdout.write(
      `Provisioned ${user.firebaseUid} with role ${role} in staging.\n`,
    );
  } finally {
    await firebaseAdminClient.onModuleDestroy();
    await prismaService.onModuleDestroy();
  }
}

void provision().catch(() => {
  process.stderr.write('Staging user provisioning failed.\n');
  process.exitCode = 1;
});
