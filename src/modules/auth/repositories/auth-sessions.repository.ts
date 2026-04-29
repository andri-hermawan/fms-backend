import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, auth_sessions } from '@prisma/client';

@Injectable()
export class AuthSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.auth_sessionsUncheckedCreateInput,
  ): Promise<auth_sessions> {
    return await this.prisma.auth_sessions.create({ data });
  }

  async findByToken(token: string): Promise<auth_sessions | null> {
    return await this.prisma.auth_sessions.findFirst({
      where: {
        access_token: token, // Sesuai nama kolom di schema Anda
      },
    });
  }

  // Karena kolom 'is_revoked' tidak ada di schema Anda,
  // kita gunakan penghapusan data untuk proses logout (Standar Session)
  async deleteToken(token: string): Promise<void> {
    await this.prisma.auth_sessions.deleteMany({
      where: { access_token: token },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.auth_sessions.deleteMany({
      where: {
        expired_at: { lt: new Date() },
      },
    });
  }

  async findByRefreshToken(token: string): Promise<auth_sessions | null> {
    return await this.prisma.auth_sessions.findFirst({
      where: {
        refresh_token: token,
        expired_at: { gt: new Date() },
      },
    });
  }

  // Update token lama dengan yang baru saat refresh
  async updateTokens(
    id: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prisma.auth_sessions.update({
      where: { id },
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  }
}
