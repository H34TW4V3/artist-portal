
/**
 * Service layer for interacting with the music platform backend/database.
 * Uses Firebase Firestore for storing release metadata and Firebase Storage for assets.
 */

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp, // Import serverTimestamp
  Timestamp,      // Import Timestamp type if needed for comparison/display
  orderBy,       // Import orderBy
} from "firebase/firestore";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { app, db, storage } from './firebase-config'; // Import db and storage

// --- Interfaces ---

/**
 * Represents streaming statistics for an artist's release or overall stats.
 */
export interface StreamingStats {
  /** Total number of streams. */
  streams: number;
  /** Estimated revenue generated (e.g., in USD). */
  revenue: number;
  /** Number of unique listeners (e.g., monthly). */
  listeners: number;
}

/**
 * Represents the base metadata for a music release before processing.
 */
export interface ReleaseMetadataBase {
  /** The title of the release. */
  title: string;
  /** The main artist name. */
  artist: string;
  /** Release date in 'yyyy-MM-dd' format. */
  releaseDate: string; // Keep as string for Firestore compatibility and consistency
}

/**
 * Represents the metadata for a music release stored in Firestore.
 */
export interface ReleaseMetadata extends ReleaseMetadataBase {
   /** URL of the cover artwork image in Firebase Storage. */
   artworkUrl: string;
   /** URL of the release ZIP file in Firebase Storage. */
   zipUrl?: string; // URL of the uploaded ZIP
   /** ID of the user (artist) who owns this release. */
   userId: string;
   /** Timestamp when the release was created in Firestore. */
   createdAt?: Timestamp; // Firestore Timestamp, optional on creation
   /** Status of the release processing (optional). */
   status?: 'processing' | 'completed' | 'failed';
}

/**
 * Represents the metadata submitted with the ZIP upload form.
 */
export interface ReleaseUploadMetadata {
  /** The name provided for the release during upload. */
  releaseName: string;
   /** The desired release date in 'yyyy-MM-dd' format. */
  releaseDate: string;
}


// Type for a release including its unique Firestore document ID
export type ReleaseWithId = ReleaseMetadata & { id: string };

// --- Helper Functions ---

/**
 * Gets the current authenticated user's ID.
 * Throws an error if no user is logged in.
 */
const getCurrentUserId = (): string => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
        console.error("Music Platform Service Error: No authenticated user found.");
        throw new Error("Authentication required. Please log in.");
    }
    return user.uid;
};

// --- API Functions ---

/**
 * Simulates fetching streaming statistics (Remains Mocked).
 * @param _artistId - Placeholder for artist ID (unused in mock).
 * @returns A promise resolving to mock StreamingStats.
 */
export async function getStreamingStats(_artistId: string): Promise<StreamingStats> {
  console.log("Mock API: Fetching streaming stats...");
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return {
    streams: 1_234_567,
    revenue: 6172.84,
    listeners: 45_678,
  };
}

/**
 * Fetches the list of releases for the currently authenticated artist from Firestore.
 * @returns A promise resolving to an array of ReleaseWithId, ordered by creation date descending.
 */
export async function getReleases(): Promise<ReleaseWithId[]> {
    const userId = getCurrentUserId(); // Ensure user is logged in
    console.log(`Firestore: Fetching releases for user ${userId}...`);

    try {
        const releasesRef = collection(db, "releases");
        // Query for releases belonging to the current user, order by createdAt descending
        const q = query(releasesRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const releases: ReleaseWithId[] = [];
        querySnapshot.forEach((doc) => {
            // TODO: Add robust validation here (e.g., using Zod) if needed
            const data = doc.data() as ReleaseMetadata; // Assume data matches interface
            releases.push({ id: doc.id, ...data });
        });

        console.log(`Firestore: Found ${releases.length} releases for user ${userId}.`);
        return releases;
    } catch (error) {
        console.error("Firestore: Error fetching releases:", error);
        throw new Error("Failed to fetch releases from database.");
    }
}


/**
 * Uploads a new music release ZIP, stores it in Firebase Storage,
 * and creates a corresponding metadata document in Firestore.
 *
 * @param uploadMetadata - Metadata provided during the upload (name, date).
 * @param zipFile - The ZIP file containing the release assets.
 * @returns A promise resolving when the Firestore document is created.
 */
export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<void> {
    const userId = getCurrentUserId(); // Ensure user is logged in
    console.log(`Firestore/Storage: Uploading release ZIP for user ${userId}...`, { uploadMetadata, zipFileName: zipFile.name });

    // 1. Upload ZIP to Firebase Storage
    const zipFileName = `${userId}_${Date.now()}_${zipFile.name}`;
    const storageRef = ref(storage, `releaseZips/${userId}/${zipFileName}`);
    let zipUrl = '';

    try {
        console.log(`Storage: Uploading ${zipFileName}...`);
        const snapshot = await uploadBytes(storageRef, zipFile);
        zipUrl = await getDownloadURL(snapshot.ref);
        console.log(`Storage: Upload successful. ZIP URL: ${zipUrl}`);
    } catch (error) {
        console.error("Storage: Error uploading ZIP file:", error);
        throw new Error("Failed to upload release package.");
    }

    // 2. Create Firestore Document
    // Assume artist name is derived from user profile or needs separate input later.
    // Using a placeholder for now. Fetching from user profile is better.
    const auth = getAuth(app);
    const artistName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";

    const newReleaseData: Omit<ReleaseMetadata, 'createdAt'> = { // Exclude createdAt for initial data
        title: uploadMetadata.releaseName,
        artist: artistName,
        releaseDate: uploadMetadata.releaseDate, // String format 'YYYY-MM-DD'
        artworkUrl: '', // Initially empty, backend/user needs to update this
        zipUrl: zipUrl, // Store the URL of the uploaded ZIP
        userId: userId,
        status: 'processing', // Mark as processing initially
    };

    try {
        // Create a new document reference with an auto-generated ID
        const newDocRef = doc(collection(db, "releases"));
        // Add createdAt timestamp using serverTimestamp()
        await setDoc(newDocRef, {
            ...newReleaseData,
            createdAt: serverTimestamp(), // Add server timestamp
        });
        console.log("Firestore: Release metadata document created successfully. ID:", newDocRef.id);
    } catch (error) {
        console.error("Firestore: Error creating release document:", error);
        // Attempt to delete the uploaded ZIP if Firestore write fails
        try {
            await deleteObject(storageRef);
            console.log(`Storage: Rolled back - deleted ${zipFileName} due to Firestore error.`);
        } catch (deleteError) {
            console.error(`Storage: Failed to delete ${zipFileName} after Firestore error:`, deleteError);
        }
        throw new Error("Failed to save release metadata to database.");
    }
}


/**
 * Updates the metadata (title, artist, releaseDate) for an existing release in Firestore.
 * Does not update artworkUrl or zipUrl.
 * @param releaseId - The Firestore document ID of the release to update.
 * @param metadataToUpdate - An object containing the fields to update (title, artist, releaseDate).
 * @returns A promise resolving when the update is complete.
 */
export async function updateReleaseMetadata(releaseId: string, metadataToUpdate: Partial<Pick<ReleaseMetadata, 'title' | 'artist' | 'releaseDate'>>): Promise<void> {
    const userId = getCurrentUserId(); // Ensure user is logged in
    console.log(`Firestore: Updating metadata for release ${releaseId} by user ${userId}...`, metadataToUpdate);

    const releaseDocRef = doc(db, "releases", releaseId);

    // Optional: Verify the release belongs to the current user before updating
    // const docSnap = await getDoc(releaseDocRef);
    // if (!docSnap.exists() || docSnap.data()?.userId !== userId) {
    //    console.error(`Firestore: Release ${releaseId} not found or permission denied for user ${userId}.`);
    //    throw new Error("Release not found or you don't have permission to edit it.");
    // }

    try {
        await updateDoc(releaseDocRef, {
            ...metadataToUpdate, // Spread the fields to update
            // Optionally update a 'lastModified' timestamp here
        });
        console.log("Firestore: Metadata updated successfully for release:", releaseId);
    } catch (error) {
        console.error(`Firestore: Error updating metadata for release ${releaseId}:`, error);
        throw new Error("Failed to update release metadata.");
    }
}


/**
 * Removes an existing release document from Firestore and its associated ZIP file from Storage.
 * @param releaseId - The Firestore document ID of the release to remove.
 * @returns A promise resolving when the removal is complete.
 */
export async function removeRelease(releaseId: string): Promise<void> {
    const userId = getCurrentUserId(); // Ensure user is logged in
    console.log(`Firestore/Storage: Removing release ${releaseId} for user ${userId}...`);

    const releaseDocRef = doc(db, "releases", releaseId);

    try {
        // Optional: Fetch the document first to get the zipUrl for deletion
        // const docSnap = await getDoc(releaseDocRef);
        // if (!docSnap.exists() || docSnap.data()?.userId !== userId) {
        //     console.error(`Firestore: Release ${releaseId} not found or permission denied for user ${userId}.`);
        //     throw new Error("Release not found or you don't have permission to remove it.");
        // }
        // const releaseData = docSnap.data() as ReleaseMetadata;

        // 1. Delete Firestore document
        await deleteDoc(releaseDocRef);
        console.log(`Firestore: Release document ${releaseId} deleted successfully.`);

        // 2. Attempt to delete associated ZIP file from Storage (best effort)
        // This requires knowing the zipUrl or constructing the storage path.
        // If zipUrl was stored in the document, use it. Otherwise, this part might fail.
        // Example (assuming zipUrl is available):
        // if (releaseData?.zipUrl) {
        //     try {
        //         const zipStorageRef = ref(storage, releaseData.zipUrl); // Get ref from URL
        //         await deleteObject(zipStorageRef);
        //         console.log(`Storage: Deleted associated ZIP file for release ${releaseId}.`);
        //     } catch (storageError: any) {
        //          // Log error but don't fail the whole operation if file not found (it might have been deleted already)
        //         if (storageError.code === 'storage/object-not-found') {
        //              console.warn(`Storage: ZIP file for release ${releaseId} not found (maybe already deleted).`);
        //         } else {
        //              console.error(`Storage: Error deleting ZIP file for release ${releaseId}:`, storageError);
        //              // Optionally re-throw or handle differently if deletion is critical
        //         }
        //     }
        // } else {
        //     console.warn(`Storage: No zipUrl found for release ${releaseId}, cannot delete ZIP file.`);
        // }

    } catch (error) {
        console.error(`Firestore: Error deleting release ${releaseId}:`, error);
        throw new Error("Failed to remove release.");
    }
}

// --- Deprecated Functions ---

/**
 * @deprecated Use uploadReleaseZip instead.
 */
export async function uploadRelease_DEPRECATED(): Promise<void> {
    console.warn("Mock API: uploadRelease is deprecated. Use uploadReleaseZip.");
    throw new Error("Function uploadRelease_DEPRECATED is deprecated.");
}
