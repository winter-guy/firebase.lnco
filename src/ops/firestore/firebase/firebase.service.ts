import { Injectable } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import { Artefact } from 'src/dto/artefact';

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

  async getArtefactById(id: string): Promise<Artefact> {
    const docRef = this.firebase.firestore.collection('artifacts');

    const snapshot = await docRef.doc(id).get();

    if (!snapshot.exists) {
      throw new Error('Artefact Not Found');
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Artefact;
  }

  async createArtefact(artefact: Artefact, sub: string): Promise<Artefact> {
    try {
      // Add a new document with a generated ID
      const docRef = await this.firebase.firestore
        .collection('artifacts')
        .add(artefact);

      await this.updateArtefact(docRef.id, { ...artefact, id: docRef.id });
      console.log({ ...artefact, id: docRef.id });
      // Log the ID of the newly created document
      console.log(`Document added with ID: ${docRef.id}`);
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

  async updateContributorsWithDocRef(
    _docRef: string,
    _sub: string,
  ): Promise<void> {
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

    console.log((await _userRef.get()).data());
  }

  async updateArtefact(
    id: string,
    artefact: Partial<Artefact>,
  ): Promise<Artefact> {
    const docRef = this.firebase.firestore.collection('artifacts').doc(id);
    await docRef.update(artefact);

    const updates = await docRef.get();
    console.log(updates);
    return {
      id: updates.id,
      ...updates.data(),
    } as Artefact;
  }

  async deleteItem(id: string): Promise<void> {
    const docRef = this.firebase.firestore.collection('artifacts').doc(id);

    try {
      await docRef.delete();
      console.log(`Document with ID ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting document: ${error}`);
      throw new Error('Failed to delete document');
    }
  }

  async removeDocRefOnDel(): Promise<void> {
    return;
  }
}
