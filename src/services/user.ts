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

      const completeProfile: ProfileFormValues = {
        name: data.name || "User",
        email: data.email || "unknown",
        bio: data.bio || null,
        phoneNumber: data.phoneNumber || null,
        imageUrl: data.imageUrl || null,
        hasCompletedTutorial: data.hasCompletedTutorial || false,
        emailLinkSignInEnabled: data.emailLinkSignInEnabled || false,
      };

      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        if (!data.name && currentUser.displayName) {
          completeProfile.name = currentUser.displayName;
        }
        if ((!data.email || data.email === "unknown") && currentUser.email) {
          completeProfile.email = currentUser.email;
        }
        if (!data.imageUrl && currentUser.photoURL) {
          completeProfile.imageUrl = currentUser.photoURL;
        }
      }

      if (!completeProfile.name) {
        completeProfile.name = completeProfile.email?.split('@')[0] || 'User';
      }

      return completeProfile;
    } else {
      console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        return {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
          email: currentUser.email || "unknown",
          bio: null,
          phoneNumber: null,
          imageUrl: currentUser.photoURL || null,
          hasCompletedTutorial: false,
          emailLinkSignInEnabled: false,
        };
      }
      return null;
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
 * Fetches minimal public profile data for a user by email.
 * Only returns email, name, and imageUrl.
 */
export async function getUserProfileByEmail(email: string): Promise<{ uid: string; profile: { email: string; name: string | null; imageUrl: string | null } | null } | null> {
  if (!email) {
    console.error("getUserProfileByEmail: Received null or empty email.");
    return null;
  }

  console.log("getUserProfileByEmail: Querying for user with email:", email);
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      const fullUserData = userDoc.data();

      const allowedFields = ['email', 'name', 'imageUrl'];
      const userData: Record<string, any> = {};
      for (const field of allowedFields) {
        userData[field] = fullUserData[field] ?? null;
      }

      console.log(`getUserProfileByEmail: Found UID ${userId}. Projected fields:`, userData);

      return {
        uid: userId,
        profile: {
          email: userData.email,
          name: userData.name,
          imageUrl: userData.imageUrl,
        }
      };
    } else {
      console.warn("getUserProfileByEmail: No user document found with email:", email);
      return null;
    }
  } catch (error: any) {
    console.error("getUserProfileByEmail: Error querying user by email:", error);
    if (error.code === 'permission-denied') {
      console.error("Firestore Permission Denied: Check your security rules allow querying by email and reading allowed fields.");
      throw new Error("Permission denied while fetching user profile.");
    } else {
      throw new Error("Failed to fetch user profile by email.");
    }
  }
}

/**
 * Sets or updates the public profile and root user doc (email & uid).
 */
export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
  if (!uid) {
    console.error("setPublicProfile: Received null or empty UID.");
    throw new Error("Cannot set profile without a user ID.");
  }

  const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
  const rootUserDocRef = doc(db, "users", uid);

  try {
    const emailToSave = (data.email || '').toLowerCase();
    if (!emailToSave) {
      console.warn("setPublicProfile: Attempting to save profile with empty email for UID:", uid);
    }

    const profileDataToSet: ProfileFormValues = {
      name: data.name,
      email: emailToSave,
      bio: data.bio ?? null,
      phoneNumber: data.phoneNumber ?? null,
      imageUrl: data.imageUrl ?? null,
      hasCompletedTutorial: data.hasCompletedTutorial ?? false,
      emailLinkSignInEnabled: data.emailLinkSignInEnabled ?? false,
    };

    await setDoc(rootUserDocRef, { email: profileDataToSet.email, uid: uid }, { merge: true });
    console.log(`Root user document ${merge ? 'updated/merged' : 'created/overwritten'} for UID:`, uid);

    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID:`, uid);

  } catch (error) {
    console.error("setPublicProfile: Error setting public profile or root user document:", error);
    throw new Error("Failed to update user profile.");
  }
}
