

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
//     // WARNING: The following rule allows all users (authenticated or not)
//     // to read and write ANY document in your ENTIRE database.
//     // This is EXTREMELY INSECURE and should NEVER be used in production.
//     // Use this ONLY for temporary debugging if you are completely stuck.
//     // Replace with fine-grained, secure rules as soon as possible.
//     match /{document=**} {
//       allow read, write: if true;
//     }
//   }
// }
//
// === CRITICAL FIRESTORE INDEX for `getManagedArtists` (if using previous, more secure rules) ===
// For the `publicProfile` collection group, you MUST have a composite index:
// 1. Collection ID: `publicProfile` (Ensure this is targeted as a Collection Group in the Firebase Console Index section)
// 2. Fields:
//    - `managedByLabelId` (Ascending)
//    - `isLabel` (Ascending)
// Scope: Collection group
//
// === CRITICAL DATA CONSISTENCY for `getManagedArtists` (if using previous, more secure rules) ===
// 1. Label User's Profile: The document at `/users/{labelUserId}/publicProfile/profile` for the label user
//    MUST contain the field `isLabel: true`.
// 2. Artist User's Profile: For each artist managed by the label, their document at
//    `/users/{artistId}/publicProfile/profile` MUST contain:
//    - `managedByLabelId: "{labelUserId}"` (where {labelUserId} is the UID of the managing label)
//    - `isLabel: false`
//
// Failure to meet EITHER the index requirement OR the data consistency requirements will result in "Permission Denied"
// or "Failed Precondition" errors for the `getManagedArtists` query when using more restrictive rules.
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

