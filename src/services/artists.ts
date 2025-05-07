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
import { getUserProfileByUid } from "./user"; // Import getUserProfileByUid

export interface ManagedArtist {
    id: string; // UID of the artist
    name: string;
    email: string;
    // Add other relevant fields like imageUrl if needed for table display
}

/**
 * Fetches a list of artists managed by the current label user.
 * This function now queries based on the `managedByLabelId` field in the artist's `publicProfile/profile`.
 */
export async function getManagedArtists(labelUserId: string): Promise<ManagedArtist[]> {
    console.log("Fetching managed artists for label (Service):", labelUserId);

    const labelProfile = await getUserProfileByUid(labelUserId); // Use the more robust getUserProfileByUid
    if (!labelProfile) {
        console.warn(`Label user profile not found for UID: ${labelUserId}. Cannot fetch managed artists.`);
        // Consider throwing an error or returning an empty array based on how you want to handle this case.
        // For now, returning empty to prevent page crash if profile somehow missing after auth.
        return [];
    }
    if (!labelProfile.isLabel) {
        console.warn(`User ${labelUserId} (${labelProfile.name}) is not marked as a label in their profile. Cannot fetch managed artists.`);
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
        console.error("Error fetching managed artists from Firestore:", error);
        if ((error as any).code === 'permission-denied') {
            console.error("Firestore Permission Denied in getManagedArtists: This likely means the security rules do not allow the label account to query the 'publicProfile' collection group with the specified 'managedByLabelId' and 'isLabel' filters, or to read the resulting documents. Ensure your label account has 'isLabel: true' in its own profile, and artists have 'managedByLabelId' set correctly. Also, verify collection group indexes are set up and rules are correct.");
        } else if ((error as any).code === 'failed-precondition') {
            console.error("Firestore Query Error (Failed Precondition) in getManagedArtists: This often means a required composite index is missing or still building. Please verify your Firestore indexes for the 'publicProfile' collection group with fields 'managedByLabelId' (Ascending) AND 'isLabel' (Ascending).");
        }
        throw new Error("Failed to fetch managed artists. Check console for details, Firestore security rules, and indexes.");
    }
}
