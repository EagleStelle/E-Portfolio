// firestore.js
import { db } from "./firebase.js"; // Import Firestore instance
import { collection } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firestore collections
export const adminCollection = collection(db, "admin");
export const projectsCollection = collection(db, "projects");