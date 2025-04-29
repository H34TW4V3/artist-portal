
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  type Auth,
  type AuthError,
  type User,
  onAuthStateChanged, // Import onAuthStateChanged
} from "firebase/auth";
import { app } from './firebase-config'; // Import the initialized Firebase app

// Get the Auth instance using the initialized app
const auth: Auth = getAuth(app);

/**
 * Logs in a user with email and password.
 * @param email - The user's email address.
 * @param password - The user's password.
 * @returns A Promise resolving to the logged-in User object.
 * @throws An error if login fails.
 */
export async function login(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Firebase Service: Login successful for:", userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    const authError = error as AuthError;
    console.error("Firebase Service: Login error:", authError.code, authError.message);
    // Provide more specific error messages based on common codes
    if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-login-credentials') { // Added auth/invalid-login-credentials
        throw new Error("Invalid Artist ID or password."); // Keep using generic message for security
    } else if (authError.code === 'auth/too-many-requests') {
         throw new Error("Access temporarily disabled due to too many failed login attempts. Please try again later or reset your password.");
    } else if (authError.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your connection and try again.");
    }
    // Default error for other cases
    throw new Error("Login failed. Please try again.");
  }
}

/**
 * Logs out the current user.
 * @returns A Promise resolving when logout is complete.
 * @throws An error if logout fails.
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
    console.log("Firebase Service: Logout successful.");
  } catch (error) {
    const authError = error as AuthError;
    console.error("Firebase Service: Logout error:", authError.code, authError.message);
    throw new Error("Logout failed. Please try again.");
  }
}

/**
 * Sends a password reset email to the specified email address.
 * @param email - The user's email address.
 * @returns A Promise resolving when the email is sent.
 * @throws An error if sending the email fails.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
    try {
        await fbSendPasswordResetEmail(auth, email);
        console.log("Firebase Service: Password reset email sent to:", email);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Password reset error:", authError.code, authError.message);
         if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-email') {
            throw new Error("Could not send reset email. Please check the email address.");
        } else if (authError.code === 'auth/too-many-requests') {
            throw new Error("Too many requests. Please try again later.");
        }
        throw new Error("Failed to send password reset email. Please try again.");
    }
}

/**
 * Updates the current user's password. Requires recent login or re-authentication.
 * @param newPassword - The new password for the user.
 * @returns A Promise resolving when the password update is complete.
 * @throws An error if the update fails (e.g., weak password, requires recent login).
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No user is currently logged in.");
    }

    try {
        await fbUpdatePassword(user, newPassword);
        console.log("Firebase Service: Password updated successfully for user:", user.email);
    } catch (error) {
        const authError = error as AuthError;
        console.error("Firebase Service: Password update error:", authError.code, authError.message);
        if (authError.code === 'auth/weak-password') {
            throw new Error("Password is too weak. Please choose a stronger password.");
        } else if (authError.code === 'auth/requires-recent-login') {
             throw new Error("This action requires recent login. Please log out and log back in before updating your password.");
        }
        throw new Error("Failed to update password. Please try again.");
    }
}


/**
 * Subscribes to the authentication state changes.
 * @param callback - A function to be called whenever the auth state changes.
 *                   It receives the User object (or null if logged out).
 * @returns An unsubscribe function to detach the listener.
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Export the auth instance if needed elsewhere, though usually interacting via functions is preferred.
export { auth };
