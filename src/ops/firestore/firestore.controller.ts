import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuthorizationGuard } from 'src/authorization/authorization.guard';
import { FirebaseService } from './firebase/firebase.service';
import { Artefact } from 'src/dto/artefact';

import { FileInterceptor } from '@nestjs/platform-express';

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
  async getArtefactById(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<Artefact> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);
    return this.firebase.getArtefactById(id, sub);
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

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file, @Body('isPrivate') isPrivate: string): Promise<string> {
    const pau = await this.firebase.uploadItem(file, JSON.parse(isPrivate));
    return pau;
  }
}
