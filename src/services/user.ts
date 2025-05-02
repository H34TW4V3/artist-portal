
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
   * @param uid - The user ID.
   * @returns A promise resolving to the ProfileFormValues or null if not found/error.
   */
  export async function getUserProfileByUid(uid: string): Promise<ProfileFormValues | null> {
    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile"); // Updated path
    try {
      const docSnap = await getDoc(profileDocRef);
      if (docSnap.exists()) {
        console.log("getUserProfileByUid: Profile data found for UID:", uid);
        // Ensure date fields are converted if they exist (example)
        const data = docSnap.data() as ProfileFormValues;
        // if (data.someDate && data.someDate instanceof Timestamp) {
        //   data.someDate = data.someDate.toDate();
        // }
        return data;
      } else {
        console.log("getUserProfileByUid: No public profile found for UID:", uid);
        return null;
      }
    } catch (error) {
      console.error("getUserProfileByUid: Error fetching user profile:", error);
      throw new Error("Failed to fetch user profile by UID."); // Rethrow specific error
    }
  }

  /**
   * Fetches the public profile data for a specific user email.
   * Queries the main 'users' collection for the email field.
   * Assumes profile data is stored directly under 'users/{userId}'.
   * !! Important: This requires an index on the 'email' field in the 'users' collection. !!
   * !! And assumes the public profile is stored at the root user doc, not subcollection !!
   * !! Adjust path if using subcollection like getUserProfileByUid !!
   * @param email - The user's email address.
   * @returns A promise resolving to the ProfileFormValues or null if not found/error.
   */
  export async function getUserProfileByEmail(email: string): Promise<ProfileFormValues | null> {
    // **ASSUMPTION**: Querying the root 'users' collection for a direct 'email' field.
    // If profile is in subcollection, this needs a different approach (Cloud Function or duplicating email).
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        // **ASSUMPTION**: Profile data is at userDoc.data(). Adjust if it's in a subcollection.
        // If using the subcollection structure:
        // const profileData = await getUserProfileByUid(userDoc.id);
        // return profileData;

        // If data is directly on user doc:
         const data = userDoc.data();
         // Fetch the subcollection data using UID
         const profileData = await getUserProfileByUid(userDoc.id);
         if (profileData) {
             console.log("getUserProfileByEmail: Profile data found for email:", email);
             return profileData;
         } else {
             // User doc exists, but profile subcollection doc doesn't (edge case)
             console.log("getUserProfileByEmail: User found, but no public profile sub-document for email:", email);
             return null;
         }

      } else {
        console.log("getUserProfileByEmail: No user found with email:", email);
        return null;
      }
    } catch (error) {
      console.error("getUserProfileByEmail: Error fetching user profile by email:", error);
      throw new Error("Failed to fetch user profile by email."); // Rethrow specific error
    }
  }


  /**
   * Creates or updates the public profile document for a user.
   * Uses the 'users/{userId}/publicProfile/profile' path.
   * @param uid - The user ID.
   * @param data - The profile data to set or merge.
   * @param merge - Whether to merge the data with existing document (true) or overwrite (false).
   * @returns A promise resolving when the operation is complete.
   */
  export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile"); // Updated path
    try {
      await setDoc(profileDocRef, data, { merge: merge });
      console.log(`Public profile ${merge ? 'updated' : 'created'} successfully for UID:`, uid);
    } catch (error) {
      console.error("setPublicProfile: Error setting public profile:", error);
      throw new Error("Failed to update user profile.");
    }
  }
