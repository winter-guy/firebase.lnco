import { Injectable } from '@nestjs/common';
import { InjectFirebaseAdmin, FirebaseAdmin } from 'nestjs-firebase';

import { File } from '@google-cloud/storage';

import { Guid } from '@lib/guid.util';
import { FileRef } from 'src/dto/files';
import { HttpService } from '@nestjs/axios';
import sharp from 'sharp';

// import { fileTypeFromBuffer } from 'file-type';

@Injectable()
export class StorageService {
    constructor(
        @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin, private readonly httpService: HttpService
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

      async uploadItemByUrl(url: string, isPrivate: boolean): Promise<FileRef> {
        try {
          const guid = Guid.newGuid();
          const storageRef = this.firebase.storage.bucket('lnco-artifacts.appspot.com');
    
          const filePath = isPrivate ? 'private/images/' + guid : 'images/' + guid;
          const fileRef = storageRef.file(filePath);
    
          // Download the file from the URL
          const response = await this.httpService.get(url, { responseType: 'arraybuffer' }).toPromise();
          let fileBuffer = Buffer.from(response.data);
    
          // Check the file type 
          const FileType = (await import('file-type'));

          const detectedType = await FileType.fileTypeFromBuffer(fileBuffer);
          // const detectedType = await FileType.fileTypeFromBuffer(fileBuffer);
          if (!detectedType || detectedType.mime !== 'image/png') {
            // If the file is not PNG, convert it to PNG using sharp
            const convertedBuffer = await sharp(fileBuffer)
              .toFormat('png')
              .toBuffer();

            // Update the file buffer to the converted PNG buffer
            fileBuffer = convertedBuffer;
          }
          
          // Save the file buffer to storage
          await fileRef.save(fileBuffer, {
            contentType: 'image/png' // Or set it based on the detectedType if available
        });
    
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
      
      async deleteItemById(fileId: string, isPrivate: boolean): Promise<void> {
        try {
            const storageRef = this.firebase.storage.bucket('lnco-artifacts.appspot.com');
            
            // Construct the file path based on whether it's private or public
            const filePath = isPrivate ? `private/images/${fileId}` : `images/${fileId}`;
            
            // Create a reference to the file
            const fileRef = storageRef.file(filePath);
    
            // Check if the file exists
            const exists = await fileRef.exists();
            if (!exists[0]) {
                throw new Error('File not found');
            }
    
            // Delete the file
            await fileRef.delete();
    
            console.log(`File ${fileId} deleted successfully`);
        } catch (error) {
            console.error(`Error deleting item: ${error}`);
            throw new Error('Failed to delete item');
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

      async updateContributorsWithDocRef(_docRefID: string, _sub: string): Promise<void> {
        const contributorRef = this.firebase.firestore
          .collection('contributors')
          .doc(_sub);
    
        contributorRef
          .get()
          .then((contributorSnapshot) => {
            if (contributorSnapshot.exists) {
              // Document with ID _sub exists in the 'contributors' collection
              contributorRef.update({
                artifacts: [...contributorSnapshot.data().artifacts, _docRefID],
              });
    
              // check process to verify the id updated in contribution collection of specified sub claim.
            } else {
              // Document with ID _sub does not exist
              console.log('Document does not exist');
              contributorRef.set({ artifacts: [_docRefID] });
            }
          })
          .catch((error) => {
            console.error('Error checking document existence:', error);
          });
      }
}
