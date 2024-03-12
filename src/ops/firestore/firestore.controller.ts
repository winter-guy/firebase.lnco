import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthorizationGuard } from 'src/authorization/authorization.guard';
import { FirebaseService } from './firebase/firebase.service';
import { Artefact } from 'src/dto/artefact';

import { AuthService } from 'src/authorization/auth.service';

@Controller('firestore')
export class FirestoreController {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly authService: AuthService,
  ) {}

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

  @UseGuards(AuthorizationGuard)
  @Post('create')
  async createArtefact(
    @Req() request: Request,
    @Body() artefact: Artefact,
  ): Promise<Artefact> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);

    console.log(`User ID: ${sub}`);
    return this.firebase.createArtefact(artefact, sub);
  }

  @UseGuards(AuthorizationGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.firebase.deleteItem(id);
  }
}
