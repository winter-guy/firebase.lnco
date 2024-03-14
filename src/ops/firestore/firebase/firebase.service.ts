import { File } from '@google-cloud/storage';
import { Guid } from '@lib/guid.util';
import { Injectable } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

import { Artefact, Article } from 'src/dto/artefact';
import { FileRef } from 'src/dto/files';

@Injectable()
export class FirebaseService {
  constructor(
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
  ) {}

  async getArtifacts(): Promise<Artefact[]> {
    const docRef = this.firebase.firestore.collection('artifacts');

    const snapshot = await docRef.get();
    const artifacts: Artefact[] = [];

    snapshot.forEach((doc) => {
      const artefact: Artefact = {
        id: doc.id,
        ...doc.data(),
      } as Artefact;
      artifacts.push(artefact);
    });

    return artifacts;
  }

  async getArtefactById(id: string, _sub: string): Promise<Article> {
    const docRef = this.firebase.firestore.collection('artifacts');

    const snapshot = await docRef.doc(id).get();
    const doesBelongToUser = await this.doesArtefactBelongToUser(id, _sub);

    if (!snapshot.exists) {
      throw new Error('Artefact Not Found');
    }

    return {
      id: snapshot.id,
      isEditable: doesBelongToUser,
      isDelete: doesBelongToUser,
      ...snapshot.data(),
    } as Article;
  }

  async createArtefact(artefact: Artefact, sub: string): Promise<Artefact> {
    try {
      // Add a new document with a generated ID
      const docRef = await this.firebase.firestore
        .collection('artifacts')
        .add(artefact);

      await docRef.update({ ...artefact, id: docRef.id });
      
      // Log the ID of the newly created document
      const isUpdatedRef = await this.updateContributorsWithDocRef(
        docRef.id,
        sub,
      );

      isUpdatedRef;
      // Return the artefact with the generated ID
      return { ...artefact, id: docRef.id };
    } catch (error) {
      console.error(`Error adding document: ${error}`);
      throw new Error('Failed to create artefact');
    }
  }

  async updateContributorsWithDocRef(_docRef: string, _sub: string): Promise<void> {
    const _userRef = this.firebase.firestore
      .collection('contributors')
      .doc(_sub);

    _userRef
      .get()
      .then((docSnapshot) => {
        if (docSnapshot.exists) {
          // Document with ID _sub exists in the 'contributors' collection
          _userRef.update({
            artifacts: [...docSnapshot.data().artifacts, _docRef],
          });

          // check process to verify the id updated in contribution collection of specified sub claim.
        } else {
          // Document with ID _sub does not exist
          console.log('Document does not exist');
          _userRef.set({ artifacts: [_docRef] });
        }
      })
      .catch((error) => {
        console.error('Error checking document existence:', error);
      });
  }

  async updateArtefact(id: string, artefact: Partial<Artefact>, _sub: string): Promise<Artefact> {
    if(!await this.doesArtefactBelongToUser(id, _sub)){
      throw new Error('Failed to update document');
    }

    const docRef = this.firebase.firestore.collection('artifacts').doc(id);
    await docRef.update(artefact);

    const updates = await docRef.get();

    return {
      id: updates.id,
      ...updates.data(),
    } as Artefact;
  }

  async deleteItem(id: string, _sub: string): Promise<void> {
    if(!await this.doesArtefactBelongToUser(id, _sub)){
      throw new Error('Failed to delete document');
    }

    const docRef = this.firebase.firestore.collection('artifacts').doc(id);

    try {
      await docRef.delete();
      console.log(`Document with ID ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting document: ${error}`);
      throw new Error('Failed to delete document');
    }
  }

  async uploadItem(file: any, isPrivate: boolean): Promise<FileRef> {
    try {
      const guid = Guid.newGuid() + `.${file.originalname.split('.').pop()}`;
      const storageRef = this.firebase.storage.bucket('lnco-artifacts.appspot.com');
  
      const filePath = isPrivate ? 'private/images/' + guid : 'images/' + guid;
  
      const fileRef = storageRef.file(filePath);
      await fileRef.save(file.buffer);
  
      if(isPrivate) {
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
  

  async removeDocRefOnDel(): Promise<void> {
    return;
  }

  async doesArtefactBelongToUser(id: string, _sub: string): Promise<boolean> {
    const userRef = this.firebase.firestore
      .collection('contributors')
      .doc(_sub);

    try {
      const userSnapshot = await userRef.get();

      if (!userSnapshot.exists) {
        throw new Error('User Not Found');
      }

      const userData = userSnapshot.data();

      // Check if 'artifacts' array exists and contains the specified ID
      if (userData && userData.artifacts && userData.artifacts.includes(id)) {
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Error checking artifact ownership: ${error['message']}`);
    }
  }
}
