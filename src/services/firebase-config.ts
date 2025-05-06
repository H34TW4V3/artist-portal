
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
//     // Users collection
//     match /users/{userId} {
//       // Allow authenticated users to read limited fields (email, uid) from any user document.
//       // Allow users to write to their own document.
//       // Allow labels to create new user documents (for artists).
//       allow get: if request.auth != null;
//       allow list: if false; // Prevent listing all users for security
//       allow create: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true;
//       allow update, delete: if request.auth != null && request.auth.uid == userId;
//     }
//
//     // publicProfile subcollection
//     match /users/{targetUserId}/publicProfile/profile {
//       // Owner has full read/write access.
//       allow read, write: if request.auth != null && request.auth.uid == targetUserId;
//
//       // Labels can read profiles of artists they manage.
//       allow get: if request.auth != null &&
//                     get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                     resource.data.managedByLabelId == request.auth.uid &&
//                     (resource.data.isLabel == false || !('isLabel' in resource.data));
//
//       // Labels can create profiles for new artists they manage.
//       // (Assumes 'managedByLabelId' and 'isLabel: false' are set by the label during creation)
//       allow create: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                       request.resource.data.managedByLabelId == request.auth.uid &&
//                       request.resource.data.isLabel == false;
//
//       // Labels can update profiles of artists they manage.
//       allow update: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                       resource.data.managedByLabelId == request.auth.uid &&
//                       (resource.data.isLabel == false || !('isLabel' in resource.data)) &&
//                       // Prevent label from changing critical fields like 'isLabel' or 'managedByLabelId' of the artist via this rule.
//                       (!('isLabel' in request.resource.data) || request.resource.data.isLabel == false) &&
//                       (!('managedByLabelId' in request.resource.data) || request.resource.data.managedByLabelId == request.auth.uid);
//
//       // Labels can delete profiles of artists they manage (use with caution).
//       allow delete: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                       resource.data.managedByLabelId == request.auth.uid &&
//                       (resource.data.isLabel == false || !('isLabel' in resource.data));
//
//       // Allow any authenticated user to list profiles if querying by managedByLabelId (for the label dashboard)
//       // This requires a composite index on managedByLabelId and isLabel.
//       allow list: if request.auth != null &&
//                     get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                     request.query.resource.data.managedByLabelId == request.auth.uid &&
//                     request.query.resource.data.isLabel == false;
//     }
//
//     // Releases and Events subcollections
//     match /users/{ownerUserId}/releases/{releaseId} {
//       // Owner (artist or label for their direct releases) has full access.
//       allow read, write: if request.auth != null && request.auth.uid == ownerUserId;
//
//       // Labels can read/write releases of artists they manage.
//       allow read, write: if request.auth != null &&
//                             get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                             get(/databases/$(database)/documents/users/$(ownerUserId)/publicProfile/profile).data.managedByLabelId == request.auth.uid;
//     }
//     match /users/{ownerUserId}/events/{eventId} {
//       // Owner (artist or label for their direct events) has full access.
//       allow read, write: if request.auth != null && request.auth.uid == ownerUserId;
//
//       // Labels can read/write events of artists they manage.
//       allow read, write: if request.auth != null &&
//                             get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                             get(/databases/$(database)/documents/users/$(ownerUserId)/publicProfile/profile).data.managedByLabelId == request.auth.uid;
//     }
//   }
// }
//
// // Firebase Storage Rules Example:
// service firebase.storage {
//   match /b/{bucket}/o {
//     // Profile Images
//     match /profileImages/{userId}/{allPaths=**} {
//       // Allow read by anyone (if public profiles).
//       // Allow write only by the owner or a managing label.
//       allow read: if true; // Or request.auth != null for authenticated users only
//       allow write: if request.auth != null &&
//                       (request.auth.uid == userId ||
//                        (get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                         get(/databases/$(database)/documents/users/$(userId)/publicProfile/profile).data.managedByLabelId == request.auth.uid));
//     }
//     // Release Artwork
//     match /releaseArtwork/{ownerUserId}/{allPaths=**} {
//       // Allow read by anyone (if public releases).
//       // Allow write by the owner or a managing label.
//       allow read: if true; // Or request.auth != null
//       allow write: if request.auth != null &&
//                       (request.auth.uid == ownerUserId ||
//                        (get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                         get(/databases/$(database)/documents/users/$(ownerUserId)/publicProfile/profile).data.managedByLabelId == request.auth.uid));
//     }
//     // Release ZIP Files
//     match /releases/{ownerUserId}/{allPaths=**} {
//       // Allow read and write only by the owner or a managing label.
//       allow read, write: if request.auth != null &&
//                             (request.auth.uid == ownerUserId ||
//                              (get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                               get(/databases/$(database)/documents/users/$(ownerUserId)/publicProfile/profile).data.managedByLabelId == request.auth.uid));
//     }
//   }
// }
// These are example rules. Adjust them based on your exact security requirements.
// The key is to ensure that get() calls correctly point to the `publicProfile/profile` document
// when checking `isLabel` or `managedByLabelId`.
// Make sure to test these rules thoroughly in the Firebase console.
