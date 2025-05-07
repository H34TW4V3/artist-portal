
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
//
//     // Rules for the /users/{userId} path
//     match /users/{userId} {
//       // Allow a user to read and write their own main user document
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//
//       // Rules for the /users/{userId}/publicProfile/{docId} subcollection
//       // Typically, publicProfile would have a single document, e.g., 'profile'
//       match /publicProfile/{profileDocId} {
//         // Allow a user to read and write their own publicProfile document
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//
//       // Rules for the /users/{userId}/releases/{releaseId} subcollection
//       match /releases/{releaseId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//
//       // Rules for the /users/{userId}/events/{eventId} subcollection
//       match /events/{eventId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//     }
//
//     // Rule for COLLECTION GROUP queries on 'publicProfile'
//     // This allows an authenticated user WHO IS A LABEL to list/get documents
//     // from the 'publicProfile' collection group. The client-side query
//     // (e.g., in getManagedArtists) will then filter by 'managedByLabelId' and 'isLabel == false'.
//     match /{path=**}/publicProfile/{profileDocId} { // path=** is crucial for collection group queries
//       allow list, get: if request.auth != null &&
//                           // Check if the currently authenticated user's own profile has isLabel: true
//                           get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true;
//
//       // IMPORTANT: Write access via collection group path is generally not recommended for this use case.
//       // Artists should update their own profiles via the /users/{artistId}/publicProfile/profile path.
//       // Labels might trigger updates via backend functions or by creating new artist profiles.
//       // allow write: if false; // Example: Explicitly disallow writes via this path for safety.
//     }
//   }
// }
//
// === CRITICAL FIRESTORE INDEX for `getManagedArtists` ===
// For the `publicProfile` collection group, you MUST have a composite index:
// 1. Collection ID: `publicProfile` (Target this as a Collection Group in the Firebase Console Index section)
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
// Failure to meet EITHER the index requirement OR the data consistency requirements (especially `isLabel: true` for the querying label user)
// will result in "Permission Denied" or "Failed Precondition" errors for the `getManagedArtists` query.
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


    