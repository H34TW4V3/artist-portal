import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
    collection,
    where,
    query,
    limit,
    getDocs
  } from "firebase/firestore";
  import { app, db } from './firebase-config'; // Import initialized db
  import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import profile type

  /**
   * Fetches the public profile data for a specific user ID.
   * Uses the 'users/{userId}/publicProfile/profile' path.
   * NOTE: Requires the calling user to be authenticated and the owner of the profile
   * due to Firestore rules (`match /users/{userId}/{document=**}`).
   * @param uid - The user ID.
   * @returns A promise resolving to the ProfileFormValues or null if not found/error.
   */
  export async function getUserProfileByUid(uid: string): Promise<ProfileFormValues | null> {
    if (!uid) {
      console.error("getUserProfileByUid: Received null or empty UID.");
      return null; // Cannot fetch without a UID
    }
    console.log("getUserProfileByUid: Attempting to fetch profile for UID:", uid);

    // Correct path to the specific profile document within the subcollection
    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");

    try {
      const docSnap = await getDoc(profileDocRef);
      if (docSnap.exists()) {
        console.log("getUserProfileByUid: Profile data found for UID:", uid);
        // Cast data, ensuring it fits ProfileFormValues structure
        const data = docSnap.data() as ProfileFormValues;
        // Provide defaults for any potentially missing optional fields from older schemas
        const completeProfile: ProfileFormValues = {
            name: data.name || "User",
            email: data.email || "unknown",
            bio: data.bio || null,
            phoneNumber: data.phoneNumber || null,
            imageUrl: data.imageUrl || null,
            hasCompletedTutorial: data.hasCompletedTutorial || false,
            emailLinkSignInEnabled: data.emailLinkSignInEnabled || false, // Default to false if missing
        };
        return completeProfile;
      } else {
        // Profile sub-document might not exist even if the user document does.
        console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
        return null;
      }
    } catch (error) {
      console.error(`getUserProfileByUid: Error fetching user profile for UID ${uid}:`, error);
      // Rethrowing the error to be caught by the calling component
      throw new Error(`Failed to fetch user profile.`); // Simplified error message
    }
  }

  /**
   * Fetches the UID and potentially the public profile data for a specific user email.
   * Queries the 'users' collection (publicly readable via `get: true` rule) to find the UID.
   * Then attempts to fetch the profile from the 'publicProfile' subcollection using the found UID.
   * Requires an index on the 'email' field in the 'users' collection.
   * NOTE: Fetching the profile data itself (from the subcollection) will only succeed
   * if the currently authenticated user is the owner of the profile, due to Firestore rules.
   * This function is reliable for finding a UID by email, but profile data retrieval is restricted.
   * @param email - The user's email address.
   * @returns A promise resolving to an object with { uid, profile } or null if not found/error.
   *          The 'profile' property will be null if the profile sub-document doesn't exist
   *          or if the current user doesn't have permission to read it.
   */
  export async function getUserProfileByEmail(email: string): Promise<{ uid: string, profile: ProfileFormValues | null } | null> {
    if (!email) {
        console.error("getUserProfileByEmail: Received null or empty email.");
        return null;
    }
    console.log("getUserProfileByEmail: Querying for user with email:", email);
    // Query the root 'users' collection to find the document ID (UID) based on email
    const usersRef = collection(db, "users");
    // IMPORTANT: Firestore queries are case-sensitive by default. Ensure email is stored consistently (e.g., lowercase).
    const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id; // Get the UID from the document ID

        // Now use the UID to fetch the profile data from the subcollection
        console.log(`getUserProfileByEmail: Found UID ${userId} for email ${email}. Attempting to fetch profile...`);
        let profileData: ProfileFormValues | null = null;
        try {
            // Attempt to fetch profile, but expect it might fail due to permissions
            // if the current user is not the owner.
            profileData = await getUserProfileByUid(userId);
        } catch (profileFetchError: any) {
             // Log the error but don't fail the whole function, just return null profile
             console.warn(`getUserProfileByEmail: Could not fetch profile data for UID ${userId} (may be due to permissions):`, profileFetchError.message);
             profileData = null;
        }

        // Return both UID and profile data (or null if profile sub-doc doesn't exist or fetch failed)
        return { uid: userId, profile: profileData };

      } else {
        console.warn("getUserProfileByEmail: No user document found with email:", email);
        return null;
      }
    } catch (error) {
      console.error("getUserProfileByEmail: Error querying user by email:", error);
      throw new Error("Failed to query user profile by email.");
    }
  }


  /**
   * Creates or updates the public profile document for a user.
   * Uses the 'users/{userId}/publicProfile/profile' path.
   * NOTE: Requires the calling user to be authenticated and the owner of the profile
   * due to Firestore rules (`match /users/{userId}/{document=**}`).
   * @param uid - The user ID.
   * @param data - The profile data to set or merge. Includes all fields from ProfileFormValues.
   * @param merge - Whether to merge the data with existing document (true) or overwrite (false). Default is true.
   * @returns A promise resolving when the operation is complete.
   */
  export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
     if (!uid) {
       console.error("setPublicProfile: Received null or empty UID.");
       throw new Error("Cannot set profile without a user ID.");
     }
    // Correct path to the specific profile document within the subcollection
    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
    try {
      // Use setDoc with merge option to either create or update
      // Ensure all potentially optional fields are included, even if null/false
      const dataToSet: ProfileFormValues = {
         name: data.name,
         email: data.email,
         bio: data.bio ?? null,
         phoneNumber: data.phoneNumber ?? null,
         imageUrl: data.imageUrl ?? null,
         hasCompletedTutorial: data.hasCompletedTutorial ?? false,
         emailLinkSignInEnabled: data.emailLinkSignInEnabled ?? false, // Ensure this is included
      };
      await setDoc(profileDocRef, dataToSet, { merge: merge });
      console.log(`Public profile ${merge ? 'updated/merged' : 'created/overwritten'} successfully for UID:`, uid);
    } catch (error) {
      console.error("setPublicProfile: Error setting public profile:", error);
      throw new Error("Failed to update user profile.");
    }
  }