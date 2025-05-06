

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
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { app, db } from './firebase-config';
import type { ProfileFormValues } from "@/components/profile/profile-form";

/**
 * Fetches the public profile data for a specific user ID.
 * Uses the 'users/{userId}/publicProfile/profile' path.
 * Ensures 'isLabel' is read from this subcollection document.
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
      const data = docSnap.data() as Partial<ProfileFormValues>; // Data from publicProfile/profile

      // Construct profile ensuring all fields, including isLabel, are sourced from publicProfile
      const completeProfile: ProfileFormValues = {
        name: data.name || "User",
        email: data.email || "unknown", // Email from profile doc
        bio: data.bio ?? null,
        phoneNumber: data.phoneNumber ?? null,
        imageUrl: data.imageUrl ?? null,
        hasCompletedTutorial: data.hasCompletedTutorial ?? false,
        isLabel: data.isLabel ?? false, // isLabel from publicProfile document
      };
      
      // Fallback to auth user details if some profile fields are missing, but prioritize profileDoc
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        if ((!completeProfile.name || completeProfile.name === "User") && currentUser.displayName) {
          completeProfile.name = currentUser.displayName;
        }
        if (!completeProfile.imageUrl && currentUser.photoURL) {
          completeProfile.imageUrl = currentUser.photoURL;
        }
         // If profileDoc email is 'unknown', but auth email exists, it might indicate an update process or initial setup.
         // For consistency in the UI (especially if email updates are pending), we use the profile's email if set.
         // If profile email is 'unknown' and auth email is available, it could be logged or handled.
        if (completeProfile.email === "unknown" && currentUser.email) {
             console.warn(`getUserProfileByUid: Profile email is 'unknown' for UID ${uid}, auth email is ${currentUser.email}. Using profile email if available, otherwise auth email.`);
             completeProfile.email = currentUser.email; // Use auth email if profile one is literally "unknown"
        }
      }
       if (!completeProfile.name || completeProfile.name === "User") {
         completeProfile.name = completeProfile.email?.split('@')[0] || 'User';
       }

      return completeProfile;
    } else {
      console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
      // If no profile sub-document, create a default based on auth user
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
         console.log("getUserProfileByUid: Creating default profile from auth data for UID:", uid);
        const defaultData: ProfileFormValues = {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
          email: currentUser.email || "unknown",
          bio: null,
          phoneNumber: null,
          imageUrl: currentUser.photoURL || null,
          hasCompletedTutorial: false,
          isLabel: false, // Default isLabel to false when creating from auth fallback
        };
        // Persist this default profile
        // await setPublicProfile(uid, defaultData, false); // Let profile form handle initial save if needed
        return defaultData;
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
 * Sets or updates the public profile sub-document.
 * The root user document will still store email, uid, and isLabel for quick checks/rules.
 * Ensures all fields from ProfileFormValues are either provided or explicitly set to null/default.
 * 'isLabel' is now primarily managed within the publicProfile document.
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

    // Data for the publicProfile sub-document
    const profileDataToSet: ProfileFormValues = {
      name: data.name || "User",
      email: emailToSave, // Email is stored here as primary source for profile display
      bio: data.bio ?? null,
      phoneNumber: data.phoneNumber ?? null,
      imageUrl: data.imageUrl ?? null,
      hasCompletedTutorial: data.hasCompletedTutorial ?? false,
      isLabel: data.isLabel ?? false, // isLabel is stored in publicProfile
    };
    console.log("setPublicProfile: Prepared profileDataToSet for publicProfile:", profileDataToSet);

    // Update the publicProfile sub-document
    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID: ${uid}`);


    // Update root document with email, uid and isLabel for potential quick queries or rules.
    // The source of truth for the detailed profile (including isLabel for form edits) is publicProfile.
    try {
      await setDoc(rootUserDocRef, { email: emailToSave, uid: uid, isLabel: data.isLabel ?? false }, { merge: true });
      console.log(`Root user document updated/merged for UID: ${uid} with email: ${emailToSave} and isLabel: ${data.isLabel ?? false}`);
    } catch (rootDocError) {
       console.warn(`Could not update root user document for UID ${uid} (might be restricted by rules):`, rootDocError);
    }

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
        // Generate a more secure random password if not provided
        tempPassword = Array(12).fill(null).map(() => Math.random().toString(36).charAt(2)).join('') + 'A1!';
        console.log(`Generated temporary password for new user ${email}.`);
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
        const newUser = userCredential.user;
        console.log("New Firebase user created successfully:", newUser.uid, newUser.email);

        await updateProfile(newUser, { displayName: artistName });
        console.log("Firebase Auth profile updated with displayName:", artistName);

        // Initial data for the publicProfile sub-document
        const initialProfileData: ProfileFormValues = {
            name: artistName,
            email: newUser.email || email, // Use the email from the created user
            bio: `Welcome, ${artistName}!`,
            phoneNumber: null,
            imageUrl: null,
            hasCompletedTutorial: false,
            isLabel: false, // Default isLabel to false for new artists
        };
        
        await setPublicProfile(newUser.uid, initialProfileData, false); // Creates the publicProfile doc
        console.log("Public profile created in Firestore for new user:", newUser.uid);

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
