
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
        console.warn(`Label user profile not found for UID: ${labelUserId}. Cannot fetch managed artists. Ensure this user exists and has a 'publicProfile/profile' document.`);
        return [];
    }
    if (!labelProfile.isLabel) {
        console.warn(`User ${labelUserId} (${labelProfile.name || 'N/A'}) is not marked as a label in their profile (isLabel: false). Cannot fetch managed artists. Ensure 'isLabel: true' is set in their 'publicProfile/profile' document.`);
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

        if (querySnapshot.empty) {
            console.log(`No artist profiles found managed by label ${labelUserId} (${labelProfile.name}). This could be due to: 1. No artists assigned to this label. 2. Artists' 'managedByLabelId' or 'isLabel' fields are incorrect. 3. Firestore rules preventing access. 4. Missing/incorrect Firestore composite index for collection group 'publicProfile' on fields 'managedByLabelId' and 'isLabel'.`);
        }

        querySnapshot.forEach((profileDoc) => {
            // The path to a document in a collection group is like 'users/{userId}/publicProfile/{profileDocId}'
            // So profileDoc.ref.parent gives 'publicProfile' collection reference,
            // and profileDoc.ref.parent.parent gives the 'users/{userId}' document reference.
            const userDocRef = profileDoc.ref.parent.parent;
            if (!userDocRef || userDocRef.parent.id !== 'users') { // Check if parent is indeed 'users' collection
                console.warn("Could not determine parent user document for profile:", profileDoc.ref.path, "Parent path:", userDocRef?.path);
                return;
            }
            const artistUid = userDocRef.id;
            const artistProfileData = profileDoc.data() as ProfileFormValues;


            if (artistUid) {
                artists.push({
                    id: artistUid,
                    name: artistProfileData.name || artistUid, // Fallback to ID if name is missing
                    email: artistProfileData.email || "N/A",   // Fallback for email
                });
            } else {
                // This case should be rare given the check above, but good to have.
                console.warn("Found a profile managed by label but could not determine artist UID from path:", profileDoc.ref.path, artistProfileData);
            }
        });

        console.log(`Fetched ${artists.length} managed artists for label ${labelUserId} (${labelProfile.name}).`);
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

