import { Module } from '@nestjs/common';
import { OpsController } from './firebase/ops.controller';
import { FirestoreService } from './firebase/firestore/firestore.service';
import { AuthorizationModule } from 'src/authorization/authorization.module';
import { ConfigModule } from '@nestjs/config';
import { AppService } from 'src/app.service';
import { StorageService } from './firebase/storage/storage.service';
import { HttpModule } from '@nestjs/axios';
import { DraftService } from './firebase/draft/draft.service';
import { SharedService } from './firebase/shared/shared.service';
import { HealthModule } from 'src/health/health.module';

@Module({
  imports: [
    AuthorizationModule,
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
    ConfigModule.forRoot(),
    HealthModule,
  ],
  controllers: [OpsController],
  providers: [
    FirestoreService,
    StorageService,
    DraftService,

    SharedService,

    AppService,
  ],
})
export class OpsModule {}
