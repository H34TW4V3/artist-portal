
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
    // zipUrl now stores the Firebase Storage download URL
    zipUrl?: string | null; // Optional Firebase Storage download URL
    userId: string;
    createdAt?: Timestamp;
    status?: 'processing' | 'completed' | 'failed' | 'takedown_requested' | 'existing'; // Added 'existing' status
    tracks?: TrackInfo[]; // Array of track objects
    spotifyLink?: string | null; // Optional spotify link
  }

  export interface ReleaseUploadMetadata {
    releaseName: string;
    releaseDate: string | Date; // Expect YYYY-MM-DD string or Date object
  }

  // ReleaseWithId includes the Firestore document ID
  export type ReleaseWithId = ReleaseMetadata & { id: string };

  // Type for adding an existing release - Artist is now optional here
  // Make artworkUrl optional as well for consistency with how it's used
  // Changed to accept Date object for releaseDate, formatting handled internally.
  export type ExistingReleaseData = Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status' | 'artworkUrl' | 'artist' | 'releaseDate'> & { artworkUrl?: string | null, artist?: string | null, releaseDate: Date };


  // --- Helper Functions ---

  const getCurrentUserId = (): string | null => { // Allow null return
    const auth = getAuth(app);
    const user = auth.currentUser;
    return user?.uid || null;
  };

  // Helper to standardize date to YYYY-MM-DD string
  const formatDateToString = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0]; // Fallback to today
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else { // Assuming string
             // Try parsing ISO string (which YYYY-MM-DD is a subset of)
             // Ensure interpretation assumes local time if no timezone specified, then format to YYYY-MM-DD
             // Adjusting parsing: If only date, treat as local date.
             let parsed: Date;
             if (dateValue.includes('T')) {
                 parsed = new Date(dateValue); // Treat as ISO string with timezone info
             } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                 // Split YYYY-MM-DD and create date respecting local timezone
                 const [year, month, day] = dateValue.split('-').map(Number);
                 parsed = new Date(year, month - 1, day); // This uses local timezone
             } else {
                 parsed = new Date(dateValue); // Fallback for other formats
             }

             if (isNaN(parsed.getTime())) throw new Error("Invalid date string");
             date = parsed;
        }
        // Format to YYYY-MM-DD based on the local date interpretation
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", dateValue, e);
        // Fallback to today's date in local YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
  };


  // --- API Functions ---

  export async function getStreamingStats(_artistId: string): Promise<StreamingStats> {
    // Mock implementation
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
    // Order by releaseDate descending, then createdAt descending as fallback
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
      if (!userId) return null; // No user, no artwork

      const releasesRef = collection(db, "users", userId, "releases");
      // Order by creation date to likely get the most recent upload
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


 /**
   * Uploads the release ZIP file to Firebase Cloud Storage and creates metadata in Firestore.
   *
   * @param uploadMetadata - Release name and date.
   * @param zipFile - The ZIP file to upload.
   * @returns The ID of the newly created Firestore document.
   * @throws Error if authentication fails or upload fails.
   */
  export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<string> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in.");

    console.log("Starting Firebase Storage upload...");
    console.log(`File to upload: ${zipFile.name}, Size: ${zipFile.size}`);
    console.log("Metadata:", uploadMetadata);

    // --- 1. Upload to Firebase Storage ---
    const sanitizedReleaseName = uploadMetadata.releaseName.replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize name for filename
    const zipFileName = `release_${sanitizedReleaseName}_${Date.now()}.zip`;
    const storageRef = ref(storage, `releases/${userId}/${zipFileName}`);

    let downloadURL: string | null = null;
    try {
        console.log("Uploading to path:", storageRef.fullPath);
        const snapshot = await uploadBytes(storageRef, zipFile);
        downloadURL = await getDownloadURL(snapshot.ref);
        console.log("File uploaded successfully to Firebase Storage. URL:", downloadURL);
    } catch (uploadError) {
        console.error("Firebase Storage upload failed:", uploadError);
        throw new Error("Failed to upload release file."); // Rethrow a specific error
    }

    // --- 2. Fetch Artist Name ---
    const userProfile = await getUserProfileByUid(userId);
    const auth = getAuth(app);
    const artistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";

    // --- 3. Prepare Firestore Data ---
    const newReleaseData: Omit<ReleaseMetadata, 'id' | 'createdAt'> = {
      title: uploadMetadata.releaseName,
      artist: artistName,
      releaseDate: formatDateToString(uploadMetadata.releaseDate), // Standardize date format
      artworkUrl: null, // Set to null initially - could be extracted later by a backend function
      zipUrl: downloadURL, // Store the Firebase Storage download URL
      userId: userId,
      status: 'processing', // Assume processing needed after upload (e.g., metadata extraction)
                         // Change to 'completed' if no further processing happens.
      tracks: [], // Keep empty initially - could be extracted later
      spotifyLink: null,
    };

    // --- 4. Create Firestore Document ---
    const releasesRef = collection(db, "users", userId, "releases");
    try {
        console.log("Attempting to add release document to Firestore:", newReleaseData);
        const docRef = await addDoc(releasesRef, {
            ...newReleaseData,
            createdAt: serverTimestamp(), // Add server timestamp
        });
        console.log("New release metadata document created in Firestore with ID:", docRef.id);
        return docRef.id; // Return the ID of the newly created document
    } catch (firestoreError) {
        console.error("Firestore document creation failed:", firestoreError);
        // Optional: Attempt to delete the uploaded file if Firestore fails? (Adds complexity)
        // try { await deleteObject(storageRef); console.log("Cleaned up uploaded file due to Firestore error."); } catch (cleanupError) { console.error("Failed to cleanup storage file:", cleanupError); }
        throw new Error("Failed to save release metadata after upload.");
    }
  }


  /**
   * Adds data for an existing release (not uploaded via ZIP) to Firestore.
   * Determines artist name from auth/profile if not provided.
   * Does not include zipUrl. Artwork URL is optional (expects URL string if provided, NO UPLOAD). Status is 'existing'.
   * @param data - The release data including title, date, tracks, spotifyLink, artworkUrl (optional URL). artist is optional.
   * @returns The ID of the newly created Firestore document.
   * @throws Error if authentication fails or Firestore operation fails.
   */
  export async function addExistingRelease(data: ExistingReleaseData): Promise<string> {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Authentication required. Please log in.");

      // Fetch artist name from Firestore profile if not provided in data
      let artistName = data.artist;
      if (!artistName) {
          const userProfile = await getUserProfileByUid(userId);
          const auth = getAuth(app);
          artistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";
      }

      // Prepare data for Firestore
      const releaseData: Omit<ReleaseMetadata, 'id' | 'createdAt' | 'zipUrl'> = {
          title: data.title,
          artist: artistName, // Use determined artist name
          releaseDate: formatDateToString(data.releaseDate), // Standardize date format
          artworkUrl: data.artworkUrl || null, // Use provided URL string or null
          userId: userId,
          status: 'existing', // Mark as existing release
          tracks: data.tracks || [], // Use provided tracks or empty array
          spotifyLink: data.spotifyLink || null, // Use provided link or null
      };

      console.log("Attempting to add existing release document to Firestore:", releaseData); // Log data being saved
      const releasesRef = collection(db, "users", userId, "releases");
      try {
          const docRef = await addDoc(releasesRef, {
              ...releaseData,
              createdAt: serverTimestamp(),
          });
          console.log("Existing release document created in Firestore with ID:", docRef.id);
          return docRef.id;
      } catch (firestoreError: any) { // Catch specific error type
          console.error("Firestore document creation failed for existing release:", firestoreError);
          console.error("Firestore error code:", firestoreError.code); // Log specific error code
          console.error("Firestore error message:", firestoreError.message);
          throw new Error("Failed to save existing release data.");
      }
  }


  /**
   * Updates an existing release document, potentially including artwork upload (to Cloud Storage).
   * @param releaseId - The ID of the release document to update.
   * @param data - An object containing the fields to update (e.g., title, date, tracks, spotifyLink). artworkUrl can be null to remove it.
   * @param newArtworkFile - Optional new artwork file to upload to Cloud Storage.
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
    let finalArtworkUrl: string | null = null; // Start with null, decide based on logic below

    try {
        const currentDocSnap = await getDoc(releaseDocRef);
        if (!currentDocSnap.exists()) {
            throw new Error("Release document not found.");
        }
        const currentData = currentDocSnap.data() as ReleaseMetadata;

        // Determine the final artwork URL
        if (newArtworkFile) {
            // 1. Handle New Artwork Upload (to Cloud Storage)
            console.log("Uploading new artwork for release:", releaseId);
            const artworkFileName = `${userId}_${Date.now()}_${newArtworkFile.name}`;
            // **UPDATED PATH**
            const artworkStorageRef = ref(storage, `releaseArtwork/${userId}/${artworkFileName}`);
            const snapshot = await uploadBytes(artworkStorageRef, newArtworkFile);
            finalArtworkUrl = await getDownloadURL(snapshot.ref);
            console.log("New artwork uploaded, URL:", finalArtworkUrl);

            // Attempt to delete old artwork if it existed and wasn't the placeholder
            if (currentData.artworkUrl && !currentData.artworkUrl.includes('placeholder')) {
                try {
                    const oldArtworkRef = ref(storage, currentData.artworkUrl);
                    await deleteObject(oldArtworkRef);
                    console.log("Old artwork deleted:", currentData.artworkUrl);
                } catch (deleteError: any) {
                    // Log error but don't fail the whole update if deletion fails
                    if (deleteError.code !== 'storage/object-not-found') {
                        console.warn("Failed to delete old artwork:", deleteError);
                    }
                }
            }
        } else if (data.artworkUrl === null) {
            // 2. Handle Explicit Removal of Artwork
             finalArtworkUrl = null;
              // Attempt to delete old artwork if it existed and wasn't the placeholder
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
            // 3. Keep Existing Artwork (if no new file and artworkUrl not explicitly set to null in `data`)
            // If data.artworkUrl is provided (and not null), use it. Otherwise, keep current.
            finalArtworkUrl = data.artworkUrl !== undefined ? data.artworkUrl : currentData.artworkUrl;
        }


      // 4. Prepare data for Firestore update
      const dataToUpdate: Partial<ReleaseMetadata> = {
        ...data, // Include updated title, tracks, spotifyLink etc. from form
        artworkUrl: finalArtworkUrl, // Set the determined artwork URL
      };

       // Ensure releaseDate is a string if provided and is a Date object
       // Use formatDateToString to ensure consistency
       if (dataToUpdate.releaseDate) {
           dataToUpdate.releaseDate = formatDateToString(dataToUpdate.releaseDate);
       }

       // Remove fields that shouldn't be updated directly here
       delete (dataToUpdate as any).userId; // Type assertion needed as userId is not in the Partial type here
       delete (dataToUpdate as any).createdAt;
       delete (dataToUpdate as any).zipUrl;
       // Allow status updates if passed in `data` (e.g., for takedown requests)
       // delete dataToUpdate.status;

      // 5. Update Firestore Document
      console.log("Attempting to update release document in Firestore:", releaseId, dataToUpdate);
      await updateDoc(releaseDocRef, dataToUpdate);
      console.log("Release updated successfully in Firestore:", releaseId);

    } catch (error: any) { // Catch specific error type
      console.error("Error updating release:", error);
      console.error("Firestore error code (update):", error.code);
      console.error("Firestore error message (update):", error.message);
      throw new Error("Failed to update release.");
    }
  }


  // Example function to simulate a backend process for takedown (replace with actual Cloud Function call)
  async function requestPlatformTakedown(releaseId: string): Promise<void> {
      console.log(`Simulating platform takedown request for release ${releaseId}...`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      console.log(`Platform takedown simulation complete for ${releaseId}.`);
      // In a real scenario, this would trigger backend processes on Spotify, Apple Music, etc.
  }


  /**
   * Updates the release status to 'takedown_requested' and potentially initiates backend processes.
   * @param releaseId - The ID of the release document.
   * @returns A promise resolving when the status update and simulated takedown are complete.
   */
  export async function initiateTakedown(releaseId: string): Promise<void> {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Authentication required.");

      const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

      try {
          // 1. Update Firestore status
          await updateDoc(releaseDocRef, { status: 'takedown_requested' });
          console.log(`Release ${releaseId} status updated to takedown_requested.`);

          // 2. Trigger backend/platform takedown process (simulation)
          // In a real app, you might call a Cloud Function here instead of requestPlatformTakedown
          await requestPlatformTakedown(releaseId);

      } catch (error: any) { // Catch specific error type
          console.error(`Error initiating takedown for release ${releaseId}:`, error);
          console.error("Firestore error code (takedown):", error.code);
          console.error("Firestore error message (takedown):", error.message);
          throw new Error("Failed to initiate takedown request.");
      }
  }


  /**
   * Deletes the release document from Firestore AND associated files from Cloud Storage.
   * USE WITH CAUTION - This is intended for permanent deletion, not typical takedowns.
   * Requires backend function for Google Drive deletion.
   * @param releaseId - The ID of the release document to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  export async function removeRelease(releaseId: string): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in.");

    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

    try {
      // Get the document data to find file URLs before deleting the doc
      const docSnap = await getDoc(releaseDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as ReleaseMetadata;

        // Delete Artwork from Cloud Storage if URL exists and is not placeholder
        if (data.artworkUrl && !data.artworkUrl.includes('placeholder')) {
             try { await deleteObject(ref(storage, data.artworkUrl)); console.log("Deleted artwork file from Cloud Storage"); }
             catch (e: any) { if (e.code !== 'storage/object-not-found') console.error("Error deleting artwork:", e);}
        }

        // Delete ZIP file from Cloud Storage if URL exists
        if (data.zipUrl) {
             try { await deleteObject(ref(storage, data.zipUrl)); console.log("Deleted ZIP file from Cloud Storage"); }
             catch (e: any) { if (e.code !== 'storage/object-not-found') console.error("Error deleting ZIP file:", e);}
        }

      } else {
          console.warn(`Release document ${releaseId} not found for deletion.`);
      }

      // Delete the Firestore document
      await deleteDoc(releaseDocRef);
      console.log("Release document deleted from Firestore:", releaseId);

    } catch (error: any) { // Catch specific error type
        console.error("Error removing release:", error);
        console.error("Firestore error code (remove):", error.code);
        console.error("Firestore error message (remove):", error.message);
        throw new Error("Failed to remove release and associated files.");
    }
  }

