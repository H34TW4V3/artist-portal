
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
// These rules aim to allow label users to read managed artist profiles
// and allow all users to manage their own data.
//
// Firestore Rules Example:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {

//     // Rule for the 'publicProfile' collection group.
//     // This allows authenticated users to read profiles based on specific conditions.
//     match /{path=**}/publicProfile/{docId} {
//       allow read: if request.auth != null && (
//                     // Condition 1: User is reading their OWN publicProfile document.
//                     // Assumes 'profile' is the fixed docId for public profiles.
//                     // path[1] should correspond to the userId segment in 'users/{userId}/publicProfile/profile'.
//                     (path.size() == 4 && path[0] == 'users' && path[1] == request.auth.uid && path[2] == 'publicProfile' && docId == 'profile') ||
                    
//                     // Condition 2: A label user is reading a managed artist's profile.
//                     (
//                       // Check if the requesting user is a label by looking up their own profile.
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                       // Check if the profile being read (resource.data) is managed by this label and is an artist profile.
//                       resource.data.managedByLabelId == request.auth.uid &&
//                       resource.data.isLabel == false
//                     )
//                   );
//       // Allow user to write to their OWN publicProfile document.
//       allow write: if request.auth != null &&
//                       path.size() == 4 && path[0] == 'users' && path[1] == request.auth.uid &&
//                       path[2] == 'publicProfile' && docId == 'profile';
//     }

//     // Rules for the root 'users' collection and user-specific subcollections.
//     match /users/{userId} {
//       // Allow authenticated user to read limited fields of their own root user document.
//       // Or, allow reading any user's root doc if specific public fields are needed and secured by `hasOnly`.
//       allow get: if request.auth != null && request.auth.uid == userId; 
//       // Example for more public root doc (if needed, careful with data exposure):
//       // allow get: if request.auth != null && resource.data.keys().hasOnly(['email', 'name', 'isLabel', 'uid']);

//       // Allow user to write to their own root user document.
//       allow write: if request.auth != null && request.auth.uid == userId;

//       // User can manage their own 'releases' subcollection.
//       match /releases/{releaseId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
      
//       // User can manage their own 'events' subcollection.
//       match /events/{eventId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//       // Note: The specific rule for /users/{userId}/publicProfile/{docId} for owner access
//       // is now handled by the collection group rule above (Condition 1 for read, and the write rule).
//     }
//   }
// }
//
// Crucial Firestore Index for `getManagedArtists`:
// For the `publicProfile` collection group, you MUST have a composite index:
// 1. `managedByLabelId` (Ascending)
// 2. `isLabel` (Ascending OR Descending - either should work)
//
// Without this index, the collection group query in `getManagedArtists` will fail, often with a
// "FAILED_PRECONDITION" error or a permission denied error if rules try to enforce query constraints
// that Firestore cannot satisfy without an index.
//
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
