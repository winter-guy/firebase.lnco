import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthorizationModule } from './authorization/authorization.module';
import { ConfigModule } from '@nestjs/config';

import { OpsModule } from './ops/ops.module';
import { FirebaseModule } from 'nestjs-firebase';

@Module({
  imports: [
    AuthorizationModule,
    ConfigModule.forRoot(),
    FirebaseModule.forRoot({
      googleApplicationCredential:
        'key/lnco-artifacts-firebase-adminsdk-llblk-d3308ac0f5.json',
    }),
    OpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
