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
  import { getAuth } from "firebase/auth"; // Import getAuth
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
            email: data.email || "unknown", // Use Firestore email first
            bio: data.bio || null,
            phoneNumber: data.phoneNumber || null,
            imageUrl: data.imageUrl || null, // Use Firestore image URL first
            hasCompletedTutorial: data.hasCompletedTutorial || false,
            emailLinkSignInEnabled: data.emailLinkSignInEnabled || false,
        };

         // Fallback logic for name and imageUrl if Firestore is missing them but Auth has them
         if (!completeProfile.name || !completeProfile.imageUrl) {
             const auth = getAuth(app);
             const currentUser = auth.currentUser;
             if (currentUser?.uid === uid) { // Only fallback if fetching own profile
                if (!completeProfile.name) {
                    completeProfile.name = currentUser.displayName || currentUser.email?.split('@')[0] || "User";
                }
                if (!completeProfile.imageUrl) {
                    completeProfile.imageUrl = currentUser.photoURL || null;
                }
             }
         }


        return completeProfile;
      } else {
        // Profile sub-document might not exist even if the user document does.
        console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
        // If no profile doc, try falling back to Auth user data if fetching own profile
         const auth = getAuth(app);
         const currentUser = auth.currentUser;
         if (currentUser?.uid === uid) {
             console.log("getUserProfileByUid: Falling back to Auth data for current user.");
             return {
                 name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
                 email: currentUser.email || "unknown",
                 bio: null,
                 phoneNumber: null,
                 imageUrl: currentUser.photoURL || null,
                 hasCompletedTutorial: false, // Assume false if no profile doc
                 emailLinkSignInEnabled: false, // Assume false
             };
         }
        return null;
      }
    } catch (error: any) { // Catch specific Firestore errors
      console.error(`getUserProfileByUid: Error fetching user profile for UID ${uid}:`, error);
       if (error.code === 'permission-denied') {
           console.error("Firestore Permission Denied: Check your security rules for reading '/users/{userId}/publicProfile/profile'.");
           throw new Error(`Permission denied while fetching profile for ${uid}.`);
       }
       // Rethrowing a simplified error message for other errors
      throw new Error(`Failed to fetch user profile.`);
    }
  }

  /**
   * Fetches the UID for a specific user email by querying the root 'users' collection.
   * Requires an index on the 'email' field in the 'users' collection.
   * NOTE: This query requires the user to be authenticated based on the updated Firestore rules.
   * @param email - The user's email address.
   * @returns A promise resolving to the user's UID string or null if not found/error.
   */
  async function getUserUidByEmail(email: string): Promise<string | null> {
    if (!email) {
        console.error("getUserUidByEmail: Received null or empty email.");
        return null;
    }
     // Ensure user is authenticated before querying
     const auth = getAuth(app);
     if (!auth.currentUser) {
         console.error("getUserUidByEmail: Authentication required to query users by email.");
         // Optionally throw an error or return null depending on expected usage
         return null; // Returning null if called when not authenticated
     }

    console.log("getUserUidByEmail: Querying for user with email:", email);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id; // Get the UID from the document ID
        console.log(`getUserUidByEmail: Found UID ${userId} for email ${email}.`);
        return userId;
      } else {
        console.warn("getUserUidByEmail: No user document found with email:", email);
        return null;
      }
    } catch (error: any) {
      console.error("getUserUidByEmail: Error querying user by email:", error);
      if (error.code === 'permission-denied') {
          console.error("Firestore Permission Denied: Check your security rules for 'list' access on the 'users' collection based on email. Requires authentication.");
          throw new Error("Permission denied while querying users by email.");
      }
      throw new Error("Failed to query user by email.");
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
         email: data.email.toLowerCase(), // Store email in lowercase
         bio: data.bio ?? null,
         phoneNumber: data.phoneNumber ?? null,
         imageUrl: data.imageUrl ?? null,
         hasCompletedTutorial: data.hasCompletedTutorial ?? false,
         emailLinkSignInEnabled: data.emailLinkSignInEnabled ?? false,
      };
      await setDoc(profileDocRef, dataToSet, { merge: merge });
      console.log(`Public profile ${merge ? 'updated/merged' : 'created/overwritten'} successfully for UID:`, uid);

      // Also update the email field in the root user document for querying, if it has changed
       // Rule `allow write: if request.auth != null && request.auth.uid == userId;` on /users/{userId} should cover this.
       const rootUserDocRef = doc(db, "users", uid);
       // Use transaction or batch write if ensuring atomicity is critical
       // For simplicity, check and update separately here
       const rootDocSnap = await getDoc(rootUserDocRef);
        if (!rootDocSnap.exists() || rootDocSnap.data()?.email !== data.email.toLowerCase()) {
           await setDoc(rootUserDocRef, { email: data.email.toLowerCase() }, { merge: true });
           console.log(`Root user document email field updated for UID: ${uid}`);
        }

    } catch (error) {
      console.error("setPublicProfile: Error setting public profile:", error);
      throw new Error("Failed to update user profile.");
    }
  }