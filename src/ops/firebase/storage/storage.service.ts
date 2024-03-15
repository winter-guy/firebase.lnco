import { Injectable } from '@nestjs/common';
import { InjectFirebaseAdmin, FirebaseAdmin } from 'nestjs-firebase';

import { File } from '@google-cloud/storage';
import { Guid } from '@lib/guid.util';
import { FileRef } from 'src/dto/files';

@Injectable()
export class StorageService {
    constructor(
        @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
      ) { }

      async uploadItem(file: any, isPrivate: boolean): Promise<FileRef> {
        try {
          const guid = Guid.newGuid() + `.${file.originalname.split('.').pop()}`;
          const storageRef = this.firebase.storage.bucket('lnco-artifacts.appspot.com');
    
          const filePath = isPrivate ? 'private/images/' + guid : 'images/' + guid;
    
          const fileRef = storageRef.file(filePath);
          await fileRef.save(file.buffer);
    
          if (isPrivate) {
            const ref = await this.generateRefForPrivateFiles(fileRef);
            return {
              url: ref,
              fileRef: `https://storage.googleapis.com/lnco-artifacts.appspot.com/${filePath}`,
              expiresBy: Date.now() + 15 * 60 * 1000,
            };
          }
    
          await fileRef.makePublic();
          return {
            url: `https://storage.googleapis.com/lnco-artifacts.appspot.com/images/${guid}`,
            fileRef: `https://storage.googleapis.com/lnco-artifacts.appspot.com/${filePath}`,
            expiresBy: 0
          };
    
        } catch (error) {
          console.error(`Error uploading item: ${error}`);
          throw new Error('Failed to upload item');
        }
      }

      async generateRefForPrivateFiles(fileRef: File): Promise<string> {
        const [signedUrl] = await fileRef.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
        });
    
        return signedUrl
      }
}
