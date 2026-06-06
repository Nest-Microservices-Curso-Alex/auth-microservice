import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { envs } from './config';

@Module({
  imports: [AuthModule, MongooseModule.forRoot(envs.mongo_url)],
})
export class AppModule {}
