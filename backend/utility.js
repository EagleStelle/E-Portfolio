// utility.js

// Utility function to get ordinal suffix
export function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return "th"; // Covers 11th-13th
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// Create the "Add Project" card
export function createCard({ className = "", onClick = null }) {
  const card = document.createElement("div");
  card.className = `generic-card ${className}`.trim();
  card.innerHTML = `<i class="fas fa-plus-circle"></i>`;
  
  if (onClick && typeof onClick === "function") {
    card.addEventListener("click", onClick);
  }
  
  return card;
}
  
// Mapping tech names to Font Awesome icon classes
export const techIcons = {
  HTML: "fa-html5",
  PHP: "fa-php",
  JavaScript: "fa-js",
  CSS: "fa-css3-alt",
  Python: "fa-python",
  "C#": "fa-brands fa-windows",
  "Visual Basic": "fa-brands fa-windows",
  ".NET": "fa-brands fa-windows",
  "WinForms": "fa-brands fa-windows",
  "WinUI 3": "fa-brands fa-windows",
  Java: "fa-java",
};