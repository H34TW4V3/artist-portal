
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
// The following rules grant users full read/write access to their own data.
//
// Firestore Rules Example:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//
//     // Users collection: User can read and write their own root document.
//     // No one else can list all users or read/write other users' root documents directly via these rules.
//     match /users/{userId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//       // Prevent listing all users for security by default
//       allow list: if false;
//     }
//
//     // Subcollections under a user's document (e.g., publicProfile, releases, events):
//     // User has full read/write access to all documents within their own subcollections.
//     match /users/{userId}/{collectionId}/{docId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//
//     // If you still need specific rules for labels managing artists, those would be ADDED to the above.
//     // For example, a label might need to read an artist's publicProfile if managedByLabelId matches.
//     // However, for the user's own data, the rules above are sufficient.
//     //
//     // Example for allowing a label to read managed artist's publicProfile:
//     // match /users/{artistUserId}/publicProfile/profile {
//     //   // Artist can read/write their own profile
//     //   allow read, write: if request.auth != null && request.auth.uid == artistUserId;
//     //   // Label can read profile of artist they manage
//     //   allow get: if request.auth != null &&
//     //                get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//     //                resource.data.managedByLabelId == request.auth.uid;
//     // }
//     //
//     // Similar rules would apply for a label to manage an artist's releases or events, always checking
//     // `isLabel` for the requester and `managedByLabelId` on the target artist's profile.
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

