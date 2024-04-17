import { Injectable } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

import {
  Record,
  SecRecord,
  Journal,
  articles as Articles,
} from 'src/dto/record';
import { SharedService } from '../shared/shared.service';

import { SHA256, enc } from 'crypto-js';

const CONTRIBUTORS = 'contributors';
const ARTIFACTS = 'artifacts';

@Injectable()
export class FirestoreService {
  constructor(
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
    private readonly shared: SharedService,
  ) {}

  async getArtifacts(): Promise<Journal[]> {
    const docRefs = await this.firebase.firestore.collection(ARTIFACTS).get();

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
        forepart: meta.poster,
        backdrop: meta.imgs[1],
        createdDate: meta.createdDate,
        modifiedDate: meta.modifiedDate,

        head: meta.head,
        meta: meta.meta,
        details: meta.details,

        tags: meta.tags,
        cl: 0,
      };
    });

    return await Promise.all(batchedReads);
  }

  async getJournal(sub: string): Promise<Journal[]> {
    const contributorsRef = await this.firebase.firestore
      .collection(CONTRIBUTORS)
      .doc(sub)
      .get();

    if (!contributorsRef.exists) {
      console.log(`Contributor with ID ${sub} does not exist`);
      return;
    }

    const journals: Journal[] = [];
    if (contributorsRef.exists) {
      const artifactIds = (contributorsRef.data() as Articles).artifacts;

      const artifacts = await Promise.all(
        artifactIds.map(async (id) => {
          const docRef = await this.firebase.firestore
            .collection(ARTIFACTS)
            .doc(id)
            .get();
          if (docRef.exists) {
            const { meta } = docRef.data() as Record;
            return {
              id: docRef.id,
              author: meta.author,

              // tags: meta.tags,
              forepart: meta.poster,
              backdrop: meta.imgs[1],
              createdDate: meta.createdDate,
              modifiedDate: meta.modifiedDate,

              head: meta.head,
              meta: meta.meta,
              details: meta.details,

              tags: meta.tags,
              cl: 0,
            };
          } else {
            console.log(
              `Document with ID ${id} does not exist in the ARTIFACTS collection`,
            );
            return null;
          }
        }),
      );

      // Filter out null values (documents that were not found)
      const validArtifactsData = artifacts.filter((data) => data !== null);

      journals.push(...validArtifactsData);
    }

    return journals;

    /**
     * Fetch documents in parallel using batched reads
     * @param docRef is QueryDocumentSnapshot of <FirebaseFirestore.DocumentData>
     *
     * @returns Await all batched reads to complete
     */

    // return await Promise.all(batchedReads);
  }

  /**
   * Retrieves an artefact from the Firestore database by its ID and determines its accessibility for the specified user.
   * @param id The ID of the artefact to retrieve.
   * @param _sub The subject or identifier of the user.
   * @returns A Promise resolving to an object containing the artefact data and its accessibility status.
   * @throws Error if the artefact is not found or if there's an error accessing the database.
   */
  async getArtefactById(id: string, _sub?: string): Promise<SecRecord> {
    const docRef = this.firebase.firestore.collection(ARTIFACTS);

    // Retrieve artefact snapshot from Firestore
    const snapshot = await docRef.doc(id).get();

    // Check if the artefact belongs to the specified user
    let doesBelongToUser = false;

    // Check if _sub is provided and call doesArtefactBelongToUser if available
    if (_sub) {
      doesBelongToUser = await this.shared.doesArtefactBelongToUser(id, _sub);
    }

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
   * @param record The artefact data to be added.
   * @param sub The subject or contributor of the artefact.
   * @returns The artefact with the generated ID.
   */
  async createArtefact(record: Record, sub: string): Promise<Record> {
    try {
      // Adding artefact to Firestore collection
      const customDocId = `${record.meta.head
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()}-${SHA256(enc.Utf8.parse(record.meta.head + Number(new Date()) + sub))}`;

      record = { ...record, id: customDocId };
      const rec = await this.firebase.firestore
        .collection(ARTIFACTS)
        .doc(customDocId);

      const parsedRecordPromise = await this.shared.recordPreParser(record);
      await rec.set(parsedRecordPromise);

      // Update contributors with document reference
      const isUpdatedRef = await this.updateContributorsWithDocRef(
        customDocId,
        sub,
      );

      isUpdatedRef;

      // Returns the artefact with the generated ID
      return { ...record, id: customDocId };
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
  async updateArtefact(
    _id: string,
    artefact: Partial<Record>,
    _sub: string,
  ): Promise<Record> {
    // Check if the document exists before proceeding
    const docRef = this.firebase.firestore.collection(ARTIFACTS).doc(_id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      throw new Error('Document does not exist');
    }

    // Check if the artefact belongs to the user
    if (!(await this.shared.doesArtefactBelongToUser(_id, _sub))) {
      throw new Error('Failed to update document');
    }

    // Update the document
    const { id, meta } = docSnapshot.data() as Record;
    await docRef.update({
      id: id,
      record: artefact.record,
      meta: {
        ...artefact.meta,
        id: id,
        createdDate: meta.createdDate,
        modifiedDate: Date.now(),
      },
      inShort: artefact.inShort,
    });

    // Fetch the updated document and return it
    const updatedDocSnapshot = await docRef.get();
    return updatedDocSnapshot.data() as Record;
  }

  async deleteItem(id: string, _sub: string): Promise<void> {
    if (!(await this.shared.doesArtefactBelongToUser(id, _sub))) {
      throw new Error('Failed to delete document');
    }

    const docRef = this.firebase.firestore.collection(ARTIFACTS).doc(id);

    try {
      await docRef.delete();
      await this.shared.removeDocRefOnDel(id, _sub);

      console.log(`Document with ID ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting document: ${error}`);
      throw new Error('Failed to delete document');
    }
  }

  async updateContributorsWithDocRef(
    _docRef: string,
    _sub: string,
  ): Promise<void> {
    const contributorRef = this.firebase.firestore
      .collection('contributors')
      .doc(_sub);

    contributorRef
      .get()
      .then((contributorSnapshot) => {
        if (contributorSnapshot.exists) {
          // Document with ID _sub exists in the 'contributors' collection
          contributorRef.update({
            artifacts: [...contributorSnapshot.data().artifacts, _docRef],
          });

          // check process to verify the id updated in contribution collection of specified sub claim.
        } else {
          // Document with ID _sub does not exist
          console.log('Document does not exist');
          contributorRef.set({ artifacts: [_docRef] });
        }
      })
      .catch((error) => {
        console.error('Error checking document existence:', error);
      });
  }
}
