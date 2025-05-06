

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
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"; // Import createUserWithEmailAndPassword and updateProfile
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
      console.log("getUserProfileByUid: Profile data found for UID:", uid, docSnap.data());
      const data = docSnap.data() as Partial<ProfileFormValues>;

      const completeProfile: ProfileFormValues = {
        name: data.name || "User",
        email: data.email || "unknown",
        bio: data.bio ?? null,
        phoneNumber: data.phoneNumber ?? null,
        imageUrl: data.imageUrl ?? null,
        hasCompletedTutorial: data.hasCompletedTutorial ?? false,
        // emailLinkSignInEnabled is removed from ProfileFormValues
      };
      
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        if ((!completeProfile.name || completeProfile.name === "User") && currentUser.displayName) {
          completeProfile.name = currentUser.displayName;
        }
        if (!completeProfile.imageUrl && currentUser.photoURL) {
          completeProfile.imageUrl = currentUser.photoURL;
        }
        if (completeProfile.email === "unknown" && currentUser.email) {
            console.warn(`getUserProfileByUid: Firestore email is 'unknown' for UID ${uid}, auth email is ${currentUser.email}. Using Firestore email for display consistency regarding updates.`);
        }
      }
       if (!completeProfile.name || completeProfile.name === "User") {
         completeProfile.name = completeProfile.email?.split('@')[0] || 'User';
       }

      return completeProfile;
    } else {
      console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
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
          hasCompletedTutorial: false,
          // emailLinkSignInEnabled is removed
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
 * Sets or updates the public profile sub-document and the root user doc (email & uid).
 * Ensures all fields from ProfileFormValues are either provided or explicitly set to null/default.
 */
export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
  if (!uid) {
    console.error("setPublicProfile: Received null or empty UID.");
    throw new Error("Cannot set profile without a user ID.");
  }
  console.log(`setPublicProfile: Attempting to ${merge ? 'update/merge' : 'create/overwrite'} profile for UID:`, uid, "with data:", data);


  const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
  const rootUserDocRef = doc(db, "users", uid);

  try {
    const emailToSave = (data.email || '').toLowerCase();
    if (!emailToSave) {
      console.warn("setPublicProfile: Attempting to save profile with empty email for UID:", uid);
    }

    const profileDataToSet: ProfileFormValues = {
      name: data.name || "User",
      email: emailToSave,
      bio: data.bio ?? null,
      phoneNumber: data.phoneNumber ?? null,
      imageUrl: data.imageUrl ?? null,
      hasCompletedTutorial: data.hasCompletedTutorial ?? false,
      // emailLinkSignInEnabled is removed
    };
    console.log("setPublicProfile: Prepared profileDataToSet:", profileDataToSet);

    try {
      await setDoc(rootUserDocRef, { email: emailToSave, uid: uid }, { merge: true });
      console.log(`Root user document updated/merged for UID: ${uid} with email: ${emailToSave}`);
    } catch (rootDocError) {
       console.warn(`Could not update root user document for UID ${uid} (might be restricted by rules):`, rootDocError);
    }

    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID: ${uid}`);

  } catch (error) {
    console.error("setPublicProfile: Error setting public profile or root user document:", error);
    throw new Error("Failed to update user profile.");
  }
}


/**
 * Creates a new Firebase user and their associated public profile.
 * @param artistName The desired display name for the new artist.
 * @param email The email for the new user account.
 * @param password A temporary or user-defined password for the new account.
 * @returns The UID of the newly created user.
 * @throws If user creation or profile creation fails.
 */
export async function createNewArtistAndUser(artistName: string, email: string, password?: string): Promise<string> {
    const auth = getAuth(app);
    let tempPassword = password;

    if (!tempPassword) {
        // Generate a strong random password if none is provided
        tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase();
        console.log(`Generated temporary password for new user ${email}: ${tempPassword}`);
        // It's crucial to communicate this password to the user securely or prompt them to set one immediately.
        // For this example, we'll proceed, but real-world scenarios need secure handling.
    }

    try {
        // 1. Create the Firebase user
        const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
        const newUser = userCredential.user;
        console.log("New Firebase user created successfully:", newUser.uid, newUser.email);

        // 2. Update the Firebase Auth user's display name
        await updateProfile(newUser, { displayName: artistName });
        console.log("Firebase Auth profile updated with displayName:", artistName);

        // 3. Create the public profile document in Firestore
        const initialProfileData: ProfileFormValues = {
            name: artistName,
            email: newUser.email || email, // Use email from auth object if available
            bio: `Welcome, ${artistName}!`,
            phoneNumber: null,
            imageUrl: null, // Or a default image URL
            hasCompletedTutorial: false, // New users haven't completed tutorial
        };
        await setPublicProfile(newUser.uid, initialProfileData, false); // Use merge:false for initial creation
        console.log("Public profile created in Firestore for new user:", newUser.uid);

        // TODO: Consider sending a welcome email with the temporary password
        // or a password reset link to prompt the user to set their own password.

        return newUser.uid;

    } catch (error: any) {
        console.error("Error creating new artist and user:", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error(`The email address ${email} is already in use by another account.`);
        } else if (error.code === 'auth/invalid-email') {
            throw new Error(`The email address ${email} is not valid.`);
        } else if (error.code === 'auth/weak-password') {
            throw new Error("The password provided is too weak.");
        }
        throw new Error("Failed to create new artist profile and user account.");
    }
}
