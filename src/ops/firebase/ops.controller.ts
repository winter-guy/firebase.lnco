import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuthorizationGuard } from 'src/authorization/authorization.guard';
import { FirestoreService } from './firestore/firestore.service';
import { Journal, Record } from 'src/dto/record';

import { FileInterceptor } from '@nestjs/platform-express';

import { AuthService } from 'src/authorization/auth.service';
import { FileRef, UploadData } from 'src/dto/files';
import { StorageService } from './storage/storage.service';

@Controller('api/v2')
export class OpsController {
  constructor(
    private readonly firebase: FirestoreService,
    private readonly storage: StorageService,
    private readonly authService: AuthService,
  ) {}

  @Get('fetch')
  getArtifacts(): Promise<Journal[]> {
    return this.firebase.getArtifacts();
  }

  
  @Get('fetch/:id')
  async getArtefactById(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<Record> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);
    return this.firebase.getArtefactById(id, sub);
  }

  @UseGuards(AuthorizationGuard)
  @Post('publish')
  async createArtefact(
    @Req() request: Request,
    @Body() artefact: Record,
  ): Promise<Record> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);

    console.log(`User ID: ${sub}`);
    return this.firebase.createArtefact(artefact, sub);
  }

  @UseGuards(AuthorizationGuard)
  @Patch('update/:id')
  async updateArtefact(
    @Req() request: Request,
    @Param('id') id: string, 
    @Body() payload: Record,
  ): Promise<Record> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);

    console.log(`User ID: ${sub}`);
    return this.firebase.updateArtefact(id, payload, sub);
  }

  @UseGuards(AuthorizationGuard)
  @Delete('remove/:id')
  async delete(@Req() request: Request, @Param('id') id: string): Promise<void> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);

    return this.firebase.deleteItem(id, sub);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file, @Body('isPrivate') isPrivate: string): Promise<FileRef> {
    const pau = await this.storage.uploadItem(file, JSON.parse(isPrivate));
    return pau;
  }

  @UseGuards(AuthorizationGuard)
  @Post('upload/url')
  async uploadItemByUrl(@Body() uploadData: UploadData): Promise<FileRef> {
    const { url, isPrivate, ref } = uploadData;
    return await this.storage.uploadItemByUrl(url, isPrivate, ref);
  }
}
