import { IsOptional } from 'class-validator';

export class Artefact {
  id: string;
  author: string | undefined;
  blocks: BlocksEntity[];
  time: number;
  version: string;
  username: string | undefined;
  content_length: string;
  tag: Tag[];
  highlight: Highlight;
}

export class BlocksEntity {
  data: Data;
  id: string;
  type: string;
}

export class Data {
  @IsOptional()
  level?: number | null;

  @IsOptional()
  text?: string | null;

  @IsOptional()
  caption?: string | null;

  @IsOptional()
  file?: File | null;

  @IsOptional()
  stretched?: boolean | null;

  @IsOptional()
  withBackground?: boolean | null;

  @IsOptional()
  withBorder?: boolean | null;

  @IsOptional()
  items?: string[] | null;

  @IsOptional()
  style?: string | null;

  @IsOptional()
  code?: string | null;
}

export interface File {
  url: string;
}

export class Tag {
  name: string;
}

export class Highlights {
  @IsOptional()
  author?: string;

  @IsOptional()
  header?: string | null;
  content: string;
}

export interface PublishMeta extends Highlights {
  imgUrl?: string[] | string;
}

export interface Highlight extends Highlights {
  id: string;
  username?: string | undefined;
  content_length?: string;
  tag: Tag[];
  imgUrl?: string;
  time?: string;
}
