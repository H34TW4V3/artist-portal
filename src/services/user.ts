
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
 * Ensures 'isLabel' and 'managedByLabelId' are read from this subcollection document.
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

      // Construct a complete profile, ensuring all fields have defaults if not present in Firestore.
      const completeProfile: ProfileFormValues = {
        name: data.name || "User", // Fallback to "User" if name is missing
        email: data.email || "unknown", // Fallback to "unknown" if email is missing
        bio: data.bio ?? null,
        phoneNumber: data.phoneNumber ?? null,
        imageUrl: data.imageUrl ?? null,
        hasCompletedTutorial: data.hasCompletedTutorial ?? false,
        isLabel: data.isLabel ?? false, // Default to false if not present
        managedByLabelId: data.managedByLabelId ?? null, // Default to null
      };

      // Attempt to supplement with Firebase Auth data if this is the current user
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        // Prefer auth display name if profile name is generic
        if ((!completeProfile.name || completeProfile.name === "User") && currentUser.displayName) {
          completeProfile.name = currentUser.displayName;
        }
        // Prefer auth photo URL if profile imageUrl is missing
        if (!completeProfile.imageUrl && currentUser.photoURL) {
          completeProfile.imageUrl = currentUser.photoURL;
        }
         // Prefer auth email if profile email is generic
        if (completeProfile.email === "unknown" && currentUser.email) {
             completeProfile.email = currentUser.email;
        }
      }
      // Final fallback for name if still generic, use email prefix
       if ((!completeProfile.name || completeProfile.name === "User") && completeProfile.email !== "unknown") {
         completeProfile.name = completeProfile.email.split('@')[0];
       }


      return completeProfile;
    } else {
      console.warn("getUserProfileByUid: No public profile document found at path:", profileDocRef.path);
      // If it's the currently authenticated user and no profile exists, create a default from auth data
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
          isLabel: false, // New users are not labels by default
          managedByLabelId: null, // New users are not managed by default
        };
        // Optionally, you could save this default profile to Firestore here
        // await setPublicProfile(uid, defaultData, false); // Example: create if not exists
        return defaultData;
      }
      console.warn(`getUserProfileByUid: No auth user or UID mismatch for ${uid}. Cannot create default.`);
      return null; // No profile found and not the current user to create a default for
    }
  } catch (error: any) {
    console.error(`getUserProfileByUid: Error fetching user profile for UID ${uid}:`, error);
    if (error.code === 'permission-denied') {
      console.error("Firestore Permission Denied: Check your security rules allow reading document '/users/{userId}/publicProfile/profile'.");
      // Avoid throwing here as it might break UI that gracefully handles null profiles
      // throw new Error(`Permission denied while fetching profile for ${uid}.`);
    }
    return null; // Return null on error to allow UI to handle missing profiles gracefully
  }
}


/**
 * Sets or updates the public profile sub-document.
 * 'isLabel' and 'managedByLabelId' are managed within the publicProfile document.
 */
export async function setPublicProfile(uid: string, data: ProfileFormValues, merge: boolean = true): Promise<void> {
  if (!uid) {
    console.error("setPublicProfile: Received null or empty UID.");
    throw new Error("Cannot set profile without a user ID.");
  }
  console.log(`setPublicProfile: Attempting to ${merge ? 'update/merge' : 'create/overwrite'} profile for UID:`, uid, "with data:", data);

  const profileDocRef = doc(db, "users", uid, "publicProfile", "profile");
  const rootUserDocRef = doc(db, "users", uid); // Reference to the root user document

  try {
    const emailToSave = (data.email || '').toLowerCase();
    if (!emailToSave) {
      // It's generally not good to have a profile without an email, but handle as per requirements
      console.warn("setPublicProfile: Attempting to save profile with empty email for UID:", uid);
    }

    // Ensure all fields are present, defaulting if necessary
    const profileDataToSet: ProfileFormValues = {
      name: data.name || "User",
      email: emailToSave, // Use the processed email
      bio: data.bio ?? null,
      phoneNumber: data.phoneNumber ?? null,
      imageUrl: data.imageUrl ?? null,
      hasCompletedTutorial: data.hasCompletedTutorial ?? false,
      isLabel: data.isLabel ?? false, // Default to false if not provided
      managedByLabelId: data.managedByLabelId ?? null, // Default to null if not provided
    };
    console.log("setPublicProfile: Prepared profileDataToSet for publicProfile:", profileDataToSet);

    // Set/merge the publicProfile document
    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID: ${uid}`);

    // Also update/merge the root user document with essential info (email, uid, and isLabel for rules)
    // This helps with Firestore rules that might need to check `isLabel` directly on the /users/{userId} document.
    try {
      const rootDocDataToSet: { email: string, uid: string, isLabel?: boolean, name?:string } = {
        email: emailToSave,
        uid: uid,
        name: profileDataToSet.name,
        isLabel: profileDataToSet.isLabel // Ensure isLabel is part of root doc for easier rule access
      };
      await setDoc(rootUserDocRef, rootDocDataToSet, { merge: true });
      console.log(`Root user document updated/merged for UID: ${uid} with email: ${emailToSave}, name: ${profileDataToSet.name}, and isLabel: ${profileDataToSet.isLabel}`);
    } catch (rootDocError) {
       // This is a secondary update; log a warning if it fails but don't necessarily throw
       console.warn(`Could not update root user document for UID ${uid}:`, rootDocError);
    }

  } catch (error) {
    console.error("setPublicProfile: Error setting public profile or root user document:", error);
    throw new Error("Failed to update user profile.");
  }
}


/**
 * Creates a new Firebase user and their associated public profile.
 * Sets managedByLabelId if provided by the calling label.
 * New users created this way are always artists (isLabel: false).
 * @param artistName The desired display name for the new artist.
 * @param email The email for the new user account.
 * @param password A temporary or user-defined password for the new account.
 * @param _isLabelIgnored This parameter is ignored; new users are always created with isLabel: false.
 * @param labelManagerId UID of the label managing this artist (optional, should be provided by the label).
 * @returns The UID of the newly created user.
 * @throws If user creation or profile creation fails.
 */
export async function createNewArtistAndUser(
    artistName: string,
    email: string,
    password?: string,
    _isLabelIgnored: boolean = false, // Parameter is present but its value is ignored for isLabel
    labelManagerId?: string | null
): Promise<string> {
    const auth = getAuth(app);
    let tempPassword = password;

    // Generate a temporary password if one isn't provided
    if (!tempPassword) {
        tempPassword = Array(12).fill(null).map(() => Math.random().toString(36).charAt(2)).join('') + 'A1!'; // Example: Stronger temp password
        console.log(`Generated temporary password for new user ${email}.`);
    }

    try {
        // Create the Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
        const newUser = userCredential.user;
        console.log("New Firebase user created successfully:", newUser.uid, newUser.email);

        // Update Firebase Auth profile (displayName)
        await updateProfile(newUser, { displayName: artistName });
        console.log("Firebase Auth profile updated with displayName:", artistName);

        // Prepare data for the publicProfile document in Firestore
        const initialProfileData: ProfileFormValues = {
            name: artistName,
            email: newUser.email || email, // Use email from auth user if available
            bio: `Welcome, ${artistName}! This is a new artist profile.`, // Default bio
            phoneNumber: null,
            imageUrl: null, // No default image URL for new users
            hasCompletedTutorial: false, // New users haven't completed tutorial
            isLabel: false, // New users created this way are always artists, not labels
            managedByLabelId: labelManagerId || null, // Set who manages this artist
        };
        console.log("Data to be saved for new artist profile:", initialProfileData);

        // Create the publicProfile document in Firestore
        await setPublicProfile(newUser.uid, initialProfileData, false); // Use false for merge to ensure a fresh document
        console.log("Public profile created in Firestore for new user:", newUser.uid, "with isLabel: false and managedByLabelId:", labelManagerId);

        return newUser.uid;

    } catch (error: any) {
        console.error("Error creating new artist and user:", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error(`The email address ${email} is already in use by another account.`);
        } else if (error.code === 'auth/invalid-email') {
            throw new Error(`The email address ${email} is not valid.`);
        } else if (error.code === 'auth/weak-password') {
            // This should only happen if a password was provided and it was weak
            throw new Error("The password provided is too weak.");
        }
        // For other errors, provide a generic message
        throw new Error("Failed to create new artist profile and user account.");
    }
}

// Function to get user profile by email - REMOVED as it's insecure and often blocked by rules.
// Always fetch profiles by UID after authentication or by other secure means.
// export async function getUserProfileByEmail(email: string): Promise<{ uid: string | null; profile: ProfileFormValues | null }> {
// ...
// }

