
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
    verifyBeforeUpdateEmail as firebaseVerifyBeforeUpdateEmail,
    sendEmailVerification as firebaseSendEmailVerification,
    reload,
    type IdTokenResult
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
                const idTokenResult: IdTokenResult = await getIdToken(user, true);
                setTokenCookie(idTokenResult.token);
            } catch (error) {
                 console.error("Firebase Service: Error getting ID token:", error);
                 removeTokenCookie();
                 user = null;
            }
        } else {
            console.log("Firebase Service: No user detected by listener.");
            removeTokenCookie();
        }
        callback(user);
    });
};


// --- Service Functions ---

 export function initializeRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    console.log(`Attempting to initialize reCAPTCHA on container: ${containerId}`);

    if (!auth) throw new Error("Firebase auth not initialized");
    if (typeof window === 'undefined') throw new Error("reCAPTCHA must be initialized client-side");

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`reCAPTCHA container with ID "${containerId}" not found in the DOM.`);
        throw new Error(`reCAPTCHA container with ID "${containerId}" not found.`);
    }

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

export async function getUserMfaInfo(user: User): Promise<any[]> {
    console.log("MFA is disabled. Returning empty MFA info.");
    return [];
}
