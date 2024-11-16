// auth.js
import { adminCollection } from "./firestore.js";
import {
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

let adminMode = false;
let onAdminModeChange = null; // Callback for admin mode changes

// Set a function to handle UI updates when admin mode changes
export function setAdminModeChangeHandler(callback) {
  onAdminModeChange = callback;
}

// Update admin mode and trigger UI refresh
export function setAdminMode(isAdmin) {
  adminMode = isAdmin;
  if (onAdminModeChange) {
    onAdminModeChange(adminMode);
  }
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
