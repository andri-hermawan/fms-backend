import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthSessionsRepository } from './repositories/auth-sessions.repository';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Ambil data dari configuration.ts
        const secret = config.get<string>('jwt.secret');
        const expiresIn = config.get<string>('jwt.accessExpires');

        return {
          secret: secret ?? 'fallbackSecret',
          signOptions: {
            // Gunakan 'as any' untuk menghindari error TS pada StringValue
            expiresIn: (expiresIn ?? '1h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthSessionsRepository],
})
export class AuthModule {}
