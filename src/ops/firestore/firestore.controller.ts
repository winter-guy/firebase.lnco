import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppService } from 'src/app.service';
import { AuthorizationGuard } from 'src/authorization/authorization.guard';
import { FirebaseService } from './firebase/firebase.service';
import { Artefact } from 'src/dto/artefact';

import { Guid } from '@lib/guid.util';

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
  @Get('artifacts')
  getArtifacts(): Promise<Artefact[]> {
    return this.firebase.getArtifacts();
  }
  @UseGuards(AuthorizationGuard)
  @Get(':id')
  getArtefactById(@Param('id') id: string): Promise<Artefact> {
    return this.firebase.getArtefactById(id);
  }

  @Post()
  createArtefact(@Body() artefact: Artefact): Promise<Artefact> {
    const uuid = Guid.newGuid();
    uuid;

    return this.firebase.createArtefact(artefact);
  }

  @UseGuards(AuthorizationGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.firebase.deleteItem(id);
  }
}
