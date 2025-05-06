

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
      console.log("getUserProfileByUid: Profile data found for UID:", uid, docSnap.data());
      const data = docSnap.data() as Partial<ProfileFormValues>;

      // Construct a complete profile object, providing defaults for missing fields
      // Ensure all fields defined in ProfileFormValues are present
      const completeProfile: ProfileFormValues = {
        name: data.name || "User",
        email: data.email || "unknown", // This will be the Firestore email
        bio: data.bio ?? null,
        phoneNumber: data.phoneNumber ?? null,
        imageUrl: data.imageUrl ?? null,
        hasCompletedTutorial: data.hasCompletedTutorial ?? false,
        // emailLinkSignInEnabled is optional in the type
        ...(data.emailLinkSignInEnabled !== undefined && { emailLinkSignInEnabled: data.emailLinkSignInEnabled }),
      };
      
      // Fallback for name and image from Auth if not in Firestore profile or default
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser?.uid === uid) {
        if ((!completeProfile.name || completeProfile.name === "User") && currentUser.displayName) {
          completeProfile.name = currentUser.displayName;
        }
        if (!completeProfile.imageUrl && currentUser.photoURL) {
          completeProfile.imageUrl = currentUser.photoURL;
        }
        // Email decision: Firestore profile email is primary due to update verification flow
        // If Firestore email is "unknown" and auth email exists, consider logging warning or specific handling
        if (completeProfile.email === "unknown" && currentUser.email) {
            console.warn(`getUserProfileByUid: Firestore email is 'unknown' for UID ${uid}, auth email is ${currentUser.email}. Using Firestore email for display consistency regarding updates.`);
        }
      }
       // Final fallback for name if still missing after auth check
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
          email: currentUser.email || "unknown", // This will be the auth email
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
  const rootUserDocRef = doc(db, "users", uid); // Reference to the top-level user document

  try {
    // Ensure email is lowercase for consistency in storage and querying
    const emailToSave = (data.email || '').toLowerCase();
    if (!emailToSave) {
      console.warn("setPublicProfile: Attempting to save profile with empty email for UID:", uid);
      // Allow saving with empty email if schema allows and it's intentional
    }

    // Prepare data for the publicProfile sub-document, ensuring all fields are covered
    const profileDataToSet: ProfileFormValues = {
      name: data.name || "User", // Fallback if name is somehow empty
      email: emailToSave,
      bio: data.bio ?? null,
      phoneNumber: data.phoneNumber ?? null,
      imageUrl: data.imageUrl ?? null,
      hasCompletedTutorial: data.hasCompletedTutorial ?? false,
      // emailLinkSignInEnabled is optional in type, include if present
      ...(data.emailLinkSignInEnabled !== undefined && { emailLinkSignInEnabled: data.emailLinkSignInEnabled }),
    };
    console.log("setPublicProfile: Prepared profileDataToSet:", profileDataToSet);

    // 1. Update the root user document with email and uid (using merge to avoid overwriting other fields)
    // This is useful for querying by email at the root level if rules allow.
    try {
      await setDoc(rootUserDocRef, { email: emailToSave, uid: uid }, { merge: true });
      console.log(`Root user document updated/merged for UID: ${uid} with email: ${emailToSave}`);
    } catch (rootDocError) {
       console.warn(`Could not update root user document for UID ${uid} (might be restricted by rules):`, rootDocError);
       // Continue with profile update even if root doc fails, profile sub-doc is primary source
    }


    // 2. Update the publicProfile sub-document
    // Using setDoc with merge:true will create the doc if it doesn't exist, or merge if it does.
    // If merge is false, it will overwrite.
    await setDoc(profileDocRef, profileDataToSet, { merge: merge });
    console.log(`Public profile sub-document ${merge ? 'updated/merged' : 'created/overwritten'} for UID: ${uid}`);

  } catch (error) {
    console.error("setPublicProfile: Error setting public profile or root user document:", error);
    throw new Error("Failed to update user profile.");
  }
}
