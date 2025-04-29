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
  
  const getCurrentUserId = (): string => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Authentication required. Please log in.");
    }
    return user.uid;
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
  
  export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<void> {
    const userId = getCurrentUserId();
    const zipFileName = `${userId}_${Date.now()}_${zipFile.name}`;
    const storageRef = ref(storage, `releaseZips/${userId}/${zipFileName}`);
    const snapshot = await uploadBytes(storageRef, zipFile);
    const zipUrl = await getDownloadURL(snapshot.ref);
  
    const auth = getAuth(app);
    const artistName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Unknown Artist";
  
    const newReleaseData: Omit<ReleaseMetadata, 'createdAt'> = {
      title: uploadMetadata.releaseName,
      artist: artistName,
      releaseDate: uploadMetadata.releaseDate,
      artworkUrl: '',
      zipUrl,
      userId,
      status: 'processing',
    };
  
    const newDocRef = doc(collection(db, "users", userId, "releases"));
    await setDoc(newDocRef, {
      ...newReleaseData,
      createdAt: serverTimestamp(),
    });
  }
  
  export async function updateReleaseMetadata(releaseId: string, metadataToUpdate: Partial<Pick<ReleaseMetadata, 'title' | 'artist' | 'releaseDate'>>): Promise<void> {
    const userId = getCurrentUserId();
    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    await updateDoc(releaseDocRef, metadataToUpdate);
  }
  
  export async function removeRelease(releaseId: string): Promise<void> {
    const userId = getCurrentUserId();
    const releaseDocRef = doc(db, "users", userId, "releases", releaseId);
    await deleteDoc(releaseDocRef);
  }
  