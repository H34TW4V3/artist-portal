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
//     // Rule for label accounts to query and read artist profiles they manage
//     // This rule applies to collection group queries on 'publicProfile'.
//     match /{path=**}/publicProfile/{profileId} {
//       allow read: if request.auth != null &&
//                      // Check if the requester is a label
//                      get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                      // Check if the profile being read is managed by this label
//                      resource.data.managedByLabelId == request.auth.uid &&
//                      // Ensure the profile being read is an artist's profile
//                      resource.data.isLabel == false;
//
//       // Allow users to write to their own profile.
//       // path[1] extracts the {userId} from the full path like "users/{userId}/publicProfile/profile"
//       allow write: if request.auth != null && path[1] == request.auth.uid;
//     }
//
//     match /users/{userId} {
//       // Allow authenticated users to get their own root user document if needed (e.g., for basic auth checks).
//       // The fields read are restricted by isSafeRead.
//       allow get: if request.auth != null && request.auth.uid == userId && isSafeRead();
//
//       function isSafeRead() {
//         // Restrict which fields can be accessed from the root user document.
//         // Include 'isLabel' for the label check in the collection group rule.
//         // Include 'uid' as it's a common field to have at the root.
//         return request.resource == null || resource.data.keys().hasAny(['email', 'name', 'imageUrl', 'isLabel', 'uid']);
//       }
//
//       // Users can only write to their own root document (e.g., if you store email/name at root too).
//       // Ensure that changes to 'isLabel' at the root are handled securely if allowed directly by clients.
//       allow write: if request.auth != null && request.auth.uid == userId;
//
//       // User can manage their own publicProfile subcollection documents (e.g., /users/{userId}/publicProfile/profile)
//       match /publicProfile/{docId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//
//       // User can manage their own releases
//       match /releases/{releaseId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//
//       // User can manage their own events
//       match /events/{eventId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
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
// For getManagedArtists, an index on 'publicProfile' collection group with:
//   - 'managedByLabelId' (Ascending)
//   - 'isLabel' (Ascending)
// is required.
// The `get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel` check
// in the collection group rule is a direct document read and does not require special indexing for that part,
// but the overall query on `publicProfile` for `managedByLabelId` and `isLabel` needs the composite index.
