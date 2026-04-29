import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Jadikan Global agar tidak perlu di-import berulang kali di tiap module
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
