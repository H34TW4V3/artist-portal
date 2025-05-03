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

  const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");

  try {
    const docSnap = await getDoc(profileDocRef);
    if (docSnap.exists()) {
      console.log("getUserProfileByUid: Profile data found for UID:", uid);
      const data = docSnap.data() as Partial<ProfileFormValues>;

      // Construct a complete profile object, providing defaults for missing fields
      const completeProfile: ProfileFormValues = {
        name: data.name || "User", // Default to "User" if name is missing
        email: data.email || "unknown", // Default to "unknown" if email is missing
        bio: data.bio || null, // Default to null
        phoneNumber: data.phoneNumber || null, // Default to null
        imageUrl: data.imageUrl || null, // Default to null
        hasCompletedTutorial: data.hasCompletedTutorial || false, // Default to false
        emailLinkSignInEnabled: data.emailLinkSignInEnabled || false, // Default to false
      };

      // Fallback to Auth data ONLY if Firestore data is missing specific fields
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        if (!data.name && currentUser.displayName) {
          completeProfile.name = currentUser.displayName;
        }
        // Email should primarily come from Firestore profile due to verification process
        // if ((!data.email || data.email === "unknown") && currentUser.email) {
        //   completeProfile.email = currentUser.email;
        // }
        if (!data.imageUrl && currentUser.photoURL) {
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


/**
 * Fetches minimal public profile data (email, name, imageUrl) for a user by email.
 * Queries the top-level 'users' collection. Requires rules allowing this query.
 */
export async function getUserProfileByEmail(email: string): Promise<{ uid: string; profile: { email: string; name: string | null; imageUrl: string | null } | null } | null> {
  if (!email) {
    console.error("getUserProfileByEmail: Received null or empty email.");
    return null;
  }

  const usersRef = collection(db, "users");
  // Ensure email is queried in lowercase to match potential storage format
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      // Important: Even though rules might restrict fields later, fetch the doc first
      const fullUserData = userDoc.data(); // Contains fields allowed by rules + potentially others

      // Manually construct the profile object with ONLY the fields expected based on rules
      // This prevents accidentally trying to use fields blocked by rules later.
      const profileData = {
          email: fullUserData.email || "unknown", // Default if missing (shouldn't happen with query)
          name: fullUserData.name || null,
          imageUrl: fullUserData.imageUrl || null,
      };

      console.log(`getUserProfileByEmail: Found UID ${userId} for email ${email}. Profile Data:`, profileData);
      return { uid: userId, profile: profileData };

    } else {
      console.warn("getUserProfileByEmail: No user document found with email:", email);
      return null;
    }
  } catch (error: any) {
    console.error("getUserProfileByEmail: Error querying user by email:", error);
    if (error.code === 'permission-denied') {
      // More specific error message related to the query rules
      console.error("Firestore Permission Denied: Check your security rules allow authenticated users to query the 'users' collection by email AND read the required fields (email, name, imageUrl).");
      throw new Error("Permission denied while fetching user profile by email.");
    } else {
      throw new Error("Failed to fetch user profile by email.");
    }
  }
}


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

    // Update the root user document with email and uid (using merge to avoid overwriting other fields)
    // This is useful for querying by email at the root level if rules allow.
    await setDoc(rootUserDocRef, { email: emailToSave, uid: uid }, { merge: true });
    console.log(`Root user document updated/merged for UID:`, uid);

    // Update the publicProfile sub-document
    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID:`, uid);

  } catch (error) {
    console.error("setPublicProfile: Error setting public profile or root user document:", error);
    throw new Error("Failed to update user profile.");
  }
}
