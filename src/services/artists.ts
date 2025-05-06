import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    Timestamp,
    orderBy,
    limit,
    getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app, db } from './firebase-config';
import type { ProfileFormValues } from "@/components/profile/profile-form";

export interface ManagedArtist {
    id: string; // UID of the artist
    name: string;
    email: string;
    // Add other relevant fields like imageUrl if needed for table display
}

const getCurrentUserId = (): string => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user || !user.uid) {
        throw new Error("Authentication required. Please log in.");
    }
    return user.uid;
};

/**
 * Fetches a list of artists managed by the current label user.
 * This is a placeholder implementation. In a real scenario, you'd have a way
 * to link artists to labels (e.g., an 'artists' subcollection under the label's user doc,
 * or a 'managedByLabel' field in the artist's profile).
 * For now, it will fetch a few test users or all users if no specific linking mechanism exists.
 *
 * IMPORTANT: Querying all users and then filtering client-side is NOT scalable or secure for production.
 * A proper linking mechanism is required.
 */
export async function getManagedArtists(labelUserId: string): Promise<ManagedArtist[]> {
    console.log("Fetching managed artists for label:", labelUserId);
    // Placeholder: In a real system, you'd query artists linked to this label.
    // For demonstration, let's fetch a few users.
    // This query needs to be adjusted based on your actual data structure for linking artists to labels.
    // e.g., if artists have a `managedByLabelId` field:
    // const artistsRef = collection(db, "users");
    // const q = query(artistsRef, where("managedByLabelId", "==", labelUserId), limit(20));

    // For now, let's assume we fetch all user profiles and filter (NOT FOR PRODUCTION)
    // Or, ideally, the label user doc would have a subcollection of `managedArtistIds`
    const usersRef = collection(db, "users");
    const q = query(usersRef, limit(10)); // Limiting for now to avoid fetching everyone

    try {
        const querySnapshot = await getDocs(q);
        const artists: ManagedArtist[] = [];

        for (const userDoc of querySnapshot.docs) {
            // We only want to list *other* users as "managed" artists, not the label itself
            if (userDoc.id === labelUserId) continue;

            const profileDocRef = doc(db, "users", userDoc.id, "publicProfile", "profile");
            const profileSnap = await getDoc(profileDocRef);

            if (profileSnap.exists()) {
                const profileData = profileSnap.data() as ProfileFormValues;
                 // We only want to list users who are NOT labels themselves (i.e., individual artists)
                if (!profileData.isLabel) {
                    artists.push({
                        id: userDoc.id,
                        name: profileData.name || userDoc.id,
                        email: profileData.email || "N/A",
                    });
                }
            } else {
                // If publicProfile/profile doesn't exist, try getting basic info from user doc
                // This part depends on what's in the root user doc
                const userData = userDoc.data();
                 // Check if this root user doc represents a label itself. We want to list artists, not other labels.
                 // This assumes 'isLabel' might also be on the root doc for quick filtering.
                 // The primary check should be in the publicProfile, but this can be a fallback.
                if (userData && (userData.isLabel === undefined || userData.isLabel === false)) {
                    artists.push({
                        id: userDoc.id,
                        name: userData.name || userData.displayName || userDoc.id,
                        email: userData.email || "N/A",
                    });
                }
            }
        }
        console.log(`Fetched ${artists.length} potential managed artists for label ${labelUserId}`);
        // In a real app, further filter these artists if they are specifically linked to the label
        return artists;
    } catch (error) {
        console.error("Error fetching managed artists:", error);
        throw new Error("Failed to fetch managed artists.");
    }
}
