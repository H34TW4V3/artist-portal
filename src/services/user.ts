
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    limit,
    doc,     // Import doc
    getDoc,  // Import getDoc
    setDoc, // Import setDoc for creating the profile doc if needed
} from "firebase/firestore";
import { db } from './firebase-config'; // Import initialized db
import type { ProfileFormValues } from '@/components/profile/profile-form'; // Import profile type

// Define the assumed document ID within the publicProfile subcollection
const PROFILE_DOC_ID = 'profile';

/**
 * Fetches a user's profile document from the /users/{userId}/publicProfile/profile path.
 * @param uid - The UID of the user to fetch.
 * @returns A promise resolving to the ProfileFormValues object if found, otherwise null.
 * @throws An error if there's an issue fetching the document.
 */
export async function getUserProfileByUid(uid: string): Promise<ProfileFormValues | null> {
    if (!uid) {
        console.warn("getUserProfileByUid: UID is required.");
        return null;
    }

    // Reference the specific document within the subcollection
    const profileDocRef = doc(db, "users", uid, "publicProfile", PROFILE_DOC_ID);

    try {
        const docSnap = await getDoc(profileDocRef); // Fetch the document

        if (!docSnap.exists()) {
            console.log(`No public profile document found for UID: ${uid} at path users/${uid}/publicProfile/${PROFILE_DOC_ID}`);
            // Optionally, you could try fetching from the root doc as a fallback or create the subcollection doc here if needed.
            // For now, return null if the specific subcollection doc doesn't exist.
            return null;
        }

        const userData = docSnap.data() as ProfileFormValues; // Cast data

        // Optionally, add Zod validation here

        console.log(`Fetched user profile for UID: ${uid} from publicProfile subcollection.`);
        return userData;

    } catch (error) {
        console.error("Error fetching user profile by UID from publicProfile:", error);
        throw new Error("Failed to fetch user profile by UID.");
    }
}


/**
 * Fetches a user's profile document from the /users/{userId}/publicProfile/profile path based on their email address.
 * First queries the root 'users' collection to find the userId associated with the email.
 * @param email - The email address of the user to fetch.
 * @returns A promise resolving to the ProfileFormValues object if found, otherwise null.
 * @throws An error if there's an issue querying Firestore or fetching the profile.
 */
export async function getUserProfileByEmail(email: string): Promise<ProfileFormValues | null> {
    if (!email) {
        console.warn("getUserProfileByEmail: Email address is required.");
        return null;
    }

    // 1. Query the root users collection to find the user ID by email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));
    let userId: string | null = null;

    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            userId = querySnapshot.docs[0].id;
        } else {
            console.log(`No root user document found for email: ${email}`);
            // Try fetching from auth directly as fallback? Unreliable.
            // For now, if root user doc isn't found by email, assume no profile.
            return null;
        }
    } catch (error) {
        console.error("Error finding user ID by email:", error);
        throw new Error("Failed to look up user by email.");
    }

    // 2. If userId found, fetch the profile from the subcollection using getUserProfileByUid
    if (userId) {
        console.log(`Found userId: ${userId} for email: ${email}. Fetching public profile...`);
        return await getUserProfileByUid(userId);
    } else {
        return null; // Should not happen if query succeeded but was empty, but good practice.
    }
}

/**
 * Creates or updates the user's public profile document.
 * @param userId The user's UID.
 * @param data The profile data to save.
 * @param merge Optional. Whether to merge data with existing document. Defaults to true.
 */
export async function setPublicProfile(userId: string, data: ProfileFormValues, merge = true): Promise<void> {
     if (!userId) throw new Error("User ID is required to set profile.");

     const profileDocRef = doc(db, "users", userId, "publicProfile", PROFILE_DOC_ID);
     try {
          await setDoc(profileDocRef, data, { merge });
          console.log(`Public profile for UID ${userId} successfully saved.`);
     } catch (error) {
          console.error(`Error setting public profile for UID ${userId}:`, error);
          throw new Error("Failed to save public profile.");
     }
}
