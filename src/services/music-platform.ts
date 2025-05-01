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

  // --- Interfaces ---

  export interface StreamingStats {
    streams: number;
    revenue: number;
    listeners: number;
  }

  export interface ReleaseMetadataBase {
    title: string;
    artist: string;
    releaseDate: string;
  }

  export interface ReleaseMetadata extends ReleaseMetadataBase {
    artworkUrl: string;
    zipUrl?: string;
    userId: string;
    createdAt?: Timestamp;
    status?: 'processing' | 'completed' | 'failed';
  }

  export interface ReleaseUploadMetadata {
    releaseName: string;
    releaseDate: string;
  }

  export type ReleaseWithId = ReleaseMetadata & { id: string };

  // --- Helper Functions ---

  const getCurrentUserId = (): string | null => { // Allow null return
    const auth = getAuth(app);
    const user = auth.currentUser;
    // Remove throwing error, handle null return in callers
    // if (!user) {
    //   throw new Error("Authentication required. Please log in.");
    // }
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
    const q = query(releasesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const releases: ReleaseWithId[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as ReleaseMetadata;
      releases.push({ id: docSnap.id, ...data });
    });
    return releases;
  }

  /**
   * Fetches the artwork URL of the latest release for the currently logged-in user.
   * @returns A promise resolving to the artwork URL string, or null if no releases or no artwork found.
   */
  export async function getLatestReleaseArtwork(): Promise<string | null> {
      const userId = getCurrentUserId();
      if (!userId) return null; // No user, no artwork

      const releasesRef = collection(db, "users", userId, "releases");
      // Query for the latest release (order by createdAt desc, limit 1)
      const q = query(releasesRef, orderBy("createdAt", "desc"), limit(1));

      try {
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
              console.log(`No releases found for user ${userId}`);
              return null; // No releases found
          }

          const latestReleaseDoc = querySnapshot.docs[0];
          const data = latestReleaseDoc.data() as ReleaseMetadata;

          if (data.artworkUrl) {
              console.log(`Found latest artwork URL for user ${userId}: ${data.artworkUrl}`);
              return data.artworkUrl;
          } else {
              console.log(`Latest release for user ${userId} has no artwork URL.`);
              return null; // Latest release exists but has no artwork
          }
      } catch (error) {
          console.error("Error fetching latest release artwork:", error);
          // Don't throw, just return null on error
          return null;
      }
  }


  export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in."); // Guard clause

    const zipFileName = `${userId}_${Date.now()}_${zipFile.name}`;
    const storageRef = ref(storage, `releaseZips/${userId}/${zipFileName}`);
    const snapshot = await uploadBytes(storageRef, zipFile);
    const zipUrl = await getDownloadURL(snapshot.ref);

    const auth = getAuth(app);
    const artistName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";

    const newReleaseData: Omit<ReleaseMetadata, 'createdAt' | 'artworkUrl'> = { // Exclude artworkUrl initially
      title: uploadMetadata.releaseName,
      artist: artistName,
      releaseDate: uploadMetadata.releaseDate,
      // artworkUrl: '', // Set artworkUrl to empty initially or by backend function
      zipUrl,
      userId,
      status: 'processing',
    };

    const newDocRef = doc(collection(db, "users", userId, "releases"));
    await setDoc(newDocRef, {
      ...newReleaseData,
      artworkUrl: '', // Explicitly set to empty string for now
      createdAt: serverTimestamp(),
    });
  }

  export async function updateReleaseMetadata(releaseId: string, metadataToUpdate: Partial<Pick<ReleaseMetadata, 'title' | 'artist' | 'releaseDate'>>): Promise<void> {
    const userId = getCurrentUserId();
     if (!userId) throw new Error("Authentication required. Please log in."); // Guard clause
    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    await updateDoc(releaseDocRef, metadataToUpdate);
  }

  export async function removeRelease(releaseId: string): Promise<void> {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Authentication required. Please log in."); // Guard clause

    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    // TODO: Consider deleting associated files (ZIP, artwork) from Storage as well
    await deleteDoc(releaseDocRef);
  }
