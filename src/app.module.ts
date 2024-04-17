import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthorizationModule } from './authorization/authorization.module';
import { ConfigModule } from '@nestjs/config';

import { OpsModule } from './ops/ops.module';
import { FirebaseModule } from 'nestjs-firebase';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AuthorizationModule,
    ConfigModule.forRoot(),
    FirebaseModule.forRoot({
      googleApplicationCredential: {
        projectId: process.env.PROJECT_ID,
        privateKey: process.env.FIREBASE_PK,
        clientEmail: process.env.CLIENT_EMAIL,
      },
    }),
    OpsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
