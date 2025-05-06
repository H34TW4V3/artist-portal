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
 *
 * Firestore Rules Prerequisite:
 * The Firestore security rules MUST allow the label user (request.auth.uid) to query the
 * `users/{artistId}/publicProfile/profile` collection where `managedByLabelId == request.auth.uid`.
 *
 * Example relevant rule for `/users/{targetUserId}/publicProfile/profile`:
 *   allow list: if request.auth != null &&
 *                 get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true;
 *   // (This allows a label to list profiles, which is needed for the `where` clause on `managedByLabelId`.
 *   //  Further refinement can be done to only allow listing if the query contains `managedByLabelId == request.auth.uid`)
 *   allow get: if request.auth != null && (
 *                request.auth.uid == targetUserId ||
 *                (get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
 *                 resource.data.managedByLabelId == request.auth.uid &&
 *                 (resource.data.isLabel == false || !('isLabel' in resource.data)))
 *              );
 */
export async function getManagedArtists(labelUserId: string): Promise<ManagedArtist[]> {
    console.log("Fetching managed artists for label:", labelUserId);

    const labelProfile = await getCurrentLabelUserProfile(labelUserId);
    if (!labelProfile || !labelProfile.isLabel) {
        console.warn(`User ${labelUserId} is not a label or profile not found. Cannot fetch managed artists.`);
        return [];
    }

    // Query the `publicProfile` subcollection across all users, filtering by `managedByLabelId`.
    // This requires a collection group index on `publicProfile` collection for the `managedByLabelId` field.
    // In Firebase console: Firestore Database > Indexes > Composite > Add Index
    // Collection ID: publicProfile, Fields: managedByLabelId (Ascending), Query scope: Collection group
    const profilesRef = collectionGroup(db, "publicProfile");
    const q = query(profilesRef, where("managedByLabelId", "==", labelUserId), where("isLabel", "==", false));

    try {
        const querySnapshot = await getDocs(q);
        const artists: ManagedArtist[] = [];

        querySnapshot.forEach((profileDoc) => {
            const artistProfileData = profileDoc.data() as ProfileFormValues;
            // The parent document's ID is the artist's UID
            const artistUid = profileDoc.ref.parent.parent?.id;

            if (artistUid) {
                artists.push({
                    id: artistUid,
                    name: artistProfileData.name || artistUid, // Fallback to ID if name is missing
                    email: artistProfileData.email || "N/A",   // Fallback for email
                });
            } else {
                console.warn("Found a profile managed by label but could not determine artist UID:", profileDoc.id, artistProfileData);
            }
        });

        console.log(`Fetched ${artists.length} managed artists for label ${labelUserId}.`);
        return artists;
    } catch (error) {
        console.error("Error fetching managed artists:", error);
        if ((error as any).code === 'permission-denied') {
            console.error("Firestore Permission Denied: This likely means the security rules do not allow the label account to query the 'publicProfile' collection group with the specified 'managedByLabelId' and 'isLabel' filters, or to read the resulting documents. Ensure collection group indexes are set up and rules are correct.");
        } else if ((error as any).code === 'failed-precondition') {
            console.error("Firestore Query Error (Failed Precondition): This often means a required composite index is missing. Please check your Firestore indexes for a collection group 'publicProfile' with fields 'managedByLabelId' (Ascending) AND 'isLabel' (Ascending).");
        }
        throw new Error("Failed to fetch managed artists. Check console for details, Firestore security rules, and indexes.");
    }
}


// Helper function to get the 'publicProfile' collection group reference
// This is needed because collectionGroup query is not directly available in the modular SDK's main 'collection' function.
// We need to import it specifically.
import { collectionGroup } from "firebase/firestore";
