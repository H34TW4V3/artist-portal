"use server"; // Mark this file as server-side only

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
} from "firebase/firestore";
import { db } from './firebase-config'; // Assuming db is exported from firebase-config
import type { ReleaseMetadata, ReleaseWithId } from './music-platform'; // Import types

// Firestore instance
// const db = getFirestore(app); // This is already done in firebase-config.ts

/**
 * Fetches all releases for a specific artist ID.
 * This function is intended to be used by a label managing multiple artists.
 * It queries the 'releases' collection under the specified artist's user document.
 * @param artistUserId - The UID of the artist whose releases are to be fetched.
 * @returns A promise resolving to an array of ReleaseWithId objects.
 */
export async function getReleasesForArtist(artistUserId: string): Promise<ReleaseWithId[]> {
    if (!artistUserId) {
        console.warn("getReleasesForArtist: artistUserId is missing.");
        return [];
    }

    console.log(`Fetching releases for artist ID (server action): ${artistUserId}`);
    const releasesRef = collection(db, "users", artistUserId, "releases");
    // Order by releaseDate descending, then by createdAt descending as a tie-breaker
    const q = query(releasesRef, orderBy("releaseDate", "desc"), orderBy("createdAt", "desc"));

    try {
        const querySnapshot = await getDocs(q);
        const releases: ReleaseWithId[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as ReleaseMetadata;
            releases.push({ id: docSnap.id, ...data });
        });
        console.log(`Fetched ${releases.length} releases for artist ${artistUserId} via server action.`);
        return releases;
    } catch (error) {
        console.error(`Error fetching releases for artist ${artistUserId} (server action):`, error);
        // In a real app, you might want to throw a more specific error or handle it
        throw new Error(`Failed to fetch releases for artist ${artistUserId}.`);
    }
}

// Note: `removeRelease` can remain in `music-platform.ts` if it continues to use `getCurrentUserId()`
// for a user deleting their *own* releases. If a label needs to delete an artist's release,
// a new server action `removeReleaseForArtist(artistId, releaseId)` would be needed here,
// ensuring appropriate permissions checks (e.g., is the current user the label managing this artist?).
// For now, we assume `removeRelease` in `music-platform.ts` handles the current user's own releases.
