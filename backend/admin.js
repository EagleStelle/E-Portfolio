// admin.js
import { verifyCredentials } from "./firestore.js";

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
