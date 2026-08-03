import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersController } from './users.controller';
import { CustomerUsersService } from './users.service';

@Module({
  controllers: [UsersController, AdminUsersController],
  exports: [CustomerUsersService],
  providers: [CustomerUsersService],
})
export class UsersModule {}
