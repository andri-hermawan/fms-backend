import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthSessionsRepository } from './repositories/auth-sessions.repository';
import { projects, users } from '@prisma/client';
/**
 * Enterprise Entity Extension
 * Memperluas tipe data bawaan ORM menjadi Model Domain yang valid di level aplikasi.
 * Ini memastikan properti 'geom_origin' diakui secara legal oleh TypeScript tanpa menggunakan 'as any'.
 */
export type ExtNodeProject = projects & {
  geom_origin: unknown; // Menggunakan 'unknown' jauh lebih aman dan ketat daripada 'any'
};

export type UserWithExtendedProject = users & {
  projects: ExtNodeProject | null;
};

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
    // 1. CARI USER & PAKSA TYPESCRIPT MENGENAL EXTENDED ENTITY YANG KITA BUAT DI ATAS
    const user = (await this.usersService.findByEmailForAuth(
      email,
    )) as UserWithExtendedProject | null;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Verifikasi Password
    const isMatch = await bcrypt.compare(pass, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Siapkan Payload
    const payload = { email: user.email, sub: user.id, role: user.role };

    // 4. Generate Tokens
    const tokens = await this.generateTokens(payload);

    // 5. Simpan ke database auth_sessions
    await this.sessionRepository.create({
      user_id: user.id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // 6. Response ke Client dengan data project hasil JOIN
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      // Sekarang 'user.projects' dievaluasi sebagai 'ExtNodeProject' yang memiliki 'geom_origin'
      project: user.projects
        ? {
            id: user.projects.id,
            project_code: user.projects.project_code,
            project_name: user.projects.project_name,
            geojson_origin: user.projects.geojson_origin,
            geom_origin: user.projects.geom_origin, // <--- ERROR GARIS MERAH AKAN HILANG TOTAL DI SINI
          }
        : null,
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
