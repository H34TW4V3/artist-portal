

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
      const data = docSnap.data() as Partial<ProfileFormValues>; 

      // Construct profile ensuring all fields, including isLabel, are sourced from publicProfile
      const completeProfile: ProfileFormValues = {
        name: data.name || "User",
        email: data.email || "unknown", 
        bio: data.bio ?? null,
        phoneNumber: data.phoneNumber ?? null,
        imageUrl: data.imageUrl ?? null,
        hasCompletedTutorial: data.hasCompletedTutorial ?? false,
        isLabel: data.isLabel ?? false, 
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
        if (completeProfile.email === "unknown" && currentUser.email) {
             completeProfile.email = currentUser.email; 
        }
      }
       if ((!completeProfile.name || completeProfile.name === "User") && completeProfile.email !== "unknown") {
         completeProfile.name = completeProfile.email.split('@')[0];
       }


      return completeProfile;
    } else {
      console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
      // If no profile sub-document, attempt to create a default based on auth user info ONLY IF auth user matches UID
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
          isLabel: false, // Default isLabel to false
        };
        // Do NOT persist here automatically. Let the calling context (e.g., ProfileForm) handle creation if needed.
        return defaultData;
      }
      console.warn(`getUserProfileByUid: No auth user or UID mismatch. Cannot create default for ${uid}.`);
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
 * The root user document will still store email, uid, and potentially a redundant isLabel for quick checks/rules.
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
      email: emailToSave, 
      bio: data.bio ?? null,
      phoneNumber: data.phoneNumber ?? null,
      imageUrl: data.imageUrl ?? null,
      hasCompletedTutorial: data.hasCompletedTutorial ?? false,
      isLabel: data.isLabel ?? false, 
    };
    console.log("setPublicProfile: Prepared profileDataToSet for publicProfile:", profileDataToSet);

    // Update/create the publicProfile sub-document
    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID: ${uid}`);


    // Update root document with email, uid and isLabel for potential quick queries or rules.
    // The source of truth for the detailed profile (including isLabel for form edits) is publicProfile.
    try {
      // Only update root if it already exists or if we are creating (merge=false typically for creation)
      const rootDocDataToSet: { email: string, uid: string, isLabel?: boolean } = { email: emailToSave, uid: uid };
      if (data.isLabel !== undefined) {
          rootDocDataToSet.isLabel = data.isLabel;
      }
      await setDoc(rootUserDocRef, rootDocDataToSet, { merge: true }); // Always merge on root for safety
      console.log(`Root user document updated/merged for UID: ${uid} with email: ${emailToSave} and isLabel: ${data.isLabel ?? 'unchanged'}`);
    } catch (rootDocError) {
       console.warn(`Could not update root user document for UID ${uid} (might be restricted by rules or not exist yet for a new user):`, rootDocError);
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
 * @param isLabel This parameter is now ignored, and new users are always created with isLabel: false.
 * @returns The UID of the newly created user.
 * @throws If user creation or profile creation fails.
 */
export async function createNewArtistAndUser(artistName: string, email: string, password?: string, _isLabelIgnored: boolean = false): Promise<string> {
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
            email: newUser.email || email, 
            bio: `Welcome, ${artistName}!`,
            phoneNumber: null,
            imageUrl: null,
            hasCompletedTutorial: false,
            isLabel: false, // Always set isLabel to false for new users created via this function
        };
        
        // Create the publicProfile document (merge: false to ensure creation)
        await setPublicProfile(newUser.uid, initialProfileData, false); 
        console.log("Public profile created in Firestore for new user:", newUser.uid, "with isLabel: false");

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

