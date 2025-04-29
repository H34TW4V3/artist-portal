
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    addDoc, // Use addDoc for creating new documents with auto-generated IDs
    updateDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
    orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app, db } from './firebase-config'; // Import initialized db
import type { Event, EventData } from '@/types/event'; // Import Event types

// --- Helper Function ---

const getCurrentUserId = (): string => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Authentication required. Please log in.");
    }
    return user.uid;
};

// --- Firestore Service Functions ---

/**
 * Fetches all events for the currently logged-in user, ordered by date ascending.
 * @returns A promise resolving to an array of Event objects (including IDs).
 */
export async function getEvents(): Promise<Event[]> {
    const userId = getCurrentUserId();
    const eventsRef = collection(db, "users", userId, "events");
    // Order by the 'date' field (Timestamp)
    const q = query(eventsRef, orderBy("date", "asc")); // Ascending for upcoming first

    try {
        const querySnapshot = await getDocs(q);
        const events: Event[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as EventData; // Cast data to EventData
            events.push({
                id: docSnap.id, // Add the document ID
                ...data
            });
        });
        console.log(`Fetched ${events.length} events for user ${userId}`);
        return events;
    } catch (error) {
        console.error("Error fetching events:", error);
        throw new Error("Failed to fetch events."); // Rethrow a user-friendly error
    }
}

/**
 * Adds a new event to the user's 'events' subcollection in Firestore.
 * @param eventData - The event data to add (excluding id and createdAt).
 * @returns A promise resolving when the event is added.
 */
export async function addEvent(eventData: EventData): Promise<void> {
    const userId = getCurrentUserId();
    const eventsRef = collection(db, "users", userId, "events");

    try {
        // Add createdAt timestamp automatically
        await addDoc(eventsRef, {
            ...eventData,
            createdAt: serverTimestamp(), // Add server timestamp on creation
        });
        console.log("Event added successfully for user:", userId);
    } catch (error) {
        console.error("Error adding event:", error);
        throw new Error("Failed to add event.");
    }
}

/**
 * Updates an existing event document in Firestore.
 * @param eventId - The ID of the event document to update.
 * @param eventData - An object containing the fields to update.
 * @returns A promise resolving when the update is complete.
 */
export async function updateEvent(eventId: string, eventData: Partial<EventData>): Promise<void> {
    const userId = getCurrentUserId();
    const eventDocRef = doc(db, "users", userId, "events", eventId);

    try {
        await updateDoc(eventDocRef, eventData);
        console.log("Event updated successfully:", eventId);
    } catch (error) {
        console.error("Error updating event:", error);
        throw new Error("Failed to update event.");
    }
}

/**
 * Deletes an event document from Firestore.
 * @param eventId - The ID of the event document to delete.
 * @returns A promise resolving when the deletion is complete.
 */
export async function removeEvent(eventId: string): Promise<void> {
    const userId = getCurrentUserId();
    const eventDocRef = doc(db, "users", userId, "events", eventId);

    try {
        await deleteDoc(eventDocRef);
        console.log("Event deleted successfully:", eventId);
    } catch (error) {
        console.error("Error deleting event:", error);
        throw new Error("Failed to delete event.");
    }
}
