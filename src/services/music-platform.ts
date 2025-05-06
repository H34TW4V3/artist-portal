
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
    serverTimestamp,
    Timestamp,
    orderBy,
    limit, // Import limit
    addDoc, // Use addDoc for creating new documents with auto-generated IDs
    getDoc, // Import getDoc to fetch a single document
  } from "firebase/firestore";
  import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
  } from "firebase/storage";
  import { getAuth } from "firebase/auth";
  import { app, db, storage } from './firebase-config';
  import { getUserProfileByUid } from './user'; // Import function to get profile by UID

  // --- Interfaces ---

  export interface TrackInfo {
    name: string;
    // Add other track-specific fields if needed later (e.g., duration, explicit)
  }

  export interface StreamingStats {
    streams: number;
    revenue: number;
    listeners: number;
  }

  export interface ReleaseMetadataBase {
    title: string;
    artist: string;
    releaseDate: string | Date | Timestamp; // Allow multiple types initially, standardize before saving
  }

  export interface ReleaseMetadata extends ReleaseMetadataBase {
    artworkUrl: string | null; // Allow null
    zipUrl?: string | null;
    userId: string;
    createdAt?: Timestamp;
    status?: 'processing' | 'completed' | 'failed' | 'takedown_requested' | 'existing';
    tracks?: TrackInfo[];
    spotifyLink?: string | null;
    takedownRequestedAt?: Timestamp | null; // Timestamp when takedown was requested
    previousStatusBeforeTakedown?: string | null; // Status before takedown was requested
  }

  export interface ReleaseUploadMetadata {
    artistName: string; // Added artistName
    releaseName: string;
    releaseDate: string | Date;
  }

  export type ReleaseWithId = ReleaseMetadata & { id: string };

  export type ExistingReleaseData = Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status' | 'artworkUrl' | 'artist' | 'releaseDate' | 'takedownRequestedAt' | 'previousStatusBeforeTakedown'> & { artworkUrl?: string | null, artist?: string | null, releaseDate: Date };


  // --- Helper Functions ---

  const getCurrentUserId = (): string | null => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    return user?.uid || null;
  };

  const formatDateToString = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
             let parsed: Date;
             if (dateValue.includes('T')) {
                 parsed = new Date(dateValue);
             } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                 const [year, month, day] = dateValue.split('-').map(Number);
                 parsed = new Date(year, month - 1, day);
             } else {
                 parsed = new Date(dateValue);
             }
             if (isNaN(parsed.getTime())) throw new Error("Invalid date string");
             date = parsed;
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", dateValue, e);
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
  };


  // --- API Functions ---

  export async function getStreamingStats(_artistId: string): Promise<StreamingStats> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      streams: 1_234_567,
      revenue: 6172.84,
      listeners: 45_678,
    };
  }

  export async function getReleases(): Promise<ReleaseWithId[]> {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const releasesRef = collection(db, "users", userId, "releases");
    const q = query(releasesRef, orderBy("releaseDate", "desc"), orderBy("createdAt", "desc"));

    try {
        const querySnapshot = await getDocs(q);
        const releases: ReleaseWithId[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as ReleaseMetadata;
          releases.push({ id: docSnap.id, ...data });
        });
        console.log(`Fetched ${releases.length} releases for user ${userId}`);
        return releases;
    } catch (error) {
        console.error("Error fetching releases:", error);
        throw new Error("Failed to fetch releases.");
    }
  }

  export async function getLatestReleaseArtwork(): Promise<string | null> {
      const userId = getCurrentUserId();
      if (!userId) return null;

      const releasesRef = collection(db, "users", userId, "releases");
      const q = query(releasesRef, orderBy("createdAt", "desc"), limit(1));

      try {
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
              console.log(`No releases found for user ${userId}`);
              return null;
          }

          const latestReleaseDoc = querySnapshot.docs[0];
          const data = latestReleaseDoc.data() as ReleaseMetadata;

          if (data.artworkUrl && typeof data.artworkUrl === 'string' && data.artworkUrl.trim() !== '') {
              console.log(`Found latest artwork URL for user ${userId}: ${data.artworkUrl}`);
              return data.artworkUrl;
          } else {
              console.log(`Latest release for user ${userId} has no valid artwork URL.`);
              return null;
          }
      } catch (error) {
          console.error("Error fetching latest release artwork:", error);
          return null;
      }
  }


  export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<string> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in.");

    console.log("Starting Firebase Storage upload...");
    console.log(`File to upload: ${zipFile.name}, Size: ${zipFile.size}`);
    console.log("Metadata:", uploadMetadata);

    const sanitizedReleaseName = uploadMetadata.releaseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const zipFileName = `release_${sanitizedReleaseName}_${Date.now()}.zip`;
    const storagePath = `releases/${userId}/${zipFileName}`;
    const storageRef = ref(storage, storagePath);


    let downloadURL: string | null = null;
    try {
        console.log("Uploading to path:", storageRef.fullPath);
        const snapshot = await uploadBytes(storageRef, zipFile);
        downloadURL = await getDownloadURL(snapshot.ref);
        console.log("File uploaded successfully to Firebase Storage. URL:", downloadURL);
    } catch (uploadError) {
        console.error("Firebase Storage upload failed:", uploadError);
        throw new Error("Failed to upload release file.");
    }

    // Use artistName from uploadMetadata directly
    const artistName = uploadMetadata.artistName;

    const newReleaseData: Omit<ReleaseMetadata, 'id' | 'createdAt'> = {
      title: uploadMetadata.releaseName,
      artist: artistName, // Use provided artist name
      releaseDate: formatDateToString(uploadMetadata.releaseDate),
      artworkUrl: null,
      zipUrl: downloadURL,
      userId: userId,
      status: 'processing',
      tracks: [],
      spotifyLink: null,
      takedownRequestedAt: null,
      previousStatusBeforeTakedown: null,
    };

    const releasesRef = collection(db, "users", userId, "releases");
    try {
        console.log("Attempting to add release document to Firestore:", newReleaseData);
        const docRef = await addDoc(releasesRef, {
            ...newReleaseData,
            createdAt: serverTimestamp(),
        });
        console.log("New release metadata document created in Firestore with ID:", docRef.id);
        return docRef.id;
    } catch (firestoreError) {
        console.error("Firestore document creation failed:", firestoreError);
        throw new Error("Failed to save release metadata after upload.");
    }
  }


  export async function addExistingRelease(data: ExistingReleaseData): Promise<string> {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Authentication required. Please log in.");

      let artistName = data.artist;
      if (!artistName) {
          const userProfile = await getUserProfileByUid(userId);
          const auth = getAuth(app);
          artistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";
      }

      const releaseData: Omit<ReleaseMetadata, 'id' | 'createdAt' | 'zipUrl'> = {
          title: data.title,
          artist: artistName,
          releaseDate: formatDateToString(data.releaseDate),
          artworkUrl: data.artworkUrl || null,
          userId: userId,
          status: 'existing',
          tracks: data.tracks || [],
          spotifyLink: data.spotifyLink || null,
          takedownRequestedAt: null,
          previousStatusBeforeTakedown: null,
      };

      console.log("Attempting to add existing release document to Firestore:", releaseData);
      const releasesRef = collection(db, "users", userId, "releases");
      try {
          const docRef = await addDoc(releasesRef, {
              ...releaseData,
              createdAt: serverTimestamp(),
          });
          console.log("Existing release document created in Firestore with ID:", docRef.id);
          return docRef.id;
      } catch (firestoreError: any) {
          console.error("Firestore document creation failed for existing release:", firestoreError);
          console.error("Firestore error code:", firestoreError.code);
          console.error("Firestore error message:", firestoreError.message);
          throw new Error("Failed to save existing release data.");
      }
  }


  export async function updateRelease(
    releaseId: string,
    data: Partial<Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status'>>,
    newArtworkFile?: File
  ): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in.");

    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    let finalArtworkUrl: string | null = null;

    try {
        const currentDocSnap = await getDoc(releaseDocRef);
        if (!currentDocSnap.exists()) {
            throw new Error("Release document not found.");
        }
        const currentData = currentDocSnap.data() as ReleaseMetadata;

        if (newArtworkFile) {
            console.log("Uploading new artwork for release:", releaseId);
            const artworkFileName = `${newArtworkFile.name}`;
            const artworkStoragePath = `releaseArtwork/${userId}/${artworkFileName}`; // Path for storage
            const artworkStorageRef = ref(storage, artworkStoragePath);
            const snapshot = await uploadBytes(artworkStorageRef, newArtworkFile);
            finalArtworkUrl = await getDownloadURL(snapshot.ref);
            console.log("New artwork uploaded, URL:", finalArtworkUrl);

            if (currentData.artworkUrl && !currentData.artworkUrl.includes('placeholder')) {
                try {
                    const oldArtworkRef = ref(storage, currentData.artworkUrl);
                    await deleteObject(oldArtworkRef);
                    console.log("Old artwork deleted:", currentData.artworkUrl);
                } catch (deleteError: any) {
                    if (deleteError.code !== 'storage/object-not-found') {
                        console.warn("Failed to delete old artwork:", deleteError);
                    }
                }
            }
        } else if (data.artworkUrl === null) {
             finalArtworkUrl = null;
              if (currentData.artworkUrl && !currentData.artworkUrl.includes('placeholder')) {
                 try {
                     const oldArtworkRef = ref(storage, currentData.artworkUrl);
                     await deleteObject(oldArtworkRef);
                     console.log("Old artwork deleted:", currentData.artworkUrl);
                 } catch (deleteError: any) {
                     if (deleteError.code !== 'storage/object-not-found') {
                         console.warn("Failed to delete old artwork:", deleteError);
                     }
                 }
             }
        } else {
            finalArtworkUrl = data.artworkUrl !== undefined ? data.artworkUrl : currentData.artworkUrl;
        }

      const dataToUpdate: Partial<ReleaseMetadata> = {
        ...data,
        artworkUrl: finalArtworkUrl,
      };

       if (dataToUpdate.releaseDate) {
           dataToUpdate.releaseDate = formatDateToString(dataToUpdate.releaseDate);
       }

       delete (dataToUpdate as any).userId;
       delete (dataToUpdate as any).createdAt;
       delete (dataToUpdate as any).zipUrl;

      console.log("Attempting to update release document in Firestore:", releaseId, dataToUpdate);
      await updateDoc(releaseDocRef, dataToUpdate);
      console.log("Release updated successfully in Firestore:", releaseId);

    } catch (error: any) {
      console.error("Error updating release:", error);
      console.error("Firestore error code (update):", error.code);
      console.error("Firestore error message (update):", error.message);
      throw new Error("Failed to update release.");
    }
  }

  async function requestPlatformTakedown(releaseId: string): Promise<void> {
      console.log(`Simulating platform takedown request for release ${releaseId}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`Platform takedown simulation complete for ${releaseId}.`);
  }

  export async function initiateTakedown(releaseId: string): Promise<void> {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Authentication required.");

      const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

      try {
          const docSnap = await getDoc(releaseDocRef);
          if (!docSnap.exists()) {
              throw new Error("Release not found.");
          }
          const currentStatus = docSnap.data().status;

          await updateDoc(releaseDocRef, {
              status: 'takedown_requested',
              takedownRequestedAt: serverTimestamp(),
              previousStatusBeforeTakedown: currentStatus || 'existing', // Store previous status
          });
          console.log(`Release ${releaseId} status updated to takedown_requested.`);

          await requestPlatformTakedown(releaseId);

      } catch (error: any) {
          console.error(`Error initiating takedown for release ${releaseId}:`, error);
          console.error("Firestore error code (takedown):", error.code);
          console.error("Firestore error message (takedown):", error.message);
          throw new Error("Failed to initiate takedown request.");
      }
  }

  export async function cancelTakedownRequest(releaseId: string): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required.");

    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

    try {
        const docSnap = await getDoc(releaseDocRef);
        if (!docSnap.exists()) {
            throw new Error("Release not found.");
        }
        const release = docSnap.data() as ReleaseMetadata;

        if (release.status !== 'takedown_requested' || !release.takedownRequestedAt) {
            throw new Error("Takedown request not found or already processed.");
        }

        // Check if within 24 hours
        const takedownTime = release.takedownRequestedAt.toDate();
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (takedownTime < twentyFourHoursAgo) {
            throw new Error("Takedown request cannot be cancelled after 24 hours.");
        }

        // Restore previous status
        await updateDoc(releaseDocRef, {
            status: release.previousStatusBeforeTakedown || 'existing',
            takedownRequestedAt: null,
            previousStatusBeforeTakedown: null,
        });
        console.log(`Takedown request for release ${releaseId} cancelled. Status restored to ${release.previousStatusBeforeTakedown}.`);

        // Potentially notify backend to halt platform takedown (simulation)
        console.log(`Simulating notification to backend to cancel platform takedown for ${releaseId}.`);
        await new Promise(resolve => setTimeout(resolve, 500));


    } catch (error: any) {
        console.error(`Error cancelling takedown for release ${releaseId}:`, error);
        throw new Error(error.message || "Failed to cancel takedown request.");
    }
}


export async function removeRelease(releaseId: string): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) {
        console.warn("removeRelease called without a user ID (likely during automated cleanup with no active session). Skipping storage deletion for this call.");
        // Only delete the Firestore document if no user ID is present
        const directReleaseDocRef = doc(db, "users", "unknown", "releases", releaseId); // Placeholder path, will fail if rules require auth
        try {
            // Try to delete the Firestore document if path is known and rules allow unauthenticated deletion (not typical)
            // More robustly, this function should not be called by automated processes without context if userId is needed for storage.
            // For now, focus on deleting Firestore doc. If storage paths are user-specific, this will need to be handled by a backend function.
            // await deleteDoc(directReleaseDocRef); // This line would be problematic without userId for path construction
            // For now, let's assume this is only called with a valid user for storage operations.
            // If called by an automated process without user context for storage file deletion, that's a separate architectural consideration.
            console.log(`removeRelease called without userId for releaseId ${releaseId}. Firestore document cannot be deleted without user context for path, and associated storage files won't be deleted.`);
            // Fallback: just delete the firestore doc if we can construct its path (e.g. if userId was passed differently)
             // This will only work if the `releaseId` is globally unique and not nested under a specific user in a different way.
             // For releases in users/{userId}/releases, we absolutely need the userId.
            // If this function is called from an automated process, the userId must be passed or determined by that process.
            throw new Error("User ID is required to construct the correct Firestore path for release deletion.");
        } catch (error) {
            console.error("Error removing release document from Firestore without user ID context:", error);
            throw new Error("Failed to remove release document without user context.");
        }
        return; // Exit if no userId
    }


    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

    try {
      const docSnap = await getDoc(releaseDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as ReleaseMetadata;

        if (data.artworkUrl && !data.artworkUrl.includes('placeholder') && data.artworkUrl.startsWith('https://firebasestorage.googleapis.com/')) {
             try { await deleteObject(ref(storage, data.artworkUrl)); console.log("Deleted artwork file from Cloud Storage:", data.artworkUrl); }
             catch (e: any) { if (e.code !== 'storage/object-not-found') console.error("Error deleting artwork:", e);}
        }

        if (data.zipUrl && data.zipUrl.startsWith('https://firebasestorage.googleapis.com/')) {
             try { await deleteObject(ref(storage, data.zipUrl)); console.log("Deleted ZIP file from Cloud Storage:", data.zipUrl); }
             catch (e: any) { if (e.code !== 'storage/object-not-found') console.error("Error deleting ZIP file:", e);}
        }

      } else {
          console.warn(`Release document ${releaseId} not found for deletion in user ${userId}'s collection.`);
      }

      await deleteDoc(releaseDocRef);
      console.log("Release document deleted from Firestore:", releaseId);

    } catch (error: any) {
        console.error("Error removing release:", error);
        console.error("Firestore error code (remove):", error.code);
        console.error("Firestore error message (remove):", error.message);
        throw new Error("Failed to remove release and associated files.");
    }
  }

export async function addTestRelease(): Promise<string | null> {
    const userId = getCurrentUserId();
    if (!userId) {
        console.error("Cannot add test release: User not authenticated.");
        return null;
    }

    const userProfile = await getUserProfileByUid(userId);
    const auth = getAuth(app);
    const artistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Test Artist";

    const testReleaseData: Omit<ReleaseMetadata, 'id' | 'userId' | 'createdAt' | 'zipUrl'> = {
        title: "My Awesome Test EP",
        artist: artistName,
        releaseDate: formatDateToString(new Date(new Date().setDate(new Date().getDate() + 7))),
        artworkUrl: "https://picsum.photos/seed/testrelease1/300/300",
        status: 'existing',
        tracks: [
            { name: "Test Track 1 (Sunrise Mix)" },
            { name: "Another Test Vibe" },
            { name: "The Test Outro" },
        ],
        spotifyLink: "https://open.spotify.com/album/0sNOF9WDwhWunNAHPD3qYc", // Example Spotify link
        takedownRequestedAt: null,
        previousStatusBeforeTakedown: null,
    };

    const releasesRef = collection(db, "users", userId, "releases");
    try {
        const docRef = await addDoc(releasesRef, {
            ...testReleaseData,
            userId: userId,
            createdAt: serverTimestamp(),
        });
        console.log("Test release added successfully with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding test release:", error);
        throw new Error("Failed to add test release.");
    }
}
