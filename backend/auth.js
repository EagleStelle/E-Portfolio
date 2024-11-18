// auth.js
import { adminCollection } from "./firestore.js";
import {
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

let adminMode = false;
const adminModeChangeHandlers = []; // Array to store callbacks

// Add a new admin mode change handler
export function setAdminModeChangeHandler(callback) {
  if (typeof callback === "function") {
    adminModeChangeHandlers.push(callback);
  }
}

// Update admin mode and trigger all registered callbacks
export function setAdminMode(isAdmin) {
  adminMode = isAdmin;
  adminModeChangeHandlers.forEach((handler) => handler(adminMode));
}

// Get admin mode status
export function isAdminMode() {
  return adminMode;
}

// Verify admin credentials via Firestore
export async function verifyCredentials(name, email, secret) {
  try {
    const q = query(
      adminCollection,
      where("name", "==", name),
      where("email", "==", email),
      where("message", "==", secret)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      setAdminMode(true); // Enable admin mode if credentials are valid
      alert("Admin mode enabled!");
    } else {
      alert("Invalid admin credentials!");
    }
  } catch (error) {
    console.error("Error verifying admin credentials:", error);
    alert("An error occurred while verifying credentials. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const contactForm = document.getElementById("contactForm");

  sendMessageBtn.addEventListener("click", () => {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (message === "enable_admin") {
      verifyCredentials(name, email, message);
    } else {
      alert("Regular message sent!");
      contactForm.reset();
    }
  });
});
