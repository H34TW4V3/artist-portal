
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
 * Represents the metadata for a music release.
 */
export interface ReleaseMetadata {
  /** The title of the release. */
  title: string;
  /** The main artist name. */
  artist: string;
  /** URL of the cover artwork image. */
  artworkUrl: string;
  /** Release date in 'yyyy-MM-dd' format or Date object. */
  releaseDate: string | Date;
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
     return [...mockReleases].sort((a, b) => new Date(b.releaseDate as string).getTime() - new Date(a.releaseDate as string).getTime());
}


/**
 * Simulates uploading a new music release.
 * @param metadata - The metadata for the new release.
 * @param _audioFile - The audio file (unused in mock, but represents upload).
 * @returns A promise resolving to the ID of the newly created release.
 */
export async function uploadRelease(metadata: ReleaseMetadata, _audioFile: File): Promise<string> {
    console.log("Mock API: Uploading release...", metadata);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload delay

    const newReleaseId = `release${nextReleaseId++}`;
    const newRelease: ReleaseWithId = {
        ...metadata,
        id: newReleaseId,
        // Use a placeholder or generate a predictable URL for the mock artwork
        artworkUrl: `https://picsum.photos/seed/${newReleaseId}/200/200`, // Simulate initial artwork URL
        releaseDate: metadata.releaseDate instanceof Date ? metadata.releaseDate.toISOString().split('T')[0] : metadata.releaseDate, // Ensure date is string
    };

    mockReleases.unshift(newRelease); // Add to the beginning of the array
    console.log("Mock API: Release uploaded with ID:", newReleaseId);
    return newReleaseId;
}

/**
 * Simulates updating the metadata for an existing release.
 * @param releaseId - The ID of the release to update.
 * @param metadata - The new metadata. Should include potentially updated artworkUrl.
 * @returns A promise resolving when the update is complete.
 */
export async function updateReleaseMetadata(releaseId: string, metadata: ReleaseMetadata): Promise<void> {
    console.log(`Mock API: Updating metadata for release ${releaseId}...`, metadata);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate update delay

    const releaseIndex = mockReleases.findIndex(r => r.id === releaseId);
    if (releaseIndex !== -1) {
        // Update all provided metadata fields, including artworkUrl
        mockReleases[releaseIndex] = {
            ...mockReleases[releaseIndex], // Keep existing ID
            title: metadata.title,
            artist: metadata.artist,
            releaseDate: metadata.releaseDate instanceof Date ? metadata.releaseDate.toISOString().split('T')[0] : metadata.releaseDate, // Ensure date is string
            artworkUrl: metadata.artworkUrl // Update artwork URL from the provided metadata
        };
        console.log("Mock API: Metadata updated for release:", releaseId);
    } else {
        console.error("Mock API: Release not found for update:", releaseId);
        throw new Error(`Release with ID ${releaseId} not found.`);
    }
}

// Example function placeholder for separate artwork upload/update (if needed)
// This is now less necessary if updateReleaseMetadata handles the URL update
// export async function uploadArtworkForRelease(releaseId: string, artworkFile: File): Promise<string> {
//   console.log(`Mock API: Uploading new artwork for release ${releaseId}...`);
//   await new Promise(resolve => setTimeout(resolve, 1200));
//   const newArtworkUrl = `https://picsum.photos/seed/${releaseId}/${Date.now()}/200/200`; // Simulate new URL
//   console.log("Mock API: Artwork uploaded. New URL:", newArtworkUrl);
//   return newArtworkUrl; // Return the URL to be saved in metadata
// }


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
        // Depending on requirements, you might throw an error or resolve silently
        // throw new Error(`Release with ID ${releaseId} not found.`);
    }
}
