
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
    signInWithPhoneNumber,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    multiFactor,
    getMultiFactorResolver,
    sendSignInLinkToEmail as firebaseSendSignInLinkToEmail,
    isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
    signInWithEmailLink as firebaseSignInWithEmailLink,
    ActionCodeSettings,
    // Import email update and verification functions
    verifyBeforeUpdateEmail as firebaseVerifyBeforeUpdateEmail,
    sendEmailVerification as firebaseSendEmailVerification,
} from "firebase/auth";
import { app } from './firebase-config'; // Import your Firebase config
import Cookies from 'js-cookie'; // Import js-cookie

// Initialize Firebase Auth
const auth = getAuth(app);

// --- Constants ---
const ID_TOKEN_COOKIE_NAME = 'firebaseIdToken';
const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';

// --- Helper Functions ---

const setTokenCookie = (token: string) => {
  Cookies.set(ID_TOKEN_COOKIE_NAME, token, {
    expires: 1,
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
                const idToken = await getIdToken(user, true);
                setTokenCookie(idToken);
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
    if (!auth) throw new Error("Firebase auth not initialized");
    if (typeof window === 'undefined') throw new Error("reCAPTCHA must be initialized client-side");

    return new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible',
        'callback': (response: any) => {
            console.log("reCAPTCHA verified");
        },
        'expired-callback': () => {
             console.warn("reCAPTCHA expired");
        }
    });
}


export async function login(email: string, password: string): Promise<User | { mfaResolver: any, hints: any[] }> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Firebase Service: Standard login successful.");
        return userCredential.user;
    } catch (error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/multi-factor-auth-required') {
            console.log("Firebase Service: MFA required.");
            const resolver = getMultiFactorResolver(auth, authError);
            const hints = resolver.hints;
            return { mfaResolver: resolver, hints: hints };
        }

        console.error("Firebase Service: Login error:", authError.code, authError.message);
         if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-login-credentials') {
              throw new Error("Invalid Artist ID or password.");
         } else if (authError.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
            throw new Error("Authentication service is not configured correctly. Please contact support.");
         }
         throw new Error("Login failed. Please try again.");
    }
}

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

 export async function completeMfaSignIn(mfaResolver: any, verificationId: string, verificationCode: string): Promise<User> {
    try {
        const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
        const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
        const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
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

 export async function sendSignInLinkToEmail(email: string, redirectUrl: string): Promise<void> {
    const actionCodeSettings: ActionCodeSettings = {
        url: redirectUrl,
        handleCodeInApp: true,
    };

    try {
        await firebaseSendSignInLinkToEmail(auth, email, actionCodeSettings);
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

 export function isSignInWithEmailLink(url: string): boolean {
    return firebaseIsSignInWithEmailLink(auth, url);
 }

 export async function signInWithEmailLink(url: string): Promise<User> {
    if (!firebaseIsSignInWithEmailLink(auth, url)) {
        throw new Error("Invalid sign-in link.");
    }

    let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
    if (!email) {
        throw new Error("Email confirmation required. Please try signing in again on the original device or enter your email when prompted.");
    }

    try {
        const userCredential = await firebaseSignInWithEmailLink(auth, email, url);
        window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
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
    // Optional: Basic check if email is the same
    if (user.email === newEmail) {
        throw new Error("The new email is the same as the current one.");
    }

    // Define actionCodeSettings for the verification link if needed
    // (e.g., redirect URL after verification)
    // const actionCodeSettings = { url: 'http://localhost:3000/profile' }; // Example redirect

    try {
        // await firebaseVerifyBeforeUpdateEmail(user, newEmail, actionCodeSettings);
        await firebaseVerifyBeforeUpdateEmail(user, newEmail); // Call without settings if no redirect needed
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
        throw new Error("Your email is already verified.");
    }

    // Optional: Define actionCodeSettings for redirect after verification
    // const actionCodeSettings = { url: 'http://localhost:3000/dashboard' }; // Example redirect

    try {
        // await firebaseSendEmailVerification(user, actionCodeSettings);
        await firebaseSendEmailVerification(user); // Call without settings if no redirect needed
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
