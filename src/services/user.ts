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
   * NOTE: Assumes Firestore rules allow reading this path for authenticated users.
   * @param uid - The user ID.
   * @returns A promise resolving to the ProfileFormValues or null if not found/error.
   */
  export async function getUserProfileByUid(uid: string): Promise<ProfileFormValues | null> {
    if (!uid) {
      console.error("getUserProfileByUid: Received null or empty UID.");
      return null; // Cannot fetch without a UID
    }
    console.log("getUserProfileByUid: Attempting to fetch profile for UID:", uid);

    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");

    try {
      const docSnap = await getDoc(profileDocRef);
      if (docSnap.exists()) {
        console.log("getUserProfileByUid: Profile data found for UID:", uid);
        // Cast data, ensuring it fits ProfileFormValues structure
        const data = docSnap.data() as Partial<ProfileFormValues>; // Use Partial initially

        // Provide defaults and ensure all fields exist
        const completeProfile: ProfileFormValues = {
            name: data.name || "User",
            email: data.email || "unknown", // Use Firestore email first
            bio: data.bio || null,
            phoneNumber: data.phoneNumber || null,
            imageUrl: data.imageUrl || null, // Use Firestore image URL first
            hasCompletedTutorial: data.hasCompletedTutorial || false,
            emailLinkSignInEnabled: data.emailLinkSignInEnabled || false,
        };

         // Fallback logic for name, email, and imageUrl if Firestore is missing them but Auth has them
         const auth = getAuth(app);
         const currentUser = auth.currentUser;
         if (currentUser?.uid === uid) { // Only fallback if fetching own profile
            if (!data.name && currentUser.displayName) {
                completeProfile.name = currentUser.displayName;
            }
            // Only fallback email if Firestore email is missing or 'unknown'
            if ((!data.email || data.email === "unknown") && currentUser.email) {
                 completeProfile.email = currentUser.email;
            }
            if (!data.imageUrl && currentUser.photoURL) {
                completeProfile.imageUrl = currentUser.photoURL;
            }
         }
         // Final fallback if name is still missing
         if (!completeProfile.name) {
            completeProfile.name = completeProfile.email?.split('@')[0] || 'User';
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
      throw new Error("Failed to fetch user profile.");
    }
  }

 /**
   * Fetches the user UID and minimal public profile data (email, name, imageUrl) for a specific user email.
   * Queries the root 'users' collection by email.  Explicitly only requests the 'email' and 'uid' fields (and name/imageUrl if they exist).
   * NOTE: Requires Firestore rules to allow authenticated users to query the 'users' collection by email and retrieve selected fields.
   * @param email - The user's email address.
   * @returns A promise resolving to an object { uid: string, profile: { email: string, name: string | null, imageUrl: string | null } | null } or null if not found/error.
   */
 export async function getUserProfileByEmail(email: string): Promise<{ uid: string; profile: { email: string; name: string | null; imageUrl: string | null } | null } | null> {
     if (!email) {
         console.error("getUserProfileByEmail: Received null or empty email.");
         return null;
     }

     console.log("getUserProfileByEmail: Querying for user with email:", email);
     const usersRef = collection(db, "users");
     // To project data, create a query with the fields you need.
     const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));

     try {
         const querySnapshot = await getDocs(q);
         if (!querySnapshot.empty) {
             const userDoc = querySnapshot.docs[0];
             const userId = userDoc.id;
             const userData = userDoc.data() as { email: string; uid?: string; name?: string; imageUrl?: string }; // Expect email and uid, maybe name/imageUrl

             console.log(`getUserProfileByEmail: Found UID ${userId} for email ${email}. Data:`, userData);

             // Create the profile object, ensuring email is always present. Other fields can be null if missing
             const profile = {
                 email: userData.email,
                 name: userData.name || null,
                 imageUrl: userData.imageUrl || null
             };

             return { uid: userId, profile: profile };
         } else {
             console.warn("getUserProfileByEmail: No user document found with email:", email);
             return null;
         }
     } catch (error: any) {
         console.error("getUserProfileByEmail: Error querying user by email:", error);
         // Log specific Firestore error codes if available
         if (error.code === 'permission-denied') {
             // Be more explicit about which rule failed
             console.error("Firestore Permission Denied: Check your security rules allow authenticated users to query the 'users' collection by email AND project specific fields (email, uid, name, imageUrl).");
             throw new Error("Failed to fetch user profile due to permissions. Please check Firestore rules.");
         } else {
             throw new Error("Failed to fetch user profile by email.");
         }
     }
 }

  /**
   * Creates or updates the public profile document and the root user document for email querying.
   * Ensures both the root document (with email) and the profile sub-document exist.
   * NOTE: Requires the calling user to be authenticated and the owner of the profile/document
   * due to Firestore rules.
   * @param uid - The user ID.
   * @param data - The profile data to set or merge. Includes all fields from ProfileFormValues.
   * @param merge - Whether to merge the data with existing documents (true) or overwrite (false). Default is true.
   * @returns A promise resolving when the operations are complete.
   */
  export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
     if (!uid) {
       console.error("setPublicProfile: Received null or empty UID.");
       throw new Error("Cannot set profile without a user ID.");
     }
    const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
    const rootUserDocRef = doc(db, "users", uid); // Reference to the root user document

    try {
      // 1. Prepare Profile Data (ensure all fields, lowercase email)
      // Ensure data.email is defined before lowercasing
      const emailToSave = (data.email || '').toLowerCase();
      if (!emailToSave) {
           console.warn("setPublicProfile: Attempting to save profile with empty email for UID:", uid);
           // Depending on requirements, you might throw an error here or allow it
      }

      const profileDataToSet: ProfileFormValues = {
         name: data.name,
         email: emailToSave, // Use the potentially empty but lowercased email
         bio: data.bio ?? null,
         phoneNumber: data.phoneNumber ?? null,
         imageUrl: data.imageUrl ?? null,
         hasCompletedTutorial: data.hasCompletedTutorial ?? false,
         emailLinkSignInEnabled: data.emailLinkSignInEnabled ?? false,
      };

      // 2. Set/Merge the Root User Document (ensure it exists and has the email)
      // Use setDoc with merge:true to handle both creation and update.
      // Make sure Firestore rules allow writing 'email' to the root document.
      await setDoc(rootUserDocRef, { email: profileDataToSet.email, uid: uid }, { merge: true });
      console.log(`Root user document ${merge ? 'updated/merged' : 'created/overwritten'} with email and UID for UID:`, uid);

      // 3. Set/Merge the Profile Sub-Document
      await setDoc(profileDocRef, profileDataToSet, { merge: merge });
      console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} successfully for UID:`, uid);

    } catch (error) {
      console.error("setPublicProfile: Error setting public profile or root user document:", error);
      // Consider more specific error handling if needed (e.g., based on error code)
      throw new Error("Failed to update user profile.");
    }
  }
