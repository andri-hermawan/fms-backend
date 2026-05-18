import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
// import { AppService } from './app.service';

@Module({
  imports: [
    // Import module lain (ConfigModule, VehicleModule, dll)
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
