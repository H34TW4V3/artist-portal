
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  orderBy,
  limit,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app, db } from './firebase-config';
import type { ProfileFormValues } from "@/components/profile/profile-form";

/**
 * Fetches the public profile data for a specific user ID.
 * Uses the 'users/{userId}/publicProfile/profile' path.
 */
export async function getUserProfileByUid(uid: string): Promise<ProfileFormValues | null> {
  if (!uid) {
    console.error("getUserProfileByUid: Received null or empty UID.");
    return null;
  }
  console.log("getUserProfileByUid: Attempting to fetch profile for UID:", uid);

  // Correct path to the specific profile document within the subcollection
  const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");

  try {
    const docSnap = await getDoc(profileDocRef);
    if (docSnap.exists()) {
      console.log("getUserProfileByUid: Profile data found for UID:", uid);
      const data = docSnap.data() as Partial<ProfileFormValues>;

      // Construct a complete profile object, providing defaults for missing fields
      const completeProfile: ProfileFormValues = {
        name: data.name || "User",
        email: data.email || "unknown",
        bio: data.bio ?? null, // Use nullish coalescing
        phoneNumber: data.phoneNumber ?? null,
        imageUrl: data.imageUrl ?? null,
        hasCompletedTutorial: data.hasCompletedTutorial ?? false,
        emailLinkSignInEnabled: data.emailLinkSignInEnabled ?? false,
      };

      // Fallback to Auth data ONLY if Firestore data is missing specific fields
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        if ((!completeProfile.name || completeProfile.name === "User") && currentUser.displayName) {
          completeProfile.name = currentUser.displayName;
        }
        // Email primarily comes from Firestore profile due to verification process.
        if ((!completeProfile.email || completeProfile.email === "unknown") && currentUser.email) {
           console.warn("getUserProfileByUid: Firestore email missing or 'unknown', falling back to auth email for UID:", uid);
           // completeProfile.email = currentUser.email; // Re-enable if fallback is desired despite verification complexity
        }
        if (!completeProfile.imageUrl && currentUser.photoURL) {
          completeProfile.imageUrl = currentUser.photoURL;
        }
      }

      // Final fallback for name if still missing
      if (!completeProfile.name || completeProfile.name === "User") {
        completeProfile.name = completeProfile.email?.split('@')[0] || 'User';
      }


      return completeProfile;
    } else {
      console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
      // If no profile doc, try to construct from auth data as a fallback
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
         console.log("getUserProfileByUid: Falling back to auth data for UID:", uid);
        return {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
          email: currentUser.email || "unknown",
          bio: null,
          phoneNumber: null,
          imageUrl: currentUser.photoURL || null,
          hasCompletedTutorial: false, // Assume false if no profile doc
          emailLinkSignInEnabled: false,
        };
      }
      return null; // Return null if no profile and auth doesn't match
    }
  } catch (error: any) {
    console.error(`getUserProfileByUid: Error fetching user profile for UID ${uid}:`, error);
    if (error.code === 'permission-denied') {
      console.error("Firestore Permission Denied: Check your security rules allow reading document '/users/{userId}/publicProfile/profile'.");
      throw new Error(`Permission denied while fetching profile for ${uid}.`);
    }
    throw new Error("Failed to fetch user profile.");
  }
}


// REMOVED getUserProfileByEmail function entirely as it requires potentially insecure rules
// /**
//  * Fetches minimal public profile data (email, name, imageUrl, UID) for a user by email.
//  * Queries the top-level 'users' collection. Requires rules allowing this query.
//  * Assumes the querying user is authenticated.
//  */
// export async function getUserProfileByEmail(email: string): Promise<{ uid: string; profile: { email: string; name: string | null; imageUrl: string | null } } | null> {
//   const auth = getAuth(app);
//   const currentUser = auth.currentUser;
//
//   // Enforce authentication check at the beginning of the function
//   if (!currentUser) {
//     console.error("getUserProfileByEmail: Authentication required to query users by email.");
//     throw new Error("Authentication required to perform this action.");
//   }
//
//   if (!email) {
//     console.error("getUserProfileByEmail: Received null or empty email.");
//     return null;
//   }
//
//   const usersRef = collection(db, "users");
//   // Ensure email is queried in lowercase to match potential storage format
//   const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
//
//   try {
//     const querySnapshot = await getDocs(q);
//     if (!querySnapshot.empty) {
//       const userDoc = querySnapshot.docs[0];
//       const userId = userDoc.id;
//       // Read only the fields explicitly allowed by the rules
//       const userData = userDoc.data();
//
//       // Fetch the profile sub-document for more details
//       const profileDocRef = doc(db, "users", userId, "publicProfile", "profile");
//       const profileSnap = await getDoc(profileDocRef);
//       const profileData = profileSnap.exists()
//           ? profileSnap.data() as Partial<ProfileFormValues>
//           : {};
//
//
//       const finalProfile = {
//         email: userData.email || profileData.email || "unknown", // Prioritize root email if rules allow, then profile, then unknown
//         name: profileData.name || userData.name || null, // Prioritize profile name, then root name
//         imageUrl: profileData.imageUrl || userData.imageUrl || null, // Prioritize profile image, then root image
//       };
//
//       console.log(`getUserProfileByEmail: Found UID ${userId} for email ${email}. Profile Data:`, finalProfile);
//       return { uid: userId, profile: finalProfile }; // Return found data
//
//     } else {
//       console.warn("getUserProfileByEmail: No user document found with email:", email);
//       return null; // Explicitly return null if not found
//     }
//   } catch (error: any) {
//     console.error("getUserProfileByEmail: Error querying user by email:", error);
//     if (error.code === 'permission-denied') {
//       // More specific error message related to the query rules
//       console.error("Firestore Permission Denied: Check your security rules allow authenticated users to query the 'users' collection by email AND read the required fields (email, name, imageUrl).");
//       throw new Error("Permission denied while fetching user profile by email.");
//     } else {
//       throw new Error("Failed to fetch user profile by email.");
//     }
//   }
// }


/**
 * Sets or updates the public profile sub-document and the root user doc (email & uid).
 */
export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
  if (!uid) {
    console.error("setPublicProfile: Received null or empty UID.");
    throw new Error("Cannot set profile without a user ID.");
  }

  const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
  const rootUserDocRef = doc(db, "users", uid); // Reference to the top-level user document

  try {
    // Ensure email is lowercase for consistency in storage and querying
    const emailToSave = (data.email || '').toLowerCase();
    if (!emailToSave) {
      console.warn("setPublicProfile: Attempting to save profile with empty email for UID:", uid);
      // Consider throwing an error or handling this case based on requirements
    }

    // Prepare data for the publicProfile sub-document
    // Ensure all expected fields are present, using null for optional fields if undefined
    const profileDataToSet: ProfileFormValues = {
      name: data.name || "User", // Provide default if needed
      email: emailToSave,
      bio: data.bio ?? null,
      phoneNumber: data.phoneNumber ?? null,
      imageUrl: data.imageUrl ?? null,
      hasCompletedTutorial: data.hasCompletedTutorial ?? false,
      emailLinkSignInEnabled: data.emailLinkSignInEnabled ?? false,
    };

    // 1. Update the root user document with email and uid (using merge to avoid overwriting other fields)
    // This is useful for querying by email at the root level if rules allow.
    // Ensure the 'uid' field is only set if the document might be created, merge usually handles this.
    // Note: This might fail if rules disallow writing email/uid directly to the root by the user.
    // Consider using a Cloud Function for this part if needed for security.
    try {
      await setDoc(rootUserDocRef, { email: emailToSave, uid: uid }, { merge: true });
      console.log(`Root user document updated/merged for UID: ${uid} with email: ${emailToSave}`);
    } catch (rootDocError) {
       console.warn(`Could not update root user document for UID ${uid} (might be restricted by rules):`, rootDocError);
       // Continue with profile update even if root doc fails
    }


    // 2. Update the publicProfile sub-document
    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID: ${uid}`);

  } catch (error) {
    console.error("setPublicProfile: Error setting public profile or root user document:", error);
    throw new Error("Failed to update user profile.");
  }
}

