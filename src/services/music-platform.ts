
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
    // IMPORTANT: zipUrl now conceptually stores a Google Drive File ID or similar identifier
    zipUrl?: string | null; // Optional zipUrl, stores Google Drive ID/link placeholder
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
  export type ExistingReleaseData = Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status' | 'artworkUrl' | 'artist'> & { artworkUrl?: string | null, artist?: string | null, releaseDate: string | Date };


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
   * !! SIMULATION ONLY - REQUIRES BACKEND !!
   * Simulates initiating a release upload to Google Drive via a backend function.
   * Creates metadata in Firestore with a placeholder GDrive ID.
   *
   * @param uploadMetadata - Release name and date.
   * @param zipFile - The ZIP file intended for upload.
   * @returns The ID of the newly created Firestore document.
   * @throws Error if authentication fails.
   *
   * @important Actual Google Drive upload requires a backend implementation
   *            (e.g., Next.js API route, Cloud Function) due to security and
   *            authentication requirements. The backend would:
   *            1. Receive the file and metadata from the client.
   *            2. Authenticate with the Google Drive API (OAuth 2.0 or Service Account).
   *            3. Upload the file to a designated folder in Google Drive.
   *            4. Obtain the Google Drive file ID.
   *            5. Optionally, process the ZIP: extract artwork, get track names.
   *            6. Update the corresponding Firestore document ('releases/{docRef.id}')
   *               with the actual Google Drive file ID, extracted artwork URL,
   *               track list, and set status to 'completed' or 'failed'.
   */
  export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<string> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in.");

    console.warn("--- START Google Drive Upload SIMULATION ---");
    console.log(`File to upload: ${zipFile.name}, Size: ${zipFile.size}`);
    console.log("Metadata:", uploadMetadata);
    console.warn("NOTE: This is a SIMULATION. No file is being uploaded to Google Drive.");

    // --- Simulate Backend Processing Delay ---
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network/upload time

    // --- Generate Placeholder ID ---
    // Use a clear placeholder format to indicate this is not a real ID.
    const simulatedGoogleDriveFileId = `SIMULATED_GDRIVE_UPLOAD_${userId}_${Date.now()}`;
    console.log("Using simulated Google Drive File ID:", simulatedGoogleDriveFileId);

    // Fetch artist name from Firestore profile using getUserProfileByUid
    const userProfile = await getUserProfileByUid(userId);
    const auth = getAuth(app);
    // Fallback logic for artist name
    const artistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";

    // Prepare data for Firestore document (as if backend wasn't implemented yet)
    const newReleaseData: Omit<ReleaseMetadata, 'id' | 'createdAt'> = {
      title: uploadMetadata.releaseName,
      artist: artistName,
      releaseDate: formatDateToString(uploadMetadata.releaseDate), // Standardize date format
      artworkUrl: null, // SIMULATION: Backend would extract this
      zipUrl: simulatedGoogleDriveFileId, // Store the SIMULATED Google Drive ID
      userId: userId,
      status: 'processing', // Initial status - SIMULATION: Backend would update this
      tracks: [], // SIMULATION: Backend would extract this
      spotifyLink: null,
    };

    // --- Create Firestore Document ---
    const releasesRef = collection(db, "users", userId, "releases");
    const docRef = await addDoc(releasesRef, {
      ...newReleaseData,
      createdAt: serverTimestamp(), // Add server timestamp
    });
    console.log("New release metadata document created in Firestore with ID:", docRef.id);
    console.warn("--- END Google Drive Upload SIMULATION ---");
    console.warn("REMINDER: Implement backend logic for actual Google Drive upload and Firestore update.");


    // TODO: Trigger the *actual* backend upload process (e.g., call a Cloud Function)
    // Example (conceptual):
    // try {
    //   const formData = new FormData();
    //   formData.append('file', zipFile);
    //   formData.append('releaseName', uploadMetadata.releaseName);
    //   formData.append('releaseDate', formatDateToString(uploadMetadata.releaseDate));
    //   formData.append('firestoreDocId', docRef.id);
    //
    //   const response = await fetch('/api/upload-to-drive', { // Your backend endpoint
    //     method: 'POST',
    //     body: formData,
    //     // Include authentication headers if needed
    //   });
    //
    //   if (!response.ok) {
    //     // Handle backend error - maybe update Firestore status to 'failed'
    //     throw new Error('Backend upload trigger failed.');
    //   }
    //   console.log("Successfully triggered backend upload process.");
    // } catch (backendError) {
    //   console.error("Error triggering backend upload:", backendError);
    //   // Optionally update Firestore status to 'failed' here as well
    // }

    return docRef.id; // Return the ID of the newly created document
  }


  /**
   * Adds data for an existing release (not uploaded via ZIP) to Firestore.
   * Determines artist name from auth/profile if not provided.
   * Does not include zipUrl. Artwork URL is optional. Status is 'existing'.
   * @param data - The release data including title, date, tracks, spotifyLink. artist is optional.
   * @returns The ID of the newly created Firestore document.
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
          artworkUrl: data.artworkUrl || null, // Use provided URL or null
          userId: userId,
          status: 'existing', // Mark as existing release
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
      await updateDoc(releaseDocRef, dataToUpdate);
      console.log("Release updated successfully in Firestore:", releaseId);

    } catch (error) {
      console.error("Error updating release:", error);
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

      } catch (error) {
          console.error(`Error initiating takedown for release ${releaseId}:`, error);
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

        // Handle Google Drive deletion (Requires Backend Function)
        if (data.zipUrl && data.zipUrl.startsWith('SIMULATED_GDRIVE_UPLOAD_')) { // Check for simulated ID
            console.warn(`Deletion of simulated Google Drive file required for zipUrl: ${data.zipUrl}. This requires a backend function.`);
            // Conceptual backend call:
            // try {
            //   const realDriveId = data.zipUrl.replace('SIMULATED_GDRIVE_UPLOAD_', ''); // Extract potential real ID if backend stored it differently
            //   await fetch('/api/delete-from-drive', { method: 'POST', body: JSON.stringify({ fileId: realDriveId }) });
            //   console.log("Backend notified to delete Google Drive file.");
            // } catch (backendError) {
            //   console.error("Error triggering backend Google Drive deletion:", backendError);
            // }
        }

      } else {
          console.warn(`Release document ${releaseId} not found for deletion.`);
      }

      // Delete the Firestore document
      await deleteDoc(releaseDocRef);
      console.log("Release document deleted from Firestore:", releaseId);

    } catch (error) {
        console.error("Error removing release:", error);
        throw new Error("Failed to remove release and associated files.");
    }
  }
