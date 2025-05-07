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
// Firestore Rules Example (Updated as per user request):
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {

//     // Rule for accessing publicProfile documents (potentially via collection group query)
//     // WARNING: This rule allows ANY authenticated user to read/write ANY publicProfile document.
//     // This is very permissive and likely not secure for production.
//     // For collection group queries, a rule like match /{path=**}/publicProfile/{docId} might be needed
//     // with more specific conditions if the below doesn't correctly target collection group reads.
//     match /users/{userId}/publicProfile/{docId} {
//       allow read, write: if request.auth != null;
//     }

//     match /users/{userId} {
//       // Allow authenticated users to read their own user document if it matches isSafeRead criteria.
//       // This rule implies that the fields being read from /users/{userId} must be within the isSafeRead list.
//       allow read: if request.auth != null && isSafeRead();

//       function isSafeRead() {
//         // Restrict which fields can be accessed from the root user document.
//         return request.resource == null || resource.data.keys().hasAny(['email', 'name', 'imageUrl']);
//       }

//       // Allow users to write to their own root user document.
//       allow write: if request.auth != null && request.auth.uid == userId;

//       // This specific rule for publicProfile under /users/{userId} is now redundant
//       // if the above /users/{userId}/publicProfile/{docId} rule is intended to cover it.
//       // However, if the above rule is for collection group and this is for direct access by owner:
//       // match /publicProfile/{docId} { // Path: /users/{userId}/publicProfile/{docId}
//       //  allow read, write: if request.auth != null && request.auth.uid == userId;
//       // }

//       // User can manage their own releases
//       match /releases/{releaseId} { // Path: /users/{userId}/releases/{releaseId}
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
      
//       // User can manage their own events
//       match /events/{eventId} { // Path: /users/{userId}/events/{eventId}
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//     }
//   }
// }
//
// Firebase Storage Rules Example (No changes made based on request, assuming existing rules are in place):
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /{path}/{userId}/{allPaths=**} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }

// These are example rules. Adjust them based on your exact security requirements.
// Make sure to test these rules thoroughly in the Firebase console.
// Ensure composite indexes are created in Firestore for queries involving multiple 'where' clauses
// or 'orderBy' on different fields, especially for collection group queries.
// For getManagedArtists, an index on 'publicProfile' collection group with:
//   - 'managedByLabelId' (Ascending)
//   - 'isLabel' (Ascending)
// is required.
// The `get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile)` check
// in a more secure collection group rule needs the root user document to be readable, potentially with isLabel.
// The provided rule `match /users/{userId}/publicProfile/{docId} { allow read, write: if request.auth != null; }` is very broad.
// If it's meant for the collection group query, it should generally be `match /{path=**}/publicProfile/{docId}`.
// As written, it will allow any authenticated user to read/write any user's public profile.
// This will "fix" the permission error for reading, but it's a security concern.
// The `getManagedArtists` function also relies on reading the `isLabel` field from the *requesting user's* profile.
// The rule `match /users/{userId} { allow read: if request.auth != null && isSafeRead(); }`
// and `isSafeRead()` needs to allow reading of `isLabel` from `/users/{labelUserId}/publicProfile/profile` (or wherever `isLabel` is stored for the label user).
// If `isLabel` is in the /users/{userId}/publicProfile/profile doc, then the rule
// `match /users/{userId}/publicProfile/{docId} { allow read, write: if request.auth != null; }` will allow reading it.
