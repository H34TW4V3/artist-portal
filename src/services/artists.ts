
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

    const labelProfile = await getUserProfileByUid(labelUserId);
    if (!labelProfile) {
        console.warn(`Label user profile not found for UID: ${labelUserId}. Cannot fetch managed artists. Ensure this user exists and has a 'publicProfile/profile' document.`);
        return [];
    }
    // CRITICAL: Log the actual isLabel status from the fetched profile
    console.log(`Fetched label profile for ${labelUserId}: Name: '${labelProfile.name}', isLabel: ${labelProfile.isLabel}`);

    if (!labelProfile.isLabel) {
        console.warn(`User ${labelUserId} ('${labelProfile.name || 'N/A'}') is not marked as a label in their profile (isLabel: false). This is required to fetch managed artists. Please update their profile at '/users/${labelUserId}/publicProfile/profile' to include 'isLabel: true'.`);
        return [];
    }
     console.log(`Label user ${labelUserId} ('${labelProfile.name}') is correctly identified as a label (isLabel: true). Proceeding to query artists.`);

    const profilesCollectionGroupRef = collectionGroup(db, "publicProfile");
    const q = query(
        profilesCollectionGroupRef,
        where("managedByLabelId", "==", labelUserId),
        where("isLabel", "==", false)
    );

    try {
        const querySnapshot = await getDocs(q);
        const artists: ManagedArtist[] = [];

        if (querySnapshot.empty) {
            console.log(`No artist profiles found directly managed by label ${labelUserId} ('${labelProfile.name}'). This could be due to: 
1. No artists have 'managedByLabelId: "${labelUserId}"' and 'isLabel: false' in their '/users/{artistId}/publicProfile/profile' document.
2. Firestore rules are preventing the query (check collection group read permissions for 'publicProfile').
3. The required Firestore composite index for 'publicProfile' on fields 'managedByLabelId' (ASC) and 'isLabel' (ASC) is missing, disabled, or still building.`);
        }

        querySnapshot.forEach((profileDoc) => {
            const artistProfileData = profileDoc.data() as ProfileFormValues;
            const artistDocRef = profileDoc.ref.parent.parent; // Path: users/{userId}/publicProfile/profile -> users/{userId}
            
            if (!artistDocRef || artistDocRef.parent.id !== 'users') {
                 console.warn("Could not determine parent user document for profile:", profileDoc.ref.path, "Parent path:", artistDocRef?.path);
                 return;
            }
            const artistUid = artistDocRef.id;

            if (artistUid) {
                // Additional check for artist's isLabel status from the fetched document
                if (artistProfileData.isLabel === true) {
                    console.warn(`Profile ${profileDoc.ref.path} (UID: ${artistUid}) is marked as a label but was expected to be an artist (isLabel: false). Skipping.`);
                    return;
                }
                if (artistProfileData.managedByLabelId !== labelUserId) {
                     console.warn(`Profile ${profileDoc.ref.path} (UID: ${artistUid}) has managedByLabelId: ${artistProfileData.managedByLabelId}, which does not match querying label ${labelUserId}. Skipping. This should not happen if the query is correct.`);
                    return;
                }

                artists.push({
                    id: artistUid,
                    name: artistProfileData.name || artistUid,
                    email: artistProfileData.email || "N/A",
                });
            } else {
                console.warn("Found a profile managed by label but could not determine artist UID from path:", profileDoc.ref.path, artistProfileData);
            }
        });

        console.log(`Successfully fetched ${artists.length} managed artists for label ${labelUserId} ('${labelProfile.name}').`);
        return artists;
    } catch (error) {
        console.error("Error fetching managed artists from Firestore:", error);
        const firebaseError = error as any;
        if (firebaseError.code === 'permission-denied') {
            console.error(`Firestore Permission Denied in getManagedArtists for label ${labelUserId} ('${labelProfile.name}'). 
This means the security rules do not allow this label account to perform the collection group query on 'publicProfile' with 'managedByLabelId == "${labelUserId}"' and 'isLabel == false' filters, or to read the resulting documents. 
Key checks:
1. Ensure the label user's profile at '/users/${labelUserId}/publicProfile/profile' has 'isLabel: true'.
2. Ensure the security rule 'match /{path=**}/publicProfile/profile { allow list, get: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true; }' is active and correctly implemented.
3. Verify the Firestore composite index for the 'publicProfile' collection group on fields 'managedByLabelId' (ASC) AND 'isLabel' (ASC) exists and is enabled.
4. Double check that artists intended to be managed have 'managedByLabelId: "${labelUserId}"' AND 'isLabel: false' in their '/users/{artistId}/publicProfile/profile' document.`);
        } else if (firebaseError.code === 'failed-precondition') {
            console.error(`Firestore Query Error (Failed Precondition) in getManagedArtists for label ${labelUserId} ('${labelProfile.name}'). 
This VERY LIKELY means a required composite index is missing, disabled, or still building. 
Please CREATE or ENABLE the following Firestore composite index:
  Collection ID: 'publicProfile' (ensure this is a collection group query)
  Fields:
    1. 'managedByLabelId' (Ascending)
    2. 'isLabel' (Ascending)
Scope: Collection group`);
        }
        throw new Error(`Failed to fetch managed artists for label ${labelUserId}. Check console for details, Firestore security rules, and indexes.`);
    }
}
