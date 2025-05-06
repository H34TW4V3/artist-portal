
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
    artists: string[]; // Changed from artist: string | null
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
    artistNames: string[]; // Changed from artistName: string
    releaseName: string;
    releaseDate: string | Date;
  }

  export type ReleaseWithId = ReleaseMetadata & { id: string };

  export type ExistingReleaseData = Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status' | 'artworkUrl' | 'artists' | 'releaseDate' | 'takedownRequestedAt' | 'previousStatusBeforeTakedown'> & { artworkUrl?: string | null, artists?: string[], releaseDate: Date };


  // --- Helper Functions ---

  const getCurrentUserId = (): string => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user || !user.uid) { // Check for user and uid
        console.error("getCurrentUserId: No authenticated user found or UID is missing.");
        throw new Error("Authentication required. Please log in.");
    }
    return user.uid;
  };

  const formatDateToString = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0]; // Default to today if undefined
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else { // Assume string
             let parsed: Date;
             // Check for ISO string with 'T' (datetime)
             if (dateValue.includes('T')) {
                 parsed = new Date(dateValue);
             } 
             // Check for 'yyyy-MM-dd' format (date only)
             else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                 // Parse as UTC to avoid timezone issues if it's just a date string
                 const [year, month, day] = dateValue.split('-').map(Number);
                 parsed = new Date(Date.UTC(year, month - 1, day)); 
             } 
             // Fallback for other string formats (less reliable)
             else {
                 parsed = new Date(dateValue);
             }
             if (isNaN(parsed.getTime())) throw new Error("Invalid date string format");
             date = parsed;
        }
        // Format to YYYY-MM-DD
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", dateValue, e);
        // Fallback to today's date in YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
  };


  // --- API Functions ---

  export async function getStreamingStats(_artistId: string): Promise<StreamingStats> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock data - replace with actual API call in a real application
    return {
      streams: 1_234_567,
      revenue: 6172.84,
      listeners: 45_678,
    };
  }

  export async function getReleases(): Promise<ReleaseWithId[]> {
    const userId = getCurrentUserId(); 
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
      const releasesRef = collection(db, "users", userId, "releases");
      const q = query(releasesRef, orderBy("createdAt", "desc"), limit(1));

      try {
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
              console.log(`No releases found for user ${userId} to get latest artwork.`);
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
    console.log("Starting Firebase Storage upload for new release...");
    console.log(`File to upload: ${zipFile.name}, Size: ${zipFile.size}`);
    console.log("Metadata for upload:", uploadMetadata);

    const sanitizedReleaseName = uploadMetadata.releaseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const zipFileName = `release_${sanitizedReleaseName}_${Date.now()}.zip`;
    const storagePath = `releases/${userId}/${zipFileName}`;
    const storageRef = ref(storage, storagePath);


    let downloadURL: string | null = null;
    try {
        console.log("Uploading to Firebase Storage path:", storageRef.fullPath);
        const snapshot = await uploadBytes(storageRef, zipFile);
        downloadURL = await getDownloadURL(snapshot.ref);
        console.log("File uploaded successfully to Firebase Storage. URL:", downloadURL);
    } catch (uploadError) {
        console.error("Firebase Storage upload failed:", uploadError);
        throw new Error("Failed to upload release file.");
    }

    const primaryArtistName = uploadMetadata.artistNames && uploadMetadata.artistNames.length > 0 
        ? uploadMetadata.artistNames[0] 
        : "Unknown Artist"; // Fallback if artistNames is empty or not provided
    
    if (primaryArtistName === "Unknown Artist") {
        console.warn("uploadReleaseZip: Artist names array is empty. Using 'Unknown Artist'.");
    }


    const newReleaseData: Omit<ReleaseMetadata, 'id' | 'createdAt'> = {
      title: uploadMetadata.releaseName,
      artists: uploadMetadata.artistNames && uploadMetadata.artistNames.length > 0 ? uploadMetadata.artistNames : [primaryArtistName], 
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
        console.log("Attempting to add new release document to Firestore:", newReleaseData);
        const docRef = await addDoc(releasesRef, {
            ...newReleaseData,
            createdAt: serverTimestamp(), 
        });
        console.log("New release metadata document created in Firestore with ID:", docRef.id);
        return docRef.id; 
    } catch (firestoreError) {
        console.error("Firestore document creation failed for new release:", firestoreError);
        throw new Error("Failed to save release metadata after upload.");
    }
  }


  export async function addExistingRelease(data: ExistingReleaseData): Promise<string> {
      const userId = getCurrentUserId();
      console.log("addExistingRelease: Received data:", data);

      let artistsToSave: string[] = [];
      if (data.artists && data.artists.length > 0) {
          artistsToSave = data.artists;
      } else {
          const userProfile = await getUserProfileByUid(userId);
          const auth = getAuth(app);
          const defaultArtistName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";
          artistsToSave = [defaultArtistName];
          console.log("addExistingRelease: Artist names not provided, defaulted to:", artistsToSave);
      }

      const releaseData: Omit<ReleaseMetadata, 'id' | 'createdAt' | 'zipUrl'> = {
          title: data.title,
          artists: artistsToSave,
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
    console.log(`updateRelease: Attempting to update release ${releaseId} for user ${userId}`);
    console.log("Update data received:", data);
    if (newArtworkFile) console.log("New artwork file provided:", newArtworkFile.name);


    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    let finalArtworkUrl: string | null | undefined = data.artworkUrl; 

    try {
        const currentDocSnap = await getDoc(releaseDocRef);
        if (!currentDocSnap.exists()) {
            console.error(`updateRelease: Release document ${releaseId} not found.`);
            throw new Error("Release document not found.");
        }
        const currentData = currentDocSnap.data() as ReleaseMetadata;
        console.log("Current release data:", currentData);

        if (finalArtworkUrl === undefined && !newArtworkFile) { // if data.artworkUrl is not in `data`, keep current
            finalArtworkUrl = currentData.artworkUrl;
        }


        if (newArtworkFile) {
            console.log("Uploading new artwork for release:", releaseId);
            const artworkFileName = `${userId}_${Date.now()}_${newArtworkFile.name}`; 
            const artworkStoragePath = `releaseArtwork/${userId}/${artworkFileName}`; 
            const artworkStorageRef = ref(storage, artworkStoragePath);
            
            console.log("Uploading new artwork to path:", artworkStoragePath);
            const snapshot = await uploadBytes(artworkStorageRef, newArtworkFile);
            finalArtworkUrl = await getDownloadURL(snapshot.ref);
            console.log("New artwork uploaded, URL:", finalArtworkUrl);

            if (currentData.artworkUrl && !currentData.artworkUrl.includes('placeholder') && currentData.artworkUrl.startsWith('https://firebasestorage.googleapis.com/')) {
                try {
                    const oldArtworkRef = ref(storage, currentData.artworkUrl);
                    await deleteObject(oldArtworkRef);
                    console.log("Old artwork deleted:", currentData.artworkUrl);
                } catch (deleteError: any) {
                    if (deleteError.code !== 'storage/object-not-found') {
                        console.warn("Failed to delete old artwork (non-critical):", deleteError);
                    }
                }
            }
        } else if (data.artworkUrl === null) { 
             finalArtworkUrl = null;
              if (currentData.artworkUrl && !currentData.artworkUrl.includes('placeholder') && currentData.artworkUrl.startsWith('https://firebasestorage.googleapis.com/')) {
                 try {
                     const oldArtworkRef = ref(storage, currentData.artworkUrl);
                     await deleteObject(oldArtworkRef);
                     console.log("Old artwork (explicitly removed) deleted:", currentData.artworkUrl);
                 } catch (deleteError: any) {
                     if (deleteError.code !== 'storage/object-not-found') {
                         console.warn("Failed to delete old artwork (explicitly removed, non-critical):", deleteError);
                     }
                 }
             }
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
       

      console.log("Attempting to update release document in Firestore:", releaseId, "with data:", dataToUpdate);
      await updateDoc(releaseDocRef, dataToUpdate);
      console.log("Release updated successfully in Firestore:", releaseId);

    } catch (error: any) {
      console.error("Error updating release:", error);
      console.error("Error details:", error.code, error.message);
      throw new Error(`Failed to update release. ${error.message || ''}`);
    }
  }

  
  async function requestPlatformTakedown(releaseId: string): Promise<void> {
      console.log(`Simulating platform takedown request for release ${releaseId}...`);
      
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      console.log(`Platform takedown simulation complete for ${releaseId}.`);
  }

  export async function initiateTakedown(releaseId: string): Promise<void> {
      const userId = getCurrentUserId();
      const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

      try {
          const docSnap = await getDoc(releaseDocRef);
          if (!docSnap.exists()) {
              console.error(`initiateTakedown: Release ${releaseId} not found.`);
              throw new Error("Release not found.");
          }
          const currentStatus = docSnap.data().status;
          console.log(`Initiating takedown for release ${releaseId}. Current status: ${currentStatus}`);

          await updateDoc(releaseDocRef, {
              status: 'takedown_requested',
              takedownRequestedAt: serverTimestamp(),
              previousStatusBeforeTakedown: currentStatus || 'existing', 
          });
          console.log(`Release ${releaseId} status updated to takedown_requested in Firestore.`);

          
          await requestPlatformTakedown(releaseId);

      } catch (error: any) {
          console.error(`Error initiating takedown for release ${releaseId}:`, error);
          console.error("Error details:", error.code, error.message);
          throw new Error(`Failed to initiate takedown request. ${error.message || ''}`);
      }
  }

  export async function cancelTakedownRequest(releaseId: string): Promise<void> {
    const userId = getCurrentUserId();
    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    console.log(`Attempting to cancel takedown for release ${releaseId}`);

    try {
        const docSnap = await getDoc(releaseDocRef);
        if (!docSnap.exists()) {
            console.error(`cancelTakedownRequest: Release ${releaseId} not found.`);
            throw new Error("Release not found.");
        }
        const release = docSnap.data() as ReleaseMetadata;
        console.log("Current release data for cancellation:", release);


        if (release.status !== 'takedown_requested' || !release.takedownRequestedAt) {
            console.warn(`cancelTakedownRequest: Takedown not active or already processed for ${releaseId}. Status: ${release.status}`);
            throw new Error("Takedown request not found or already processed.");
        }

        
        const takedownTime = release.takedownRequestedAt.toDate();
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

        if (Date.now() - takedownTime.getTime() > twentyFourHoursInMs) {
            console.warn(`cancelTakedownRequest: Takedown for ${releaseId} cannot be cancelled after 24 hours.`);
            throw new Error("Takedown request cannot be cancelled after 24 hours.");
        }

        
        const statusToRestore = release.previousStatusBeforeTakedown || 'existing'; 
        await updateDoc(releaseDocRef, {
            status: statusToRestore,
            takedownRequestedAt: null,
            previousStatusBeforeTakedown: null,
        });
        console.log(`Takedown request for release ${releaseId} cancelled. Status restored to ${statusToRestore}.`);

        
        console.log(`Simulating notification to backend to cancel platform takedown for ${releaseId}.`);
        await new Promise(resolve => setTimeout(resolve, 500));


    } catch (error: any) {
        console.error(`Error cancelling takedown for release ${releaseId}:`, error);
        throw new Error(error.message || "Failed to cancel takedown request.");
    }
}


export async function removeRelease(releaseId: string): Promise<void> {
    const userId = getCurrentUserId(); 
    console.log(`Attempting to remove release ${releaseId} for user ${userId}`);

    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);

    try {
      const docSnap = await getDoc(releaseDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as ReleaseMetadata;
        console.log("Release data found for removal:", data);

        
        if (data.artworkUrl && !data.artworkUrl.includes('placeholder') && data.artworkUrl.startsWith('https://firebasestorage.googleapis.com/')) {
             try { 
                 await deleteObject(ref(storage, data.artworkUrl)); 
                 console.log("Deleted artwork file from Cloud Storage:", data.artworkUrl); 
             }
             catch (e: any) { 
                 if (e.code !== 'storage/object-not-found') {
                     console.error("Error deleting artwork (non-critical):", e);
                 } else {
                     console.log("Artwork file not found in storage, skipping deletion:", data.artworkUrl);
                 }
             }
        }

        
        if (data.zipUrl && data.zipUrl.startsWith('https://firebasestorage.googleapis.com/')) {
             try { 
                 await deleteObject(ref(storage, data.zipUrl)); 
                 console.log("Deleted ZIP file from Cloud Storage:", data.zipUrl); 
             }
             catch (e: any) { 
                 if (e.code !== 'storage/object-not-found') {
                     console.error("Error deleting ZIP file (non-critical):", e);
                 } else {
                     console.log("ZIP file not found in storage, skipping deletion:", data.zipUrl);
                 }
             }
        }

      } else {
          console.warn(`Release document ${releaseId} not found for deletion in user ${userId}'s collection. Skipping storage deletion.`);
      }

      
      await deleteDoc(releaseDocRef);
      console.log("Release document deleted from Firestore:", releaseId);

    } catch (error: any) {
        console.error("Error removing release:", error);
        console.error("Error details:", error.code, error.message);
        throw new Error(`Failed to remove release and associated files. ${error.message || ''}`);
    }
  }

export async function addTestRelease(): Promise<string | null> {
    const userId = getCurrentUserId();
    console.log("Attempting to add test release for user:", userId);

    const userProfile = await getUserProfileByUid(userId);
    const auth = getAuth(app);
    const artistDisplayName = userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Test Artist";
    console.log("Using artist name for test release:", artistDisplayName);


    const testReleaseData: Omit<ReleaseMetadata, 'id' | 'userId' | 'createdAt' | 'zipUrl'> = {
        title: "My Awesome Test EP",
        artists: [artistDisplayName], // Store as an array
        releaseDate: formatDateToString(new Date(new Date().setDate(new Date().getDate() + 7))), 
        artworkUrl: "https://picsum.photos/seed/testrelease1/300/300", 
        status: 'existing', 
        tracks: [
            { name: "Test Track 1 (Sunrise Mix)" },
            { name: "Another Test Vibe" },
            { name: "The Test Outro" },
        ],
        spotifyLink: "https://open.spotify.com/album/0sNOF9WDwhWunNAHPD3qYc", 
        takedownRequestedAt: null,
        previousStatusBeforeTakedown: null,
    };

    const releasesRef = collection(db, "users", userId, "releases");
    try {
        console.log("Adding test release data to Firestore:", testReleaseData);
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

