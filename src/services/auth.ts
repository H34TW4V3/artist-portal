
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
    reload, // Import reload
    // Import MFA functions
    MultiFactorResolver,
    MultiFactorInfo,
    MultiFactorSession,
    PhoneInfoOptions,
    type IdTokenResult
} from "firebase/auth";
import { app } from './firebase-config'; // Import your Firebase config
import Cookies from 'js-cookie'; // Import js-cookie

// Initialize Firebase Auth
const auth = getAuth(app);

// --- Constants ---
const ID_TOKEN_COOKIE_NAME = 'firebaseIdToken';
const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';

// Store verifier instance globally (use with caution, better context/state management preferred)
// This helps prevent re-initialization issues if the component re-renders quickly.
let globalRecaptchaVerifier: RecaptchaVerifier | null = null;


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
                const idTokenResult: IdTokenResult = await getIdToken(user, true); // Use IdTokenResult type
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

    // Attempt to reuse the global instance if it exists and wasn't cleared
    // if (globalRecaptchaVerifier) {
    //     console.log("Reusing existing global reCAPTCHA verifier.");
    //     // Optional: Could try to re-render if needed, but often reuse works.
    //     // Be cautious with this, might cause issues if the context changed.
    //     return globalRecaptchaVerifier;
    // }

    try {
        // Clear any previous content in the container *before* initializing
        // This helps if the component remounted and left old elements
        container.innerHTML = '';

        console.log(`Creating new RecaptchaVerifier for container: ${containerId}`);
        const verifier = new RecaptchaVerifier(auth, container, { // Pass the element directly
            'size': 'invisible',
            'callback': (response: any) => {
                console.log(`reCAPTCHA verified for ${containerId}`);
                // reCAPTCHA solved, allow signInWithPhoneNumber.
            },
            'expired-callback': () => {
                 console.warn(`reCAPTCHA expired for ${containerId}. Resetting...`);
                 // Response expired. Ask user to solve reCAPTCHA again.
                 // Consider clearing and re-initializing or prompting user.
                 verifier.render().catch(renderError => {
                     console.error(`Error re-rendering expired reCAPTCHA for ${containerId}:`, renderError);
                 });
            },
            'error-callback': (error: any) => {
                 console.error(`reCAPTCHA error for ${containerId}:`, error);
                 // Handle error (e.g., network issue)
            }
        });

        // Render the verifier explicitly
        verifier.render().then((widgetId) => {
            console.log(`reCAPTCHA rendered successfully for ${containerId}, widgetId: ${widgetId}`);
        }).catch(renderError => {
            console.error(`Error rendering reCAPTCHA for ${containerId}:`, renderError);
            // Attempt cleanup if render fails
            try {
                container.innerHTML = ''; // Clear container again on render error
            } catch (cleanupError){
                console.error("Error cleaning up container after render error:", cleanupError);
            }
            throw new Error("Failed to render reCAPTCHA widget."); // Propagate error
        });

        // Store the new instance globally (consider context/state for better management)
        globalRecaptchaVerifier = verifier;

        return verifier;

    } catch (error) {
        console.error(`Failed to initialize RecaptchaVerifier for ${containerId}:`, error);
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


export async function login(email: string, password: string): Promise<User | { mfaResolver: MultiFactorResolver, hints: MultiFactorInfo[] }> {
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

 export async function sendMfaVerificationCode(mfaResolver: MultiFactorResolver, phoneInfoOptions: PhoneInfoOptions, recaptchaVerifier: RecaptchaVerifier): Promise<string> {
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

 export async function completeMfaSignIn(mfaResolver: MultiFactorResolver, verificationId: string, verificationCode: string): Promise<User> {
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
        // Prompt user for email if not found in localStorage
        email = window.prompt('Please provide your email for confirmation');
        if (!email) {
            throw new Error("Email confirmation required.");
        }
        // Optionally save the entered email back to localStorage if needed later
        // window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
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
             // Don't reveal if email exists
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

    try {
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
        // Optionally, just return without error if already verified
        console.log("Firebase Service: Email is already verified.");
        return;
        // Or: throw new Error("Your email is already verified.");
    }

    try {
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

// --- SMS MFA Service Functions ---

/**
 * Sends an SMS verification code to the user's phone number for MFA enrollment.
 * @param user - The currently authenticated Firebase User object.
 * @param phoneNumber - The phone number to verify (must be associated with the user or provided).
 * @param recaptchaVerifier - The initialized RecaptchaVerifier instance.
 * @returns A promise resolving with the verification ID.
 */
export async function sendSmsVerificationCode(
    user: User,
    phoneNumber: string, // Assuming phone number is passed in
    recaptchaVerifier: RecaptchaVerifier
): Promise<string> {
    try {
        const multiFactorSession: MultiFactorSession = await multiFactor(user).getSession();
        const phoneInfoOptions: PhoneInfoOptions = {
            phoneNumber: phoneNumber, // Use the provided phone number
            session: multiFactorSession,
        };
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
        console.log("Firebase Service: MFA enrollment code sent, ID:", verificationId);
        return verificationId;
    } catch (error) {
        console.error("Firebase Service: Error sending SMS enrollment code:", error);
         if ((error as AuthError).code === 'auth/invalid-phone-number') {
             throw new Error("The provided phone number is invalid.");
         } else if ((error as AuthError).code === 'auth/too-many-requests') {
              throw new Error("Too many verification codes sent recently. Please wait.");
         }
        throw new Error("Failed to send verification code.");
    }
}

/**
 * Enrolls the user in SMS MFA using the verification code.
 * @param user - The currently authenticated Firebase User object.
 * @param verificationId - The ID received after sending the verification code.
 * @param verificationCode - The 6-digit code entered by the user.
 * @returns A promise resolving when enrollment is complete.
 */
export async function enrollSmsMfa(
    user: User,
    verificationId: string,
    verificationCode: string
): Promise<void> {
    try {
        const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
        const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
        await multiFactor(user).enroll(multiFactorAssertion, `My SMS Factor ${Date.now()}`); // Optional display name
        console.log("Firebase Service: SMS MFA enrolled successfully for user:", user.uid);
    } catch (error) {
        console.error("Firebase Service: Error enrolling SMS MFA:", error);
         if ((error as AuthError).code === 'auth/invalid-verification-code') {
             throw new Error("Invalid verification code.");
         } else if ((error as AuthError).code === 'auth/code-expired') {
             throw new Error("Verification code has expired. Please request a new one.");
         }
        throw new Error("Failed to enroll SMS two-factor authentication.");
    }
}

/**
 * Unenrolls the user from SMS MFA.
 * Requires the factor UID, which needs to be retrieved first.
 * @param user - The currently authenticated Firebase User object.
 * @returns A promise resolving when unenrollment is complete.
 */
export async function unenrollSmsMfa(user: User): Promise<void> {
    try {
        const mfaInfo = multiFactor(user).enrolledFactors;
        const smsFactor = mfaInfo.find(info => info.factorId === 'phone');

        if (!smsFactor || !smsFactor.uid) {
            throw new Error("SMS MFA is not currently enrolled or factor ID is missing.");
        }

        await multiFactor(user).unenroll(smsFactor.uid);
        console.log("Firebase Service: SMS MFA unenrolled successfully for user:", user.uid);
    } catch (error) {
        console.error("Firebase Service: Error unenrolling SMS MFA:", error);
        if ((error as AuthError).code === 'auth/requires-recent-login') {
             throw new Error("Disabling 2FA requires recent authentication. Please log out and log back in.");
        }
        throw new Error("Failed to disable SMS two-factor authentication.");
    }
}

/**
 * Retrieves the list of MFA factors enrolled for the current user.
 * @param user - The currently authenticated Firebase User object.
 * @returns A promise resolving with an array of MultiFactorInfo objects.
 */
export async function getUserMfaInfo(user: User): Promise<MultiFactorInfo[]> {
    try {
        // Ensure the user object is up-to-date
        await reload(user); // Use the imported reload
        const updatedUser = auth.currentUser;
        if (!updatedUser) throw new Error("User not available after reload.");

        return multiFactor(updatedUser).enrolledFactors;
    } catch (error) {
        console.error("Firebase Service: Error retrieving MFA info:", error);
        throw new Error("Could not fetch MFA information.");
    }
}
