

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
// Review and adjust these rules according to your application's security needs.
//
// Firestore Rules Example:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//
//     // Rule for accessing individual user documents (e.g., /users/{userId})
//     match /users/{userId} {
//       // Allow authenticated users to read their own user document
//       // Restrict which fields can be read if necessary (e.g., only email, name, isLabel)
//       allow get: if request.auth != null && request.auth.uid == userId;
//
//       // Allow authenticated users to write to their own user document
//       allow write: if request.auth != null && request.auth.uid == userId;
//
//       // Disallow listing all user documents by default for security
//       allow list: if false;
//
//       // Rules for subcollections under a user (e.g., releases, events, but NOT publicProfile here)
//       // Allow users full access to their own subcollections like 'releases', 'events'
//       match /{subcollection}/{docId} {
//         // Check that subcollection is not 'publicProfile' to avoid conflict with collection group rule
//         allow read, write: if request.auth != null && request.auth.uid == userId && subcollection != 'publicProfile';
//       }
//     }
//
//     // Rule for the 'publicProfile' collection group
//     // This allows querying across all 'publicProfile' subcollections
//     match /{path=**}/publicProfile/{profileId} {
//       // Allow an authenticated user to read their own profile directly
//       // profileId here refers to the document ID within the publicProfile subcollection (which is 'profile')
//       // The actual user's UID is part of the {path}
//       allow get: if request.auth != null && request.auth.uid == path[1]; // path[1] should be the userId segment
//
//       // Allow an authenticated user to write to their own profile directly
//       allow write: if request.auth != null && request.auth.uid == path[1];
//
//       // Allow a user who is a 'label' to LIST profiles IF the query filters by
//       // 'managedByLabelId' matching the label's UID AND 'isLabel' is false.
//       // This is crucial for the getManagedArtists query.
//       allow list: if request.auth != null &&
//                      get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                      request.query.resource.data.managedByLabelId == request.auth.uid && // This checks the query's where clauses
//                      request.query.resource.data.isLabel == false;
//     }
//   }
// }
//
// // Firebase Storage Rules Example:
// // Users have full control over files within their own designated folders.
// service firebase.storage {
//   match /b/{bucket}/o {
//     // User-specific folders (e.g., profileImages, releaseArtwork, releases)
//     // The {userId} segment in the path is crucial for these rules.
//     match /{path}/{userId}/{allPaths=**} {
//       // Allow read/write only if the authenticated user's UID matches the {userId} in the path.
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//     // Public assets (e.g., default images, site assets) could have more open read rules if needed:
//     // match /public/{allPaths=**} {
//     //   allow read: if true;
//     //   allow write: if false; // Typically, public assets are not writable by clients
//     // }
//   }
// }
// These are example rules. Adjust them based on your exact security requirements.
// Make sure to test these rules thoroughly in the Firebase console.
// Ensure composite indexes are created in Firestore for queries involving multiple 'where' clauses
// or 'orderBy' on different fields, especially for collection group queries.
// For getManagedArtists, an index on 'publicProfile' collection group with 'managedByLabelId' (Asc) and 'isLabel' (Asc) is required.

