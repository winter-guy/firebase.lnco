import { Injectable } from '@nestjs/common';
import { InjectFirebaseAdmin, FirebaseAdmin } from 'nestjs-firebase';
import { Record, SecRecord } from 'src/dto/record';
import { SharedService } from '../shared/shared.service';

import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DraftService {
  private readonly DRAFT = 'draft';
  constructor(
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
    private readonly shared: SharedService,
  ) {}
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
    const doesBelongToUser = await this.shared.doesArtefactBelongToUser(
      id,
      _sub,
    );

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
  async createDraftOfInstance(record: Record, sub: string): Promise<Record> {
    try {
      // Update contributors with document reference
      const isUpdatedRef = await this.updateContributorsWithDocRef(sub, record);

      isUpdatedRef;

      // Returns the artefact with the generated ID
      return { ...record, id: isUpdatedRef };
    } catch (error) {
      // Log error and throw exception if failed
      console.error(`Error adding document: ${error}`);
      throw new Error('Failed to create artefact');
    }
  }

  async updateContributorsWithDocRef(
    sub: string,
    record: Record,
  ): Promise<string> {
    const contributorRef = this.firebase.firestore
      .collection('contributors')
      .doc(sub);

    const uuid = uuidv4();
    await contributorRef
      .collection(this.DRAFT)
      .doc(uuid)
      .set({ ...record, id: uuid });

    return uuid;
  }
}
