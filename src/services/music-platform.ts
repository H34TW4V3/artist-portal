
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
 * Represents the metadata for a music release (excluding files).
 */
export interface ReleaseMetadataBase {
  /** The title of the release. */
  title: string;
  /** The main artist name. */
  artist: string;
  /** Release date in 'yyyy-MM-dd' format or Date object. */
  releaseDate: string | Date;
}


/**
 * Represents the metadata for a music release, including the artwork URL.
 * Used when retrieving or updating existing releases.
 */
export interface ReleaseMetadata extends ReleaseMetadataBase {
   /** URL of the cover artwork image. */
   artworkUrl: string;
}


// Type for a release including its unique ID
export type ReleaseWithId = ReleaseMetadata & { id: string };

// --- Mock Data Store ---

let mockReleases: ReleaseWithId[] = [
  { id: 'release1', title: 'Sunset Drive', artist: 'Synthwave Masters', artworkUrl: 'https://picsum.photos/seed/release1/200/200', releaseDate: '2023-10-26' },
  { id: 'release2', title: 'Ocean Breeze', artist: 'Chillhop Vibes', artworkUrl: 'https://picsum.photos/seed/release2/200/200', releaseDate: '2023-09-15' },
  { id: 'release3', title: 'Midnight City', artist: 'Electro Nights', artworkUrl: 'https://picsum.photos/seed/release3/200/200', releaseDate: '2023-11-01' },
  { id: 'release4', title: 'Forest Whispers', artist: 'Ambient Worlds', artworkUrl: 'https://picsum.photos/seed/release4/200/200', releaseDate: '2023-08-05' },
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
 * @returns A promise resolving to an array of ReleaseWithId.
 */
export async function getReleases(): Promise<ReleaseWithId[]> {
     console.log("Mock API: Fetching releases...");
     await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
     // Return a copy to prevent direct modification of the mock store
     // Sort by release date descending
     return [...mockReleases].sort((a, b) => {
        const dateA = new Date(a.releaseDate as string).getTime();
        const dateB = new Date(b.releaseDate as string).getTime();
        return dateB - dateA;
     });
}


/**
 * Simulates uploading a new music release, including audio and artwork.
 * @param metadataBase - The metadata for the new release (without artwork URL).
 * @param audioFile - The audio file.
 * @param artworkFile - The artwork image file.
 * @returns A promise resolving to an object containing the ID and artwork URL of the newly created release.
 */
export async function uploadRelease(metadataBase: ReleaseMetadataBase, audioFile: File, artworkFile: File): Promise<{ id: string; artworkUrl: string }> {
    console.log("Mock API: Uploading release...", { metadataBase, audioFileName: audioFile.name, artworkFileName: artworkFile.name });
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate combined upload delay

    const newReleaseId = `release${nextReleaseId++}`;

    // Simulate generating the artwork URL *after* upload
    const finalArtworkUrl = `https://picsum.photos/seed/${newReleaseId}/200/200`;

    const newRelease: ReleaseWithId = {
        ...metadataBase,
        id: newReleaseId,
        artworkUrl: finalArtworkUrl, // Set the final artwork URL
        // Ensure date is stored as a string in 'yyyy-MM-dd' format
        releaseDate: metadataBase.releaseDate instanceof Date ? metadataBase.releaseDate.toISOString().split('T')[0] : metadataBase.releaseDate,
    };

    mockReleases.unshift(newRelease); // Add to the beginning of the array
    console.log("Mock API: Release uploaded with ID:", newReleaseId, "Artwork URL:", finalArtworkUrl);
    return { id: newReleaseId, artworkUrl: finalArtworkUrl };
}


/**
 * Simulates updating the metadata for an existing release.
 * @param releaseId - The ID of the release to update.
 * @param metadata - The *full* new metadata, including the potentially updated artworkUrl.
 * @returns A promise resolving when the update is complete.
 */
export async function updateReleaseMetadata(releaseId: string, metadata: ReleaseMetadata): Promise<void> {
    console.log(`Mock API: Updating metadata for release ${releaseId}...`, metadata);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate update delay

    const releaseIndex = mockReleases.findIndex(r => r.id === releaseId);
    if (releaseIndex !== -1) {
        // Overwrite the existing release data with the new metadata
        // Ensure the ID remains the same
        mockReleases[releaseIndex] = {
            ...metadata, // Spread the new metadata (includes title, artist, date, artworkUrl)
            id: releaseId, // Ensure the original ID is preserved
             // Ensure date is stored as a string
            releaseDate: metadata.releaseDate instanceof Date ? metadata.releaseDate.toISOString().split('T')[0] : metadata.releaseDate,
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
        console.error("Mock API: Release not found for removal:", releaseId);
        // Resolve silently as the item is already gone or never existed
    }
}
