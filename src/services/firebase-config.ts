
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

// Important Note on Security Rules & Indexes for Label/Artist Management:
//
// Firestore Rules Example for Label/Artist Management:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {

//     // Rule for accessing individual user's publicProfile document (e.g., label checking its own isLabel)
//     match /users/{userId}/publicProfile/profile {
//       // Owner can read/write their own profile.
//       // This rule allows the `get()` in the collection group rule to work when a label checks its own `isLabel` status.
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }

//     // Rule for the COLLECTION GROUP query on 'publicProfile'
//     // This rule is crucial for `getManagedArtists`.
//     match /{path=**}/publicProfile/profile { // Correct syntax for collection group
//        allow list, get: if request.auth != null &&
//                           // Ensure the requesting user is a label by checking their OWN profile document.
//                           get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true;
//                           // `list` allows the query to run if the condition is met.
//                           // `get` allows reading the individual documents returned by the query,
//                           // as long as they meet the conditions of *this* rule (which is just being a label).
//                           // The client-side query will further filter by `managedByLabelId` and `isLabel == false`.
//     }

//     // Rule for user's root document (if primarily used for auth data like email, uid)
//     match /users/{userId} {
//       // Only owner can read/write their root user document.
//       // Consider if any other access is needed here based on your app structure.
//       allow read, write: if request.auth != null && request.auth.uid == userId;
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
// === CRITICAL FIRESTORE INDEX for `getManagedArtists` ===
// For the `publicProfile` collection group, you MUST have a composite index:
// 1. Collection ID: `publicProfile` (Ensure this is targeted as a Collection Group in the Firebase Console Index section)
// 2. Fields:
//    - `managedByLabelId` (Ascending)
//    - `isLabel` (Ascending)
// Scope: Collection group
//
// === CRITICAL DATA CONSISTENCY for `getManagedArtists` ===
// 1. Label User's Profile: The document at `/users/{labelUserId}/publicProfile/profile` for the label user
//    MUST contain the field `isLabel: true`.
// 2. Artist User's Profile: For each artist managed by the label, their document at
//    `/users/{artistId}/publicProfile/profile` MUST contain:
//    - `managedByLabelId: "{labelUserId}"` (where {labelUserId} is the UID of the managing label)
//    - `isLabel: false`
//
// Failure to meet EITHER the index requirement OR the data consistency requirements will result in "Permission Denied"
// or "Failed Precondition" errors for the `getManagedArtists` query.
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

