import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthSessionsRepository } from './repositories/auth-sessions.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly sessionRepository: AuthSessionsRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper internal untuk membuat Access Token dan Refresh Token sekaligus.
   * Mengambil umur token dari ConfigService (configuration.ts).
   */
  private async generateTokens(payload: any) {
    // agar bisa diterima oleh signAsync sebagai StringValue
    const accessExpires =
      this.configService.get<string>('jwt.accessExpires') || '1h';
    const refreshExpires =
      this.configService.get<string>('jwt.refreshExpires') || '7d';

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: accessExpires as any, // Type casting ke any untuk melewati validasi StringValue
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: refreshExpires as any,
      }),
    ]);

    return { accessToken: at, refreshToken: rt };
  }

  /**
   * Proses Login Utama
   */
  async login(email: string, pass: string) {
    // 1. Cari user (termasuk password_hash)
    const user = await this.usersService.findByEmailForAuth(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Verifikasi Password
    const isMatch = await bcrypt.compare(pass, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Siapkan Payload (data minimal)
    const payload = { email: user.email, sub: user.id, role: user.role };

    // 4. Generate Tokens
    const tokens = await this.generateTokens(payload);

    // 5. Simpan ke database auth_sessions
    // Kita set expired_at di DB mengikuti umur Refresh Token (7 hari)
    await this.sessionRepository.create({
      user_id: user.id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // 6. Response ke Client
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Proses pembaruan Access Token menggunakan Refresh Token
   */
  async refresh(refreshToken: string) {
    // 1. Validasi keberadaan refresh_token di database
    const session =
      await this.sessionRepository.findByRefreshToken(refreshToken);

    if (!session || !session.user_id) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Ambil data user terbaru untuk payload
    const user = await this.usersService.findOne(session.user_id);
    const payload = { email: user.email, sub: user.id, role: user.role };

    // 3. Generate sepasang token baru (Rotate Refresh Token)
    const tokens = await this.generateTokens(payload);

    // 4. Update sesi di database dengan token yang baru
    await this.sessionRepository.updateTokens(
      session.id,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return tokens;
  }
}
