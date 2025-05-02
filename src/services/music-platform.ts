
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
    releaseDate: string; // Store as YYYY-MM-DD string
  }

  export interface ReleaseMetadata extends ReleaseMetadataBase {
    artworkUrl: string | null; // Allow null
    zipUrl?: string | null; // Optional zipUrl, allow null
    userId: string;
    createdAt?: Timestamp;
    status?: 'processing' | 'completed' | 'failed';
    tracks?: TrackInfo[]; // Array of track objects
    spotifyLink?: string | null; // Optional spotify link
  }

  export interface ReleaseUploadMetadata {
    releaseName: string;
    releaseDate: string; // Expect YYYY-MM-DD string
  }

  export type ReleaseWithId = ReleaseMetadata & { id: string };

  // Type for adding an existing release - Artist is now optional here
  // Make artworkUrl optional as well for consistency with how it's used
  export type ExistingReleaseData = Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status' | 'artworkUrl' | 'artist'> & { artworkUrl?: string | null, artist?: string | null };


  // --- Helper Functions ---

  const getCurrentUserId = (): string | null => { // Allow null return
    const auth = getAuth(app);
    const user = auth.currentUser;
    return user?.uid || null;
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
    if (!userId) return []; // Return empty if no user

    const releasesRef = collection(db, "users", userId, "releases");
    const q = query(releasesRef, orderBy("createdAt", "desc")); // Order by creation time descending

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
      if (!userId) return null; // No user, no artwork

      const releasesRef = collection(db, "users", userId, "releases");
      const q = query(releasesRef, orderBy("createdAt", "desc"), limit(1));

      try {
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
              console.log(`No releases found for user ${userId}`);
              return null; // No releases found
          }

          const latestReleaseDoc = querySnapshot.docs[0];
          const data = latestReleaseDoc.data() as ReleaseMetadata;

          // Return artworkUrl only if it's a non-empty string
          if (data.artworkUrl && typeof data.artworkUrl === 'string' && data.artworkUrl.trim() !== '') {
              console.log(`Found latest artwork URL for user ${userId}: ${data.artworkUrl}`);
              return data.artworkUrl;
          } else {
              console.log(`Latest release for user ${userId} has no valid artwork URL.`);
              return null; // No valid artwork URL
          }
      } catch (error) {
          console.error("Error fetching latest release artwork:", error);
          return null;
      }
  }


  export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<string> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in.");

    const zipFileName = `${userId}_${Date.now()}_${zipFile.name}`;
    const storageRef = ref(storage, `releaseZips/${userId}/${zipFileName}`);
    console.log("Uploading ZIP to:", storageRef.fullPath);
    const snapshot = await uploadBytes(storageRef, zipFile);
    const zipUrl = await getDownloadURL(snapshot.ref);
    console.log("ZIP Upload successful, URL:", zipUrl);

    // Fetch artist name from Firestore profile using getUserProfileByUid
    const userProfile = await getUserProfileByUid(userId); // Correct function call
    const auth = getAuth(app); // Get auth instance for fallback
    const artistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";

    // Prepare data for Firestore document
    const newReleaseData: Omit<ReleaseMetadata, 'id' | 'createdAt'> = {
      title: uploadMetadata.releaseName,
      artist: artistName, // Use fetched/fallback artist name
      releaseDate: uploadMetadata.releaseDate, // Use YYYY-MM-DD string
      artworkUrl: null, // Initially no artwork URL; might be set by backend function
      zipUrl: zipUrl,
      userId: userId,
      status: 'processing', // Initial status
      tracks: [], // Initialize empty tracks array
      spotifyLink: null, // Initialize empty Spotify link
    };

    const releasesRef = collection(db, "users", userId, "releases");
    const docRef = await addDoc(releasesRef, {
      ...newReleaseData,
      createdAt: serverTimestamp(), // Add server timestamp
    });
    console.log("New release document created in Firestore with ID:", docRef.id);
    return docRef.id; // Return the ID of the newly created document
  }

  /**
   * Adds data for an existing release (not uploaded via ZIP).
   * Determines artist name from auth if not provided.
   * Does not include zipUrl or status. Artwork URL is optional.
   * @param data - The release data including title, date, tracks, spotifyLink. artist is optional.
   * @returns The ID of the newly created Firestore document.
   */
  export async function addExistingRelease(data: ExistingReleaseData): Promise<string> {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Authentication required. Please log in.");

      // Fetch artist name from Firestore profile using getUserProfileByUid
      let artistName = data.artist; // Use provided artist if available
      if (!artistName) {
          const userProfile = await getUserProfileByUid(userId); // Correct function call
          const auth = getAuth(app); // Get auth instance for fallback
          artistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";
      }

      const releaseData: Omit<ReleaseMetadata, 'id' | 'createdAt' | 'zipUrl' | 'status'> = {
          title: data.title,
          artist: artistName, // Use determined artist name
          releaseDate: data.releaseDate, // Expect YYYY-MM-DD
          artworkUrl: data.artworkUrl || null, // Use provided URL or null
          userId: userId,
          tracks: data.tracks || [], // Use provided tracks or empty array
          spotifyLink: data.spotifyLink || null, // Use provided link or null
      };

      const releasesRef = collection(db, "users", userId, "releases");
      const docRef = await addDoc(releasesRef, {
          ...releaseData,
          createdAt: serverTimestamp(),
      });
      console.log("Existing release document created in Firestore with ID:", docRef.id);
      return docRef.id;
  }


  /**
   * Updates an existing release document, potentially including artwork upload.
   * @param releaseId - The ID of the release document to update.
   * @param data - An object containing the fields to update (e.g., title, date, tracks, spotifyLink).
   * @param newArtworkFile - Optional new artwork file to upload.
   * @returns A promise resolving when the update is complete.
   */
  export async function updateRelease(
    releaseId: string,
    data: Partial<Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status'>>, // Allow updating most fields
    newArtworkFile?: File
  ): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in.");

    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    let newArtworkUrl: string | null = data.artworkUrl !== undefined ? data.artworkUrl : null; // Preserve existing URL unless cleared or replaced

    try {
      // 1. Handle Artwork Upload (if new file provided)
      if (newArtworkFile) {
        console.log("Uploading new artwork for release:", releaseId);
        const artworkFileName = `${userId}_${Date.now()}_${newArtworkFile.name}`;
        const artworkStorageRef = ref(storage, `releaseArtwork/${userId}/${artworkFileName}`);
        const snapshot = await uploadBytes(artworkStorageRef, newArtworkFile);
        newArtworkUrl = await getDownloadURL(snapshot.ref);
        console.log("New artwork uploaded, URL:", newArtworkUrl);
      }

      // 2. Prepare data for Firestore update
      const dataToUpdate: Partial<ReleaseMetadata> = {
        ...data, // Include updated title, date, tracks, spotifyLink etc.
        ...(newArtworkUrl !== null && { artworkUrl: newArtworkUrl }), // Only include artworkUrl if it's not explicitly null from upload/update
        // If data explicitly sets artworkUrl to null, respect that
        ...(data.artworkUrl === null && { artworkUrl: null }),
      };

       // Ensure releaseDate is a string if provided
       if (dataToUpdate.releaseDate && dataToUpdate.releaseDate instanceof Date) {
           dataToUpdate.releaseDate = dataToUpdate.releaseDate.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD
       }

       // Remove fields that shouldn't be updated directly here
       delete dataToUpdate.userId;
       delete dataToUpdate.createdAt;
       delete dataToUpdate.zipUrl;
       delete dataToUpdate.status;

      // 3. Update Firestore Document
      await updateDoc(releaseDocRef, dataToUpdate);
      console.log("Release updated successfully in Firestore:", releaseId);

    } catch (error) {
      console.error("Error updating release:", error);
      throw new Error("Failed to update release.");
    }
  }


  // export async function updateReleaseMetadata(releaseId: string, metadataToUpdate: Partial<Pick<ReleaseMetadata, 'title' | 'artist' | 'releaseDate'>>): Promise<void> {
  //   const userId = getCurrentUserId();
  //    if (!userId) throw new Error("Authentication required. Please log in."); // Guard clause
  //   const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
  //   await updateDoc(releaseDocRef, metadataToUpdate);
  // }

  export async function removeRelease(releaseId: string): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in."); // Guard clause

    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

    // TODO: Get the document data to find file URLs before deleting the doc
    // const docSnap = await getDoc(releaseDocRef);
    // if (docSnap.exists()) {
    //   const data = docSnap.data() as ReleaseMetadata;
    //   // Delete files from Storage if URLs exist
    //   if (data.zipUrl) { try { await deleteObject(ref(storage, data.zipUrl)); console.log("Deleted ZIP file"); } catch (e) { console.error("Error deleting ZIP:", e);} }
    //   if (data.artworkUrl) { try { await deleteObject(ref(storage, data.artworkUrl)); console.log("Deleted artwork file"); } catch (e) { console.error("Error deleting artwork:", e);} }
    // }

    // Delete the Firestore document
    await deleteDoc(releaseDocRef);
    console.log("Release document deleted:", releaseId);
  }
