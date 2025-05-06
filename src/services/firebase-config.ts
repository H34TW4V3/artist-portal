
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

// Important Note on Storage Rules:
// Ensure your Firebase Storage security rules allow users to upload to their specific paths (e.g., `releases/{userId}/{fileName}`).
// A typical rule might look like:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//
//     // Root user document:
//     // - Authenticated users can get their own document or other user documents (e.g., to check isLabel).
//     // - Labels can create new user documents (for onboarding artists).
//     // - Users can update/delete their own root document.
//     match /users/{userId} {
//       allow get: if request.auth != null;
//       allow list: if false; // Generally, disallow listing all users for security/performance
//       allow create: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true;
//       allow update, delete: if request.auth != null && request.auth.uid == userId;
//     }
//
//     // Public profile subcollection:
//     // - Owner has full access.
//     // - Labels can manage profiles of artists linked to them.
//     match /users/{targetUserId}/publicProfile/profile {
//       // Owner access
//       allow read, write: if request.auth != null && request.auth.uid == targetUserId;
//
//       // Label Read Access to Managed Artist Profile
//       allow get: if request.auth != null &&
//                     get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                     resource.data.managedByLabelId == request.auth.uid &&
//                     (resource.data.isLabel == false || !('isLabel' in resource.data)); // Ensure target is an artist
//
//       // Label Create Access for New Artist Profile
//       // (Assumes 'managedByLabelId' and 'isLabel: false' are set in the incoming data by the label)
//       allow create: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                       request.resource.data.managedByLabelId == request.auth.uid &&
//                       request.resource.data.isLabel == false;
//
//       // Label Update Access to Managed Artist Profile
//       allow update: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                       resource.data.managedByLabelId == request.auth.uid &&
//                       (resource.data.isLabel == false || !('isLabel' in resource.data)) &&
//                       // Prevent label from changing an artist to a label or changing the manager via this rule
//                       (!('isLabel' in request.resource.data) || request.resource.data.isLabel == false) &&
//                       (!('managedByLabelId' in request.resource.data) || request.resource.data.managedByLabelId == request.auth.uid);
//
//       // Label Delete Access to Managed Artist Profile
//       allow delete: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//                       resource.data.managedByLabelId == request.auth.uid &&
//                       (resource.data.isLabel == false || !('isLabel' in resource.data));
//     }
//
//     // Releases and Events subcollections: Full access for the owner (artist or label for their own direct releases/events)
//     match /users/{userId}/releases/{releaseId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//       // Add rule for labels to manage releases of their artists if needed:
//       // allow read, write: if request.auth != null &&
//       //                      get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//       //                      get(/databases/$(database)/documents/users/$(userId)/publicProfile/profile).data.managedByLabelId == request.auth.uid;
//     }
//     match /users/{userId}/events/{eventId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//       // Add rule for labels to manage events of their artists if needed (similar to releases)
//     }
//   }
// }
//
// // Corresponding Storage Rules:
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /profileImages/{userId}/{allPaths=**} {
//       allow read: if request.auth != null; // Or more restrictive if needed
//       allow write: if request.auth != null && request.auth.uid == userId;
//       // Add rule for labels to write to their artists' profileImages if needed
//       // allow write: if request.auth != null &&
//       //                get(/databases/$(database)/documents/users/$(request.auth.uid)/publicProfile/profile).data.isLabel == true &&
//       //                get(/databases/$(database)/documents/users/$(userId)/publicProfile/profile).data.managedByLabelId == request.auth.uid;
//     }
//     match /releases/{userId}/{allPaths=**} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//       // Add rule for labels (similar to above)
//     }
//     match /releaseArtwork/{userId}/{allPaths=**} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//       // Add rule for labels (similar to above)
//     }
//   }
// }
// Review and adjust these rules according to your application's security needs.
