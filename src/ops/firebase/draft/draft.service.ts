import { Injectable } from '@nestjs/common';
import { InjectFirebaseAdmin, FirebaseAdmin } from 'nestjs-firebase';
import { SecRecord } from 'src/dto/record';
import { SharedService } from '../shared/shared.service';

@Injectable()
export class DraftService {
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
}
