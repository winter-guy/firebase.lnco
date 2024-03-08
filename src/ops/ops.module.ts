import { Module } from '@nestjs/common';
import { FirestoreController } from './firestore/firestore.controller';
import { FirebaseService } from './firestore/firebase/firebase.service';
import { AuthorizationModule } from 'src/authorization/authorization.module';
import { ConfigModule } from '@nestjs/config';
import { AppService } from 'src/app.service';

@Module({
  imports: [AuthorizationModule, ConfigModule.forRoot()],
  controllers: [FirestoreController],
  providers: [FirebaseService, AppService],
})
export class OpsModule {}
