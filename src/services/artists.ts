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
 * Fetches a list of artists potentially managed by the current label user.
 *
 * IMPORTANT: This function currently queries a limited set of *all* users and then filters them.
 * This is NOT scalable or performant for a large user base.
 * For production, a more direct linking mechanism between labels and artists is essential, such as:
 *   - An 'artists' subcollection under the label's user document.
 *   - A 'managedByLabelId' field in each artist's profile.
 *
 * The Firestore security rules should be updated to support this:
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *
 *     // Rule for the root user document
 *     match /users/{userId} {
 *       allow get: if request.auth != null; // Allows fetching a user doc by ID (e.g., to check if they are a label)
 *       allow list: if false; // IMPORTANT: Disallow listing all users for security & performance
 *       allow create, update, delete: if request.auth != null && request.auth.uid == userId;
 *     }
 *
 *     // Rule for the publicProfile subcollection
 *     match /users/{targetUserId}/publicProfile/profile {
 *       // Allow owner to read/write their own profile
 *       allow read, write: if request.auth != null && request.auth.uid == targetUserId;
 *
 *       // Allow an authenticated user (the label) to READ an artist's profile IF:
 *       // 1. The requesting user (label) has `isLabel == true` in their own publicProfile.
 *       // 2. The target user (artist) has `isLabel == false` (or isLabel does not exist) in their publicProfile.
 *       allow get: if request.auth != null &&
 *                    get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
 *                    (resource.data.isLabel == false || !('isLabel' in resource.data));
 *     }
 *
 *     // Example: Rule for a dedicated 'managedArtists' subcollection under a label's document
 *     // match /users/{labelUserId}/managedArtists/{artistDocId} {
 *     //   allow read, write: if request.auth != null && request.auth.uid == labelUserId &&
 *     //                        get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true;
 *     // }
 *
 *     match /users/{userId}/releases/{releaseId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *
 *     match /users/{userId}/events/{eventId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *   }
 * }
 */
export async function getManagedArtists(labelUserId: string): Promise<ManagedArtist[]> {
    console.log("Fetching managed artists for label:", labelUserId);

    // First, verify the requesting user is indeed a label
    const labelProfile = await getCurrentLabelUserProfile(labelUserId);
    if (!labelProfile || !labelProfile.isLabel) {
        console.warn(`User ${labelUserId} is not a label or profile not found. Cannot fetch managed artists.`);
        return [];
    }

    // Query for potential artists (THIS IS THE INEFFICIENT PART that needs a data model change for production)
    // For now, we fetch a limited number of all users and then filter.
    // This query WILL LIKELY FAIL if Firestore rules disallow listing /users collection.
    // The permission error likely comes from trying to read the publicProfile of these listed users.
    const usersRef = collection(db, "users");
    const q = query(usersRef, limit(20)); // Limiting for now

    try {
        const querySnapshot = await getDocs(q);
        const artists: ManagedArtist[] = [];

        for (const userDoc of querySnapshot.docs) {
            // Don't list the label itself as a managed artist
            if (userDoc.id === labelUserId) continue;

            // Fetch the publicProfile for each potential artist
            // This is where the permission error might occur if rules are not set up correctly.
            const artistProfileDocRef = doc(db, "users", userDoc.id, "publicProfile", "profile");
            const artistProfileSnap = await getDoc(artistProfileDocRef);

            if (artistProfileSnap.exists()) {
                const artistProfileData = artistProfileSnap.data() as ProfileFormValues;
                // Only add if the user is NOT a label (i.e., they are an artist)
                if (artistProfileData.isLabel === undefined || artistProfileData.isLabel === false) {
                    artists.push({
                        id: userDoc.id,
                        name: artistProfileData.name || userDoc.id, // Fallback to ID if name is missing
                        email: artistProfileData.email || "N/A",   // Fallback for email
                    });
                }
            } else {
                // If no publicProfile, we can't determine if they are an artist or their details. Skip.
                console.log(`No publicProfile found for user ${userDoc.id}. Skipping.`);
            }
        }
        console.log(`Fetched ${artists.length} managed artists for label ${labelUserId}.`);
        return artists;
    } catch (error) {
        console.error("Error fetching managed artists:", error);
        if ((error as any).code === 'permission-denied') {
            console.error("Firestore Permission Denied: This likely means the security rules do not allow the label account to read the publicProfile of other users, or to list the /users collection itself. Review the rules in artists.ts comments.");
        }
        throw new Error("Failed to fetch managed artists. Check console for details and Firestore security rules.");
    }
}
