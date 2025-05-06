
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
    RecaptchaVerifier,
    // signInWithPhoneNumber, // No longer needed for MFA
    // PhoneAuthProvider, // No longer needed for MFA
    // PhoneMultiFactorGenerator, // No longer needed for MFA
    // multiFactor, // No longer needed for MFA
    // getMultiFactorResolver, // No longer needed for MFA
    sendSignInLinkToEmail as firebaseSendSignInLinkToEmail,
    isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
    signInWithEmailLink as firebaseSignInWithEmailLink,
    ActionCodeSettings,
    verifyBeforeUpdateEmail as firebaseVerifyBeforeUpdateEmail,
    sendEmailVerification as firebaseSendEmailVerification,
    reload,
    type IdTokenResult
    // MultiFactorResolver, // No longer needed
    // MultiFactorInfo, // No longer needed
    // MultiFactorSession, // No longer needed
    // PhoneInfoOptions, // No longer needed
} from "firebase/auth";
import { app } from './firebase-config'; // Import your Firebase config
import Cookies from 'js-cookie'; // Import js-cookie

// Initialize Firebase Auth
const auth = getAuth(app);

// --- Constants ---
const ID_TOKEN_COOKIE_NAME = 'firebaseIdToken';

// Store verifier instance globally (use with caution, better context/state management preferred)
let globalRecaptchaVerifier: RecaptchaVerifier | null = null;


// --- Helper Functions ---

const setTokenCookie = (token: string) => {
  Cookies.set(ID_TOKEN_COOKIE_NAME, token, {
    expires: 1, // Expires in 1 day
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  console.log("Firebase Service: ID token cookie set.");
};

const removeTokenCookie = () => {
  Cookies.remove(ID_TOKEN_COOKIE_NAME);
  console.log("Firebase Service: ID token cookie removed.");
};

// --- Authentication State Listener ---

export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
    return onIdTokenChanged(auth, async (user) => {
        if (user) {
            console.log("Firebase Service: User detected by listener.");
            try {
                const idTokenResult: IdTokenResult = await getIdToken(user, true); // Use IdTokenResult type
                setTokenCookie(idTokenResult.token);
            } catch (error) {
                 console.error("Firebase Service: Error getting ID token:", error);
                 removeTokenCookie();
                 user = null; // Treat as logged out if token fetch fails
            }
        } else {
            console.log("Firebase Service: No user detected by listener.");
            removeTokenCookie();
        }
        callback(user);
    });
};


// --- Service Functions ---

/**
 * Initializes or retrieves a RecaptchaVerifier instance for a given container ID.
 * Ensures the container exists and attempts to avoid re-initialization if possible.
 * @param containerId - The ID of the HTML element where the reCAPTCHA widget should render.
 * @returns A promise resolving with the RecaptchaVerifier instance.
 */
 export function initializeRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    console.log(`Attempting to initialize reCAPTCHA on container: ${containerId}`);

    if (!auth) throw new Error("Firebase auth not initialized");
    if (typeof window === 'undefined') throw new Error("reCAPTCHA must be initialized client-side");

    // Check if container exists in the DOM
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`reCAPTCHA container with ID "${containerId}" not found in the DOM.`);
        throw new Error(`reCAPTCHA container with ID "${containerId}" not found.`);
    }

    // Clear any previous content in the container *before* initializing
    try {
        container.innerHTML = '';
    } catch (e) {
        console.warn("Could not clear container before initializing reCAPTCHA", e);
    }

    try {
        console.log(`Creating new RecaptchaVerifier for container: ${containerId}`);
        const verifier = new RecaptchaVerifier(auth, containerId, { 
            'size': 'invisible',
            'callback': (response: any) => {
                console.log(`reCAPTCHA verified for ${containerId}`);
            },
            'expired-callback': () => {
                 console.warn(`reCAPTCHA expired for ${containerId}. Resetting required if action pending.`);
                 clearGlobalRecaptchaVerifier(); 
            },
            'error-callback': (error: any) => {
                 console.error(`reCAPTCHA error for ${containerId}:`, error);
                 clearGlobalRecaptchaVerifier(); 
            }
        });

        verifier.render().then((widgetId) => {
            console.log(`reCAPTCHA rendered successfully for ${containerId}, widgetId: ${widgetId}`);
        }).catch(renderError => {
            console.error(`Error rendering reCAPTCHA for ${containerId}:`, renderError);
             if ((renderError as AuthError)?.code === 'auth/argument-error') {
                 console.error("Firebase Auth Argument Error - Ensure 'auth' instance and containerId are valid. Container Element:", container);
                 clearGlobalRecaptchaVerifier(); 
                 throw new Error("Invalid argument initializing reCAPTCHA. Please refresh.");
             }
            try {
                container.innerHTML = ''; 
            } catch (cleanupError){
                console.error("Error cleaning up container after render error:", cleanupError);
            }
             clearGlobalRecaptchaVerifier(); 
             throw new Error("Failed to render reCAPTCHA widget."); 
        });

        globalRecaptchaVerifier = verifier;
        return verifier;

    } catch (error) {
        console.error(`Failed to initialize RecaptchaVerifier for ${containerId}:`, error);
        if ((error as AuthError)?.code === 'auth/argument-error') {
             console.error("Firebase Auth Argument Error - Ensure 'auth' instance and containerId are valid.");
             clearGlobalRecaptchaVerifier();
             throw new Error("Invalid argument initializing reCAPTCHA. Please refresh.");
        }
        throw new Error("Could not initialize security check.");
    }
}

// Function to clear the global verifier, call this on component unmount or modal close
export function clearGlobalRecaptchaVerifier() {
    if (globalRecaptchaVerifier) {
        try {
            globalRecaptchaVerifier.clear();
            console.log("Global reCAPTCHA verifier cleared.");
        } catch (e) {
            console.error("Error clearing global reCAPTCHA verifier:", e);
        }
        globalRecaptchaVerifier = null;
    }
}


export async function login(email: string, password: string): Promise<User> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Firebase Service: Standard login successful.");
        return userCredential.user;
    } catch (error) {
        const authError = error as AuthError;
        // Removed MFA specific check here
        // if (authError.code === 'auth/multi-factor-auth-required') { ... }

        console.error("Firebase Service: Login error:", authError.code, authError.message);
         if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
              throw new Error("Invalid Artist ID or password.");
         } else if (authError.code === 'auth/api-key-not-valid') {
            console.error("Firebase API Key Error: Check NEXT_PUBLIC_FIREBASE_API_KEY.");
            throw new Error("Authentication service is not configured correctly. Please contact support.");
         }
         throw new Error("Login failed. Please try again.");
    }
}

 // --- Email Link Sign-in Functions ---

 export async function sendSignInLinkToEmail(email: string, redirectUrl: string): Promise<void> {
    const actionCodeSettings: ActionCodeSettings = {
        url: redirectUrl,
        handleCodeInApp: true, 
    };

    try {
        await firebaseSendSignInLinkToEmail(auth, email, actionCodeSettings);
        // Store email in localStorage for retrieval on redirect.
        // Firebase itself also often stores this, but this is a fallback.
        localStorage.setItem('emailForSignIn', email);
        console.log("Firebase Service: Sign-in link sent to:", email);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error sending sign-in link:", authError.code, authError.message);
         if (authError.code === 'auth/invalid-email') {
             throw new Error("Please enter a valid email address.");
         }
         if (authError.code === 'auth/unauthorized-continue-uri') {
             console.error(`Firebase Auth Error: The domain used in redirectUrl ('${redirectUrl}') is not authorized. Add it to your Firebase project's Authentication -> Settings -> Authorized domains.`);
             throw new Error("This domain is not configured for email link sign-in. Please contact support or check Firebase settings.");
         }
        throw new Error("Could not send sign-in link. Please try again.");
    }
 }

 export function isSignInWithEmailLink(url: string): boolean {
    return firebaseIsSignInWithEmailLink(auth, url);
 }

 export async function signInWithEmailLink(url: string, email: string | null): Promise<User> {
    if (!firebaseIsSignInWithEmailLink(auth, url)) {
        throw new Error("Invalid sign-in link.");
    }
    
    let finalEmail = email;
    if (!finalEmail) {
        finalEmail = localStorage.getItem('emailForSignIn');
    }


    if (!finalEmail) {
        console.error("Firebase Service: Email is required to complete sign-in with email link. Not found in arg or localStorage.");
        throw new Error("Email confirmation is missing. Please try signing in again from the link, ensuring you are on the same browser/device.");
    }

    try {
        const userCredential = await firebaseSignInWithEmailLink(auth, finalEmail, url);
        console.log("Firebase Service: Sign-in with email link successful.");
        // Clear the stored email after successful sign-in
        localStorage.removeItem('emailForSignIn');
        return userCredential.user;
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error signing in with email link:", authError.code, authError.message);
        if (authError.code === 'auth/invalid-action-code') {
            throw new Error("Sign-in link is invalid or has expired. Please request a new one.");
        }
        if (authError.code === 'auth/invalid-email') {
             throw new Error("The email provided does not match the sign-in link.");
        }
        throw new Error("Could not sign in using the provided link.");
    }
 }


// Logout function
export async function logout(): Promise<void> {
    try {
        await signOut(auth);
        removeTokenCookie();
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

/**
 * Sends a verification link to the user's NEW email address before updating it.
 * Handles cases where re-authentication is required.
 * @param newEmail - The new email address to verify and update to.
 * @returns A promise resolving when the verification email is sent.
 */
export async function verifyBeforeUpdateEmail(newEmail: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No authenticated user found.");
    }
    if (user.email === newEmail) {
        throw new Error("The new email is the same as the current one.");
    }

    try {
        await firebaseVerifyBeforeUpdateEmail(user, newEmail);
        console.log("Firebase Service: Verification email sent to new address:", newEmail);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error sending email update verification:", authError.code, authError.message);
        if (authError.code === 'auth/requires-recent-login') {
            throw new Error("This operation is sensitive and requires recent authentication. Please log out and log back in before changing your email.");
        } else if (authError.code === 'auth/email-already-in-use') {
             throw new Error("This email address is already associated with another account.");
        } else if (authError.code === 'auth/invalid-email') {
            throw new Error("The new email address is invalid.");
        }
        throw new Error("Could not send verification email. Please try again.");
    }
}

/**
 * Sends an email verification link to the user's currently registered email address.
 * Useful if the user's email is not yet verified.
 * @returns A promise resolving when the verification email is sent.
 */
export async function sendVerificationEmail(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No authenticated user found.");
    }
    if (user.emailVerified) {
        console.log("Firebase Service: Email is already verified.");
        return;
    }

    try {
        await firebaseSendEmailVerification(user);
        console.log("Firebase Service: Verification email sent to current address:", user.email);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Error sending verification email:", authError.code, authError.message);
         if (authError.code === 'auth/too-many-requests') {
             throw new Error("Too many verification emails sent recently. Please wait before trying again.");
         }
        throw new Error("Could not send verification email. Please try again.");
    }
}

// --- SMS MFA Service Functions (Removed as per request) ---
// All functions related to enrolling, unenrolling, verifying MFA via SMS have been removed.
// Functions like sendSmsVerificationCode, completeMfaSignIn, enrollSmsMfa, unenrollSmsMfa, getUserMfaInfo, etc.
// are no longer present.

// Function to get current user's MFA enrollment info - this is a simplified version or should be removed if MFA is entirely gone.
// If MFA is completely removed, this function is not needed.
// For now, let's assume it returns an empty array if MFA features are off.
export async function getUserMfaInfo(user: User): Promise<any[]> { // Use `any[]` or a more specific empty type
    console.log("MFA is disabled. Returning empty MFA info.");
    return []; // Return empty array as MFA is removed
}
