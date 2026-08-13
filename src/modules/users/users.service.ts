/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Prisma, projects, users } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  // Helper untuk membuang password_hash dari response
  private excludePassword(user: users): Omit<users, 'password_hash'> {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async create(dto: CreateUserDto) {
    // 1. Validasi Input Dasar (Sebaiknya ini sudah ditangani @IsNotEmpty di DTO,
    // tapi tidak apa-apa untuk double check)
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and Password are required');
    }

    // 2. Cek Duplikasi Email
    const existingUser = await this.repository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(
        `User with email '${dto.email}' already exists`,
      );
    }

    // 3. Hashing Password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // 4. Simpan ke Database
    const user = await this.repository.create({
      name: dto.name,
      email: dto.email,
      password_hash: hashedPassword,
      role: dto.role,
      status: dto.status || 'active',
      // JIKA dto.project_id ada, gunakan koneksi relasi Prisma
      ...(dto.project_id && {
        projects: {
          connect: { id: dto.project_id },
        },
      }),
    });

    // 5. Kembalikan data tanpa password_hash
    return this.excludePassword(user);
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, role, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.usersWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) where.role = role;
    if (status) where.status = status;

    const [data, total] = await this.repository.findAll({
      skip,
      take: limit,
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      data: data.map((user) => this.excludePassword(user)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    return this.excludePassword(user);
  }

  // ===================================================================
  // PERUBAHAN DI SINI: Menggunakan method khusus repository & tipe data custom
  // ===================================================================
  async findByEmailForAuth(
    email: string,
  ): Promise<(users & { projects: projects | null }) | null> {
    const user = await this.repository.findByEmailWithProject(email);
    if (!user) {
      return null;
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // Pastikan user ada

    if (dto.email) {
      const existing = await this.repository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Email '${dto.email}' is already in use`);
      }
    }

    const updateData: Prisma.usersUpdateInput = {
      name: dto.name,
      email: dto.email,
      role: dto.role,
      status: dto.status,
      // JIKA dto.project_id ada, gunakan koneksi relasi Prisma
      ...(dto.project_id && {
        projects: {
          connect: { id: dto.project_id },
        },
      }),
      updated_at: new Date(),
    };

    // Jika user mengupdate password
    if (dto.password) {
      updateData.password_hash = await bcrypt.hash(dto.password, 10);
    }

    const updatedUser = await this.repository.update(id, updateData);
    return this.excludePassword(updatedUser);
  }

  async remove(id: string) {
    await this.findOne(id);
    const deletedUser = await this.repository.delete(id);
    return this.excludePassword(deletedUser);
  }
}
