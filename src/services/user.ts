
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    limit,
    doc,     // Import doc
    getDoc,  // Import getDoc
} from "firebase/firestore";
import { db } from './firebase-config'; // Import initialized db
import type { ProfileFormValues } from '@/components/profile/profile-form'; // Import profile type

/**
 * Fetches a user's profile document from the 'users' collection based on their email address.
 * @param email - The email address of the user to fetch.
 * @returns A promise resolving to the ProfileFormValues object if found, otherwise null.
 * @throws An error if there's an issue querying Firestore.
 */
export async function getUserProfileByEmail(email: string): Promise<ProfileFormValues | null> {
    if (!email) {
        console.warn("getUserProfileByEmail: Email address is required.");
        return null;
    }

    const usersRef = collection(db, "users");
    // Query the 'users' collection where the 'email' field matches the provided email
    const q = query(usersRef, where("email", "==", email), limit(1));

    try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No user profile found for email: ${email}`);
            return null; // No document found with that email
        }

        // Assuming email is unique, there should only be one document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as ProfileFormValues; // Cast data

        // Optionally, you could add validation here using Zod if needed

        console.log(`Fetched user profile for email: ${email}`);
        return userData;

    } catch (error) {
        console.error("Error fetching user profile by email:", error);
        // Rethrow or handle as appropriate for your application
        throw new Error("Failed to fetch user profile.");
    }
}

/**
 * Fetches a user's profile document from the 'users' collection based on their UID.
 * @param uid - The UID of the user to fetch.
 * @returns A promise resolving to the ProfileFormValues object if found, otherwise null.
 * @throws An error if there's an issue fetching the document.
 */
export async function getUserProfileByUid(uid: string): Promise<ProfileFormValues | null> {
    if (!uid) {
        console.warn("getUserProfileByUid: UID is required.");
        return null;
    }

    const userDocRef = doc(db, "users", uid); // Create a DocumentReference

    try {
        const docSnap = await getDoc(userDocRef); // Fetch the document

        if (!docSnap.exists()) {
            console.log(`No user profile found for UID: ${uid}`);
            return null; // Document doesn't exist
        }

        const userData = docSnap.data() as ProfileFormValues; // Cast data

        // Optionally, add Zod validation here

        console.log(`Fetched user profile for UID: ${uid}`);
        return userData;

    } catch (error) {
        console.error("Error fetching user profile by UID:", error);
        throw new Error("Failed to fetch user profile by UID.");
    }
}
