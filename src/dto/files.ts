export interface FileRef {
    url: string;
    fileRef: string;
    expiresBy?: number
  }

export interface UploadData {
  url: string;
  isPrivate: boolean;
  ref?: string
}