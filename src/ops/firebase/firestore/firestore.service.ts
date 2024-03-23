import { Injectable } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

import { Record, SecRecord, Journal } from 'src/dto/record';


@Injectable()
export class FirestoreService {
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

        tags: meta.tags,
        cl: 0
      };
    });

    return await Promise.all(batchedReads);
  }

  /**
   * Retrieves an artefact from the Firestore database by its ID and determines its accessibility for the specified user.
   * @param id The ID of the artefact to retrieve.
   * @param _sub The subject or identifier of the user.
   * @returns A Promise resolving to an object containing the artefact data and its accessibility status.
   * @throws Error if the artefact is not found or if there's an error accessing the database.
   */
  async getArtefactById(id: string, _sub: string): Promise<SecRecord> {
    const docRef = this.firebase.firestore.collection('artifacts');

    // Retrieve artefact snapshot from Firestore
    const snapshot = await docRef.doc(id).get();

    // Check if the artefact belongs to the specified user
    const doesBelongToUser = await this.doesArtefactBelongToUser(id, _sub);

    // Throw an error if the artefact does not exist
    if (!snapshot.exists) {
      throw new Error('Artefact Not Found');
    }

    // Return the artefact data along with its accessibility status
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
        .add(await this.recordPreParser(artefact));

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

  /**
   * Updates an artefact in the Firestore database, ensuring the document exists before updating.
   * Throws an error if the document doesn't exist or if the artefact doesn't belong to the user.
   * @param _id The ID of the artefact document.
   * @param artefact The partial artefact object containing fields to update.
   * @param _sub The user's ID.
   * @returns The updated artefact document.
   * @throws Error if the document doesn't exist or if the artefact doesn't belong to the user.
   */
  async updateArtefact(_id: string, artefact: Partial<Record>, _sub: string): Promise<Record> {
    // Check if the document exists before proceeding
    const docRef = this.firebase.firestore.collection('artifacts').doc(_id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      throw new Error('Document does not exist');
    }

    // Check if the artefact belongs to the user
    if (!await this.doesArtefactBelongToUser(_id, _sub)) {
      throw new Error('Failed to update document');
    }

    // Update the document
    const { id, meta } = docSnapshot.data() as Record;
    await docRef.update({
      id: id,
      record: artefact.record,
      meta: {
        ...artefact.meta,
        id: meta.id,
        createdDate: meta.createdDate,
        modifiedDate: Date.now()
      }
    });

    // Fetch the updated document and return it
    const updatedDocSnapshot = await docRef.get();
    return updatedDocSnapshot.data() as Record;
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

  async recordPreParser(artefact: Record): Promise<Record> {
    return {
      id: artefact.id,
      record: artefact.record,
      meta: {
        ...artefact.meta,
        createdDate: Date.now(),
        modifiedDate: Date.now()
      }
    };
  }
}
