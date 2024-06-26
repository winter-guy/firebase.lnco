import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
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
import { DraftService } from './draft/draft.service';

@Controller('api/v2')
export class OpsController {
  constructor(
    private readonly firebase: FirestoreService,
    private readonly storage: StorageService,
    private readonly authService: AuthService,

    private readonly drafts: DraftService,
  ) {}

  @Get('fetch')
  getArtifacts(): Promise<Journal[]> {
    return this.firebase.getArtifacts();
  }

  @UseGuards(AuthorizationGuard)
  @Get('user/journal')
  async getJournal(@Req() request: Request): Promise<Journal[]> {
    const authorizationHeader = request.headers['authorization'];

    if (!authorizationHeader) {
      // return this.firebase.getArtefactById(id);
      // throw exception (disabled) -> triggers logout event.
      throw new UnauthorizedException(
        'Authentication required. Authorization header missing',
      );
    }

    const token = authorizationHeader.replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);

    return this.firebase.getJournal(sub);
  }

  @Get('fetch/:id')
  async getArtefactById(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<Record> {
    // Retrieve the Authorization header from the request
    const authorizationHeader = request.headers['authorization'];

    // Check if Authorization header is present in the request
    if (!authorizationHeader) {
      return this.firebase.getArtefactById(id);

      // throw exception (disabled) -> triggers logout event.
      throw new UnauthorizedException(
        'Authentication required. Authorization header missing',
      );
    }

    // Extract token from the Authorization header
    const token = authorizationHeader.replace('Bearer ', '');

    // Retrieve sub from token
    const sub = await this.authService.getSubFromToken(token);

    // Return the artifact data
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

    return this.firebase.updateArtefact(id, payload, sub);
  }

  @UseGuards(AuthorizationGuard)
  @Delete('remove/:id')
  async delete(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<void> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);

    return this.firebase.deleteItem(id, sub);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file,
    @Body('isPrivate') isPrivate: string,
  ): Promise<FileRef> {
    const pau = await this.storage.uploadItem(file, JSON.parse(isPrivate));
    return pau;
  }

  @UseGuards(AuthorizationGuard)
  @Post('upload/url')
  async uploadItemByUrl(@Body() uploadData: UploadData): Promise<FileRef> {
    const { url, isPrivate, ref } = uploadData;
    return await this.storage.uploadItemByUrl(url, isPrivate, ref);
  }

  @UseGuards(AuthorizationGuard)
  @Post('draft')
  async createDraft(
    @Req() request: Request,
    @Body() artefact: Record,
  ): Promise<Record> {
    const token = request.headers['authorization'].replace('Bearer ', '');
    const sub = await this.authService.getSubFromToken(token);

    return this.drafts.createDraftOfInstance(artefact, sub);
  }
}
