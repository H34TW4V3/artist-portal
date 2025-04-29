
/**
 * MOCK IMPLEMENTATION: Replace with actual API calls to your backend/Firebase.
 */

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
  releaseDate: string; // Always string format now
}

/**
 * Represents the metadata for a music release *after* processing,
 * including the generated artwork URL.
 */
export interface ReleaseMetadata extends ReleaseMetadataBase {
   /** URL of the cover artwork image. Populated after backend processing. */
   artworkUrl: string;
}

/**
 * Represents the metadata submitted with the ZIP upload.
 */
export interface ReleaseUploadMetadata {
  /** The name provided for the release during upload. */
  releaseName: string;
   /** The desired release date in 'yyyy-MM-dd' format. */
  releaseDate: string;
}


// Type for a release including its unique ID
export type ReleaseWithId = ReleaseMetadata & { id: string };

// --- Mock Data Store ---

let mockReleases: ReleaseWithId[] = [
  { id: 'release1', title: 'Sunset Drive', artist: 'Synthwave Masters', artworkUrl: 'https://picsum.photos/seed/release1/200/200', releaseDate: '2023-10-26' },
  { id: 'release2', title: 'Ocean Breeze', artist: 'Chillhop Vibes', artworkUrl: 'https://picsum.photos/seed/release2/200/200', releaseDate: '2023-09-15' },
  { id: 'release3', title: 'Midnight City', artist: 'Electro Nights', artworkUrl: 'https://picsum.photos/seed/release3/200/200', releaseDate: '2023-11-01' },
  { id: 'release4', title: 'Forest Whispers', artist: 'Ambient Worlds', artworkUrl: 'https://picsum.photos/seed/release4/200/200', releaseDate: '2023-08-05' },
  // Add a release that might have been uploaded via ZIP (could start without artwork)
  { id: 'release-zip-1', title: 'Digital Dreams', artist: 'Code Collective', artworkUrl: '', releaseDate: '2024-01-10' }, // Initially no artwork URL
];

let nextReleaseId = 5;

// --- API Functions ---

/**
 * Simulates fetching streaming statistics.
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
 * Simulates fetching the list of releases for the artist.
 * Returns processed releases (potentially including those from ZIP uploads).
 * @returns A promise resolving to an array of ReleaseWithId.
 */
export async function getReleases(): Promise<ReleaseWithId[]> {
     console.log("Mock API: Fetching releases...");
     await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

     // Simulate backend processing adding artwork URL to the ZIP upload
     const processedReleases = mockReleases.map(release => {
         if (release.id === 'release-zip-1' && !release.artworkUrl) {
             // Simulate artwork being processed and URL added
             return { ...release, artworkUrl: `https://picsum.photos/seed/${release.id}/200/200` };
         }
         return release;
     });
     mockReleases = processedReleases; // Update the mock store with processed data


     // Return a sorted copy
     return [...mockReleases].sort((a, b) => {
        const dateA = new Date(a.releaseDate + 'T00:00:00Z').getTime(); // Ensure consistent parsing
        const dateB = new Date(b.releaseDate + 'T00:00:00Z').getTime(); // Ensure consistent parsing
        return dateB - dateA;
     });
}


/**
 * Simulates uploading a new music release as a ZIP file containing audio and artwork.
 * Assumes backend processing will extract metadata and files.
 * @param uploadMetadata - Metadata provided during the upload (name, date).
 * @param zipFile - The ZIP file containing the release assets.
 * @returns A promise resolving when the upload is accepted for processing.
 */
export async function uploadReleaseZip(uploadMetadata: ReleaseUploadMetadata, zipFile: File): Promise<void> {
    console.log("Mock API: Uploading release ZIP...", { uploadMetadata, zipFileName: zipFile.name });
    await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate ZIP upload delay

    // --- Backend Simulation ---
    // In a real backend:
    // 1. Receive the ZIP file and metadata.
    // 2. Generate a unique ID.
    // 3. Store the ZIP temporarily.
    // 4. Queue a processing job (e.g., Cloud Function, background task).
    // 5. The job would:
    //    - Unzip the file.
    //    - Validate contents (find audio, artwork based on naming convention or manifest).
    //    - Extract technical metadata from audio (duration, format).
    //    - Potentially extract ID3 tags for artist/title if not provided reliably.
    //    - Upload audio and artwork to storage (e.g., Cloud Storage).
    //    - Create the final ReleaseMetadata record in the database (Firestore).
    //    - Include the storage URLs (like artworkUrl).
    //    - Update the status (e.g., 'processing', 'completed', 'failed').

    // --- Mock Implementation ---
    // We simulate the *initial* creation of the record, marked as processing.
    // The getReleases function will later simulate the 'completed' state.
    const newReleaseId = `release-zip-${nextReleaseId++}`;

    // Assume artist name might be extracted from ZIP or defaults
    // For simplicity, let's use a placeholder or derive from the name.
    // A real implementation would need a better way to get the artist.
    const extractedArtist = uploadMetadata.releaseName.split('-')[0]?.trim() || "Unknown Artist"; // Very basic guess

    const newReleaseRecord: ReleaseWithId = {
        id: newReleaseId,
        title: uploadMetadata.releaseName,
        artist: extractedArtist, // Placeholder - Needs real logic
        releaseDate: uploadMetadata.releaseDate, // Already formatted string
        artworkUrl: '', // Initially empty, backend processing will fill this
        // Potentially add a 'status': 'processing' field here
    };

    mockReleases.unshift(newReleaseRecord); // Add the 'processing' record
    console.log("Mock API: Release ZIP accepted for processing. ID:", newReleaseId);
    // No need to return ID/URL here, as processing happens async.
    // The UI will see the new release via getReleases later.
}


/**
 * Simulates updating the metadata for an existing release.
 * This function now *only* updates text fields (title, artist, date).
 * Artwork is handled by the initial ZIP upload or a separate process.
 * @param releaseId - The ID of the release to update.
 * @param metadataToUpdate - The *metadata* fields to update (title, artist, releaseDate). artworkUrl is ignored here.
 * @returns A promise resolving when the update is complete.
 */
export async function updateReleaseMetadata(releaseId: string, metadataToUpdate: ReleaseMetadata): Promise<void> {
    console.log(`Mock API: Updating metadata for release ${releaseId}...`, { title: metadataToUpdate.title, artist: metadataToUpdate.artist, releaseDate: metadataToUpdate.releaseDate });
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate update delay

    const releaseIndex = mockReleases.findIndex(r => r.id === releaseId);
    if (releaseIndex !== -1) {
        // Update only the specified fields, keep existing ID and artworkUrl
        mockReleases[releaseIndex] = {
            ...mockReleases[releaseIndex], // Keep existing fields (ID, artworkUrl)
            title: metadataToUpdate.title,
            artist: metadataToUpdate.artist,
            releaseDate: metadataToUpdate.releaseDate, // Already formatted string
        };
        console.log("Mock API: Metadata updated for release:", releaseId);
    } else {
        console.error("Mock API: Release not found for update:", releaseId);
        throw new Error(`Release with ID ${releaseId} not found.`);
    }
}


/**
 * Simulates removing an existing release.
 * @param releaseId - The ID of the release to remove.
 * @returns A promise resolving when the removal is complete.
 */
export async function removeRelease(releaseId: string): Promise<void> {
    console.log(`Mock API: Removing release ${releaseId}...`);
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate deletion delay

    const initialLength = mockReleases.length;
    mockReleases = mockReleases.filter(r => r.id !== releaseId);

    if (mockReleases.length < initialLength) {
        console.log("Mock API: Release removed:", releaseId);
    } else {
        console.warn("Mock API: Release not found for removal:", releaseId);
        // Resolve silently as the item is already gone or never existed
    }
}

// --- Deprecated/Old Functions (Keep or remove based on strategy) ---

/**
 * @deprecated Use uploadReleaseZip instead.
 * Simulates uploading a new music release with separate audio and artwork files.
 */
export async function uploadRelease_DEPRECATED(metadataBase: ReleaseMetadataBase, audioFile: File, artworkFile: File): Promise<{ id: string; artworkUrl: string }> {
    console.warn("Mock API: uploadRelease is deprecated. Use uploadReleaseZip.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    const newReleaseId = `release${nextReleaseId++}`;
    const finalArtworkUrl = `https://picsum.photos/seed/${newReleaseId}/200/200`;
    const newRelease: ReleaseWithId = {
        ...metadataBase,
        id: newReleaseId,
        artworkUrl: finalArtworkUrl,
        releaseDate: metadataBase.releaseDate instanceof Date ? metadataBase.releaseDate.toISOString().split('T')[0] : metadataBase.releaseDate,
    };
    mockReleases.unshift(newRelease);
    return { id: newReleaseId, artworkUrl: finalArtworkUrl };
}
