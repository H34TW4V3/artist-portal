
import type { Timestamp } from 'firebase/firestore';

// Base structure of event data stored in Firestore
export interface EventData {
  title: string;
  date: Timestamp; // Store date/time consistently as Firestore Timestamp
  startTime?: string | null; // Store as HH:MM string or null
  endTime?: string | null;   // Store as HH:MM string or null
  location?: string | null;
  description?: string | null;
  userId: string; // ID of the user who created the event - ADDED
  createdAt: Timestamp; // Firestore server timestamp for creation time - ADDED
}

// Event structure including the Firestore document ID
export interface Event extends EventData {
  id: string;
}
