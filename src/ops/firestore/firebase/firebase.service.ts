import { File } from '@google-cloud/storage';
import { Guid } from '@lib/guid.util';
import { Injectable } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

import { Record, SecRecord, Journal } from 'src/dto/artefact';
import { FileRef } from 'src/dto/files';

@Injectable()
export class FirebaseService {
  constructor(
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
  ) { }

  async getArtifacts(): Promise<Journal[]> {
    const docRefs = await this.firebase.firestore.collection('artifacts').get();

    /**
     * Fetch documents in parallel using batched reads
     * @param docRef is QueryDocumentSnapshot of <FirebaseFirestore.DocumentData>
     * 
     * @returns Await all batched reads to complete
    */
    const batchedReads = docRefs.docs.map(async (docRef) => {
      const { meta } = docRef.data() as Record;

      return {
        id: docRef.id,
        author: meta.author,

        // tags: meta.tags,
        forepart: meta.imgs[0],
        backdrop: meta.imgs[1],
        createdDate: meta.createdDate,
        modifiedDate: meta.modifiedDate,

        head: meta.head,
        meta: meta.meta,
        details: meta.details,

        cl: 0
      };
    });

    return await Promise.all(batchedReads);
  }


  async getArtefactById(id: string, _sub: string): Promise<SecRecord> {
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
    } as SecRecord;
  }

  /**
  * Adds a new artefact to the Firestore database and updates contributors.
  * @param artefact The artefact data to be added.
  * @param sub The subject or contributor of the artefact.
  * @returns The artefact with the generated ID.
  */
  async createArtefact(artefact: Record, sub: string): Promise<Record> {
    try {
      // Adding artefact to Firestore collection
      const docRef = await this.firebase.firestore
        .collection('artifacts')
        .add(artefact);

      // Updates artefact with generated ID
      await docRef.update({ ...artefact, id: docRef.id });

      // Update contributors with document reference
      const isUpdatedRef = await this.updateContributorsWithDocRef(
        docRef.id,
        sub,
      );

      isUpdatedRef;

      // Returns the artefact with the generated ID
      return { ...artefact, id: docRef.id };
    } catch (error) {
      // Log error and throw exception if failed
      console.error(`Error adding document: ${error}`);
      throw new Error('Failed to create artefact');
    }
  }


  async updateArtefact(id: string, artefact: Partial<Record>, _sub: string): Promise<Record> {
    if (!await this.doesArtefactBelongToUser(id, _sub)) {
      throw new Error('Failed to update document');
    }

    const docRef = this.firebase.firestore.collection('artifacts').doc(id);
    await docRef.update(artefact);

    const updates = await docRef.get();

    return {
      id: updates.id,
      ...updates.data(),
    } as Record;
  }

  async deleteItem(id: string, _sub: string): Promise<void> {
    if (!await this.doesArtefactBelongToUser(id, _sub)) {
      throw new Error('Failed to delete document');
    }

    const docRef = this.firebase.firestore.collection('artifacts').doc(id);

    try {
      await docRef.delete();
      await this.removeDocRefOnDel(id, _sub);
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

  async removeDocRefOnDel(id: string, _sub: string): Promise<void> {
    const contributorRef = this.firebase.firestore
      .collection('contributors')
      .doc(_sub);

    try {
      const contributorSnapshot = await contributorRef.get();

      if (!contributorSnapshot.exists) {
        throw new Error('Contributor document not found');
      }

      const contributorData = contributorSnapshot.data();
      if (!contributorData || !Array.isArray(contributorData.artifacts)) {
        throw new Error('Artifacts field is missing or not an array');
      }

      const updatedArtifacts = [...contributorData.artifacts];
      const indexToRemove = updatedArtifacts.indexOf(id);

      if (indexToRemove !== -1) {
        updatedArtifacts.splice(indexToRemove, 1); // Remove the item at indexToRemove
      }

      await contributorRef.update({ artifacts: updatedArtifacts });
    } catch (error) {
      console.error('Error removing artifact:', error);
      throw error; // Rethrow the error for handling in the calling function if necessary
    }
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
