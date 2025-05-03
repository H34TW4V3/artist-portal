
// Import necessary Firebase modules
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onIdTokenChanged,
    getIdToken,
    type User,
    type AuthError,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    updatePassword as firebaseUpdatePassword,
    // Import necessary MFA functions
    RecaptchaVerifier,
    signInWithPhoneNumber,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    multiFactor,
    getMultiFactorResolver, // Import this helper
    // Import Email Link functions
    sendSignInLinkToEmail as firebaseSendSignInLinkToEmail,
    isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
    signInWithEmailLink as firebaseSignInWithEmailLink,
    ActionCodeSettings,
} from "firebase/auth";
import { app } from './firebase-config'; // Import your Firebase config
import Cookies from 'js-cookie'; // Import js-cookie

// Initialize Firebase Auth
const auth = getAuth(app);

// --- Constants ---
const ID_TOKEN_COOKIE_NAME = 'firebaseIdToken'; // Cookie name for storing the token
const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn'; // localStorage key for email link sign-in

// --- Helper Functions ---

// Set token cookie
const setTokenCookie = (token: string) => {
  Cookies.set(ID_TOKEN_COOKIE_NAME, token, {
    expires: 1, // Expires in 1 day
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'strict', // Protection against CSRF
  });
  console.log("Firebase Service: ID token cookie set.");
};

// Remove token cookie
const removeTokenCookie = () => {
  Cookies.remove(ID_TOKEN_COOKIE_NAME);
  console.log("Firebase Service: ID token cookie removed.");
};

// --- Authentication State Listener ---

// Updated listener that also manages the cookie
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
    return onIdTokenChanged(auth, async (user) => {
        if (user) {
            console.log("Firebase Service: User detected by listener.");
            try {
                const idToken = await getIdToken(user, /* forceRefresh */ true); // Force refresh to get latest token
                setTokenCookie(idToken);
            } catch (error) {
                 console.error("Firebase Service: Error getting ID token:", error);
                 // Handle error appropriately, maybe sign the user out or clear the cookie
                 removeTokenCookie();
                 user = null; // Treat as signed out if token fetching fails
            }
        } else {
            console.log("Firebase Service: No user detected by listener.");
            removeTokenCookie();
        }
        callback(user); // Notify the application of the auth state change
    });
};


// --- Service Functions ---

// Function to initialize reCAPTCHA (used for phone MFA, potentially other actions)
export function initializeRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    // Ensure auth is initialized
    if (!auth) throw new Error("Firebase auth not initialized");
    // Ensure this runs client-side
    if (typeof window === 'undefined') throw new Error("reCAPTCHA must be initialized client-side");

    // IMPORTANT: Add your reCAPTCHA site key from Firebase Console
    // You might need to handle widget cleanup if the component unmounts
    return new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible', // Or 'normal'
        'callback': (response: any) => {
            // reCAPTCHA solved, allow phone number submission.
            console.log("reCAPTCHA verified");
        },
        'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
             console.warn("reCAPTCHA expired");
        }
    });
}


// Login with Email and Password - Handles MFA requirement
export async function login(email: string, password: string): Promise<User | { mfaResolver: any, hints: any[] }> { // Return type updated
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Standard login successful, token is handled by the listener
        console.log("Firebase Service: Standard login successful.");
        return userCredential.user;
    } catch (error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/multi-factor-auth-required') {
            console.log("Firebase Service: MFA required.");
            // Get the resolver and hints from the error
            const resolver = getMultiFactorResolver(auth, authError);
            const hints = resolver.hints; // Hints contain info about enrolled factors (like phone number)
            // Return necessary info to the UI to handle MFA
            return { mfaResolver: resolver, hints: hints };
        }

        console.error("Firebase Service: Login error:", authError.code, authError.message);
         // Provide more specific error messages based on common codes
         if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-login-credentials') {
              throw new Error("Invalid Artist ID or password."); // Keep using generic message for security
         } else if (authError.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
            throw new Error("Authentication service is not configured correctly. Please contact support.");
         }
         // Fallback for other errors
         throw new Error("Login failed. Please try again.");
    }
}

 // Send SMS Verification Code for MFA
 export async function sendMfaVerificationCode(mfaResolver: any, phoneInfoOptions: any, recaptchaVerifier: RecaptchaVerifier): Promise<string> {
    try {
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
        console.log("Firebase Service: MFA verification code sent, ID:", verificationId);
        return verificationId;
    } catch (error) {
        console.error("Firebase Service: Error sending MFA code:", error);
        throw new Error("Failed to send verification code.");
    }
 }

 // Complete MFA Sign-in with SMS Code
 export async function completeMfaSignIn(mfaResolver: any, verificationId: string, verificationCode: string): Promise<User> {
    try {
        const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
        const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
        const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);

        // Token setting is handled by the listener on successful sign-in
        console.log("Firebase Service: MFA sign-in successful.");

        return userCredential.user;
    } catch (error) {
        console.error("Firebase Service: Error verifying MFA code:", error);
         if ((error as AuthError).code === 'auth/invalid-verification-code') {
            throw new Error("Invalid verification code.");
         } else if ((error as AuthError).code === 'auth/code-expired') {
             throw new Error("Verification code has expired.");
         }
        throw new Error("Failed to verify code.");
    }
 }

 // --- Email Link Sign-in Functions ---

 /**
  * Sends a sign-in link to the user's email.
  * @param email The email address to send the link to.
  * @param redirectUrl The URL the user should be redirected to after clicking the link.
  */
 export async function sendSignInLinkToEmail(email: string, redirectUrl: string): Promise<void> {
    const actionCodeSettings: ActionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be authorized domain list in the Firebase Console.
        url: redirectUrl,
        // This must be true.
        handleCodeInApp: true,
        // Optional iOS/Android settings can be added here
    };

    try {
        await firebaseSendSignInLinkToEmail(auth, email, actionCodeSettings);
        // The link was successfully sent. Inform the user.
        // Save the email locally so you don't need to ask the user for it again
        // if they open the link on the same device.
        window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
        console.log("Firebase Service: Sign-in link sent to:", email);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error sending sign-in link:", authError.code, authError.message);
         if (authError.code === 'auth/invalid-email') {
             throw new Error("Please enter a valid email address.");
         }
        throw new Error("Could not send sign-in link. Please try again.");
    }
 }

 /**
  * Checks if the current URL is a Firebase email sign-in link.
  * @param url The current window URL.
  * @returns True if it's a sign-in link, false otherwise.
  */
 export function isSignInWithEmailLink(url: string): boolean {
    return firebaseIsSignInWithEmailLink(auth, url);
 }

 /**
  * Signs the user in using the email link.
  * @param url The full URL the user clicked.
  * @returns A promise resolving to the signed-in User object.
  * @throws Error if sign-in fails or email is missing.
  */
 export async function signInWithEmailLink(url: string): Promise<User> {
    // Confirm the link is authentic.
    if (!firebaseIsSignInWithEmailLink(auth, url)) {
        throw new Error("Invalid sign-in link.");
    }

    // Get the email from localStorage if available.
    let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
    if (!email) {
      // User opened the link on a different device. To prevent session fixation
      // attacks, ask the user to provide the email again. For simplicity here,
      // we'll throw an error, but a real app should prompt the user.
      // email = window.prompt('Please provide your email for confirmation');
      // if (!email) {
        throw new Error("Email confirmation required. Please try signing in again on the original device or enter your email when prompted.");
      // }
    }

    try {
        const userCredential = await firebaseSignInWithEmailLink(auth, email, url);
        // Clear the email from storage.
        window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
        // Token setting is handled by the listener on successful sign-in
        console.log("Firebase Service: Sign-in with email link successful.");
        return userCredential.user;
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error signing in with email link:", authError.code, authError.message);
        if (authError.code === 'auth/invalid-action-code') {
            throw new Error("Sign-in link is invalid or has expired. Please request a new one.");
        }
        throw new Error("Could not sign in using the provided link.");
    }
 }


// Logout function
export async function logout(): Promise<void> {
    try {
        await signOut(auth);
        removeTokenCookie(); // Ensure cookie is removed immediately
        console.log("Firebase Service: User signed out successfully.");
    } catch (error) {
        console.error("Firebase Service: Logout error:", error);
        throw new Error("Logout failed. Please try again.");
    }
}

// Send Password Reset Email
export async function sendPasswordResetEmail(email: string): Promise<void> {
    try {
        await firebaseSendPasswordResetEmail(auth, email);
        console.log("Firebase Service: Password reset email sent to:", email);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error sending password reset email:", authError.code, authError.message);
         if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-email') {
            // Don't reveal if email exists for security
             throw new Error("If an account exists for this email, a password reset link has been sent.");
         }
        throw new Error("Could not send password reset email. Please try again.");
    }
}

// Update User Password
export async function updateUserPassword(newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No authenticated user found.");
    }
    try {
        await firebaseUpdatePassword(user, newPassword);
        console.log("Firebase Service: Password updated successfully for user:", user.uid);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error updating password:", authError.code, authError.message);
        if (authError.code === 'auth/requires-recent-login') {
            throw new Error("This operation is sensitive and requires recent authentication. Please log out and log back in before changing your password.");
        } else if (authError.code === 'auth/weak-password') {
             throw new Error("Password is too weak. Please choose a stronger password.");
        }
        throw new Error("Could not update password. Please try again.");
    }
}
