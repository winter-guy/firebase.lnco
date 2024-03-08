import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { AppService } from 'src/app.service';
import { AuthorizationGuard } from 'src/authorization/authorization.guard';
import { FirebaseService } from './firebase/firebase.service';

@Controller('firestore')
export class FirestoreController {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly appService: AppService,
  ) {}

  @UseGuards(AuthorizationGuard)
  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(AuthorizationGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.firebase.deleteItem(id);
  }
}
