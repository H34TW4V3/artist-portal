
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
    // Correct path to the specific profile document within the subcollection
    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
    try {
      const docSnap = await getDoc(profileDocRef);
      if (docSnap.exists()) {
        console.log("getUserProfileByUid: Profile data found for UID:", uid);
        // Cast data, assuming structure matches ProfileFormValues
        const data = docSnap.data() as ProfileFormValues;
        // Potentially handle Timestamp conversion if needed, though ProfileFormValues seems basic for now
        // Example: if (data.createdAt && data.createdAt instanceof Timestamp) data.createdAt = data.createdAt.toDate();
        return data;
      } else {
        console.log("getUserProfileByUid: No public profile document found for UID:", uid);
        return null;
      }
    } catch (error) {
      console.error("getUserProfileByUid: Error fetching user profile:", error);
      // Throw a more specific error or handle it based on application needs
      throw new Error("Failed to fetch user profile by UID.");
    }
  }

  /**
   * Fetches the public profile data for a specific user email.
   * First queries the 'users' collection to find the UID associated with the email.
   * Then uses the UID to fetch the profile from the 'publicProfile' subcollection.
   * Requires an index on the 'email' field in the 'users' collection.
   * @param email - The user's email address.
   * @returns A promise resolving to the ProfileFormValues or null if not found/error.
   */
  export async function getUserProfileByEmail(email: string): Promise<ProfileFormValues | null> {
    // Query the root 'users' collection to find the document ID (UID) based on email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id; // Get the UID from the document ID

        // Now use the UID to fetch the profile data from the subcollection
        console.log(`getUserProfileByEmail: Found UID ${userId} for email ${email}. Fetching profile...`);
        const profileData = await getUserProfileByUid(userId); // Reuse the UID-based fetcher
        if (profileData) {
             console.log("getUserProfileByEmail: Profile data found for email:", email);
             return profileData;
        } else {
             // User doc exists, but profile subcollection doc might not (edge case/initial setup)
             console.log("getUserProfileByEmail: User found, but no public profile sub-document for email:", email);
             return null;
        }
      } else {
        console.log("getUserProfileByEmail: No user document found with email:", email);
        return null;
      }
    } catch (error) {
      console.error("getUserProfileByEmail: Error fetching user profile by email:", error);
      throw new Error("Failed to fetch user profile by email.");
    }
  }


  /**
   * Creates or updates the public profile document for a user.
   * Uses the 'users/{userId}/publicProfile/profile' path.
   * @param uid - The user ID.
   * @param data - The profile data to set or merge.
   * @param merge - Whether to merge the data with existing document (true) or overwrite (false). Default is true.
   * @returns A promise resolving when the operation is complete.
   */
  export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
    // Correct path to the specific profile document within the subcollection
    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
    try {
      // Use setDoc with merge option to either create or update
      await setDoc(profileDocRef, data, { merge: merge });
      console.log(`Public profile ${merge ? 'updated/merged' : 'created/overwritten'} successfully for UID:`, uid);
    } catch (error) {
      console.error("setPublicProfile: Error setting public profile:", error);
      throw new Error("Failed to update user profile.");
    }
  }
