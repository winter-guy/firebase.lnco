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

  async createArtefact(artefact: Artefact): Promise<Artefact> {
    try {
      // Add a new document with a generated ID
      const docRef = await this.firebase.firestore
        .collection('artefact')
        .add(artefact);

      // Log the ID of the newly created document
      console.log(`Document added with ID: ${docRef.id}`);

      // Return the artefact with the generated ID
      return { ...artefact, id: docRef.id };
    } catch (error) {
      console.error(`Error adding document: ${error}`);
      throw new Error('Failed to create artefact');
    }
    return artefact;
  }

  async updateArtefact(
    id: string,
    artefact: Partial<Artefact>,
  ): Promise<Artefact> {
    const docRef = this.firebase.firestore.collection('artifacts').doc(id);
    await docRef.update(artefact);

    const updates = await docRef.get();
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
}
