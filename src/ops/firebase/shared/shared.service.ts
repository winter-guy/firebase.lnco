import { Injectable } from '@nestjs/common';
import { InjectFirebaseAdmin, FirebaseAdmin } from 'nestjs-firebase';
import { Record } from 'src/dto/record';

@Injectable()
export class SharedService {
  constructor(
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
  ) {}

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

  async recordPreParser(artefact: Record): Promise<Record> {
    return {
      id: artefact.id,
      record: artefact.record,
      meta: {
        ...artefact.meta,
        createdDate: Date.now(),
        modifiedDate: Date.now(),
      },
    };
  }
}
