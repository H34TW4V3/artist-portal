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
    collectionGroup, // Import collectionGroup
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

// Helper function to get current user's profile - specific to this service for clarity
async function getCurrentLabelUserProfile(labelUserId: string): Promise<ProfileFormValues | null> {
    const profileDocRef = doc(db, "users", labelUserId, "publicProfile", "profile");
    const profileSnap = await getDoc(profileDocRef);
    if (profileSnap.exists()) {
        return profileSnap.data() as ProfileFormValues;
    }
    return null;
}


/**
 * Fetches a list of artists managed by the current label user.
 * This function now queries based on the `managedByLabelId` field in the artist's `publicProfile/profile`.
 */
export async function getManagedArtists(labelUserId: string): Promise<ManagedArtist[]> {
    console.log("Fetching managed artists for label (Service):", labelUserId);

    const labelProfile = await getCurrentLabelUserProfile(labelUserId);
    if (!labelProfile || !labelProfile.isLabel) {
        console.warn(`User ${labelUserId} is not a label or profile not found. Cannot fetch managed artists.`);
        return [];
    }

    // Query the `publicProfile` collection group, filtering by `managedByLabelId`.
    // This requires a collection group index on `publicProfile` for `managedByLabelId` and `isLabel`.
    const profilesCollectionGroupRef = collectionGroup(db, "publicProfile");
    const q = query(
        profilesCollectionGroupRef,
        where("managedByLabelId", "==", labelUserId),
        where("isLabel", "==", false) // Ensure we only get artists, not other labels
    );

    try {
        const querySnapshot = await getDocs(q);
        const artists: ManagedArtist[] = [];

        querySnapshot.forEach((profileDoc) => {
            const artistProfileData = profileDoc.data() as ProfileFormValues;
            // The parent document's ID is the artist's UID.
            // The path to a document in a collection group is like 'users/{userId}/publicProfile/{profileDocId}'
            // So profileDoc.ref.parent gives 'publicProfile', and profileDoc.ref.parent.parent gives 'users/{userId}'
            const artistUid = profileDoc.ref.parent.parent?.id;

            if (artistUid) {
                artists.push({
                    id: artistUid,
                    name: artistProfileData.name || artistUid, // Fallback to ID if name is missing
                    email: artistProfileData.email || "N/A",   // Fallback for email
                });
            } else {
                console.warn("Found a profile managed by label but could not determine artist UID from path:", profileDoc.ref.path, artistProfileData);
            }
        });

        console.log(`Fetched ${artists.length} managed artists for label ${labelUserId}.`);
        return artists;
    } catch (error) {
        console.error("Error fetching managed artists:", error);
        if ((error as any).code === 'permission-denied') {
            console.error("Firestore Permission Denied in getManagedArtists: This likely means the security rules do not allow the label account to query the 'publicProfile' collection group with the specified 'managedByLabelId' and 'isLabel' filters, or to read the resulting documents. Double-check your rules and ensure the composite index is active.");
        } else if ((error as any).code === 'failed-precondition') {
            console.error("Firestore Query Error (Failed Precondition) in getManagedArtists: This often means a required composite index is missing or still building. Please verify your Firestore indexes for the 'publicProfile' collection group with fields 'managedByLabelId' (Ascending) AND 'isLabel' (Ascending).");
        }
        throw new Error("Failed to fetch managed artists. Check console for details, Firestore security rules, and indexes.");
    }
}
