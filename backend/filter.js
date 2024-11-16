// filter.js
export function filter(items, searchTerm, sortBy) {
  let result = [...items];

  // Filter by search term (in title, description, or tech stack)
  if (searchTerm) {
    result = result.filter((item) => {
      const searchIn = `${item.title} ${item.tech.join(" ")}`.toLowerCase();
      return searchIn.includes(searchTerm.toLowerCase());
    });
  }

  // Sort by selected criteria
  result.sort((a, b) => {
    switch (sortBy) {
      case "nameAsc":
        return a.title.localeCompare(b.title);
      case "nameDesc":
        return b.title.localeCompare(a.title);
      case "dateAsc":
        return new Date(b.date) - new Date(a.date); // Newest first
      case "dateDesc":
        return new Date(a.date) - new Date(b.date); // Oldest first
      default:
        return 0; // Default order
    }
  });

  return result;
}

// Scroll to a specific section's heading (inside its section)
export function scroll(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Attach input event listener for filtering and scrolling
export function attachSearchListener(searchInput) {
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
      scroll("projects");
    }
  });
}