import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { TotpService } from './totp.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { SessionReadyGuard } from './guards/session-ready.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    FirebaseAdminService,
    TotpService,
    FirebaseAuthGuard,
    SessionReadyGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    FirebaseAdminService,
    TotpService,
    FirebaseAuthGuard,
    SessionReadyGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
