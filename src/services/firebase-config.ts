
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
// Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import getFirestore
import { getStorage } from "firebase/storage";   // Import getStorage

// Your web app's Firebase configuration
// IMPORTANT: Use environment variables for sensitive information
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // Measurement ID is optional
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID 
};

// Initialize Firebase App
let app: FirebaseApp;

// Check if Firebase app already exists (to avoid reinitialization in HMR)
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully.");
} else {
  app = getApp();
  console.log("Firebase app already initialized.");
}

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
// Initialize Cloud Storage and get a reference to the service
const storage = getStorage(app);


// Export the initialized app and services as needed
export { app, auth, db, storage }; // Export db and storage


// --- Validation ---
// Check if essential Firebase config variables are loaded
if (!firebaseConfig.apiKey) {
    console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is not defined. Check your .env.local file.");
}
if (!firebaseConfig.authDomain) {
    console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not defined. Check your .env.local file.");
}
if (!firebaseConfig.projectId) {
    console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined. Check your .env.local file.");
}
// Add checks for storage bucket if needed
if (!firebaseConfig.storageBucket) {
    console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not defined. Check your .env.local file.");
}
if (!firebaseConfig.messagingSenderId) {
    console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is not defined. Check your .env.local file.");
}
if (!firebaseConfig.appId) {
    console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_APP_ID is not defined. Check your .env.local file.");
}

// Important Note on Security Rules:
//
// Firestore Rules Example for Label/Artist Management:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {

//     // Rule for accessing individual user documents (e.g., to get the label's own profile)
//     match /users/{userId} {
//       // Generally, only allow a user to read/write their own root document.
//       // Specific fields might be publicly readable if needed, but start with owner-only.
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }

//     // Rules for publicProfile subcollection (direct path access)
//     // Assumes 'profile' is the fixed document ID for public profiles.
//     match /users/{userId}/publicProfile/profile {
//       allow read: if request.auth != null &&
//                      (
//                        // Owner can read their own profile
//                        request.auth.uid == userId ||
//                        // A label user can read the profile of an artist they manage
//                        (
//                          get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                          resource.data.managedByLabelId == request.auth.uid &&
//                          resource.data.isLabel == false
//                        )
//                      );
//       // Only the owner can write their own publicProfile document.
//       allow write: if request.auth != null && request.auth.uid == userId;
//     }

//     // Rule for COLLECTION GROUP queries on 'publicProfile'
//     // This is essential for the `getManagedArtists` function which queries across all 'publicProfile' collections.
//     // Assumes 'profile' is the fixed document ID within each 'publicProfile' subcollection.
//     match /{path=**}/publicProfile/profile {
//        // Allow a label user to list/query artists they manage.
//        // This rule permits the query; the client-side query itself applies the filters.
//        allow list, get: if request.auth != null &&
//                          // Check if the requesting user is a label by fetching their own profile.
//                          get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true;
//                          // Note: The actual filtering (where managedByLabelId == labelId and isLabel == false)
//                          // happens in the client-side query. This rule just authorizes a label to perform
//                          // such a collection group query. For stricter field-level read security on query results,
//                          // you might need more complex rules or rely on client-side filtering of received data.

//        // Allow a label to update a managed artist's profile, or a user to update their own.
//        // This rule needs to correctly identify the target document's owner or manager.
//        allow write: if request.auth != null &&
//                        (
//                          // Case 1: User is updating their own profile.
//                          // `path[1]` would be the userId from `users/{userId}/publicProfile/profile`.
//                          (path[0] == 'users' && path[1] == request.auth.uid && path[2] == 'publicProfile') ||
//                          // Case 2: Label is updating a managed artist's profile.
//                          (
//                            get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                            request.resource.data.managedByLabelId == request.auth.uid && // The profile being written is managed by the requester
//                            request.resource.data.isLabel == false // Ensure they are updating an artist's profile
//                          )
//                        );
//     }

//     // User can manage their own 'releases' subcollection.
//     match /users/{userId}/releases/{releaseId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
    
//     // User can manage their own 'events' subcollection.
//     match /users/{userId}/events/{eventId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }
//
// Crucial Firestore Index for `getManagedArtists` (for 'publicProfile' collection group):
// 1. Collection ID: `publicProfile`
// 2. Fields:
//    - `managedByLabelId` (Ascending)
//    - `isLabel` (Ascending OR Descending)
//
// Without this composite index, the collection group query in `getManagedArtists` will fail.
// Ensure `isLabel: true` is set in the label user's `/users/{labelUserId}/publicProfile/profile` document.
// Ensure `managedByLabelId: {labelUserId}` and `isLabel: false` are set in the artist's
// `/users/{artistUserId}/publicProfile/profile` document.
//
// Storage rules usually grant access based on userId in the path. Example:
// service firebase.storage {
//   match /b/{bucket}/o {
//     // Allow user to read/write their own files in their folder.
//     match /releaseArtwork/{userId}/{allPaths=**} { // For release artwork
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//     match /profileImages/{userId}/{allPaths=**} { // For profile images
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//     match /releases/{userId}/{allPaths=**} { // For release ZIPs
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }
//
// Always test your rules thoroughly in the Firebase console simulator.
// The provided rules are a template; adjust them to your exact application needs.
// Remember that `resource.data` refers to the data *after* a potential write,
// and `request.resource.data` refers to the data being written.
// `get()` calls in rules count towards your read quotas.

