// filter.js
export function filter(items, searchTerm, sortBy) {
    let result = [...items];
  
    // Filter by search term
    if (searchTerm) {
      result = result.filter((item) => {
        const searchIn = `${item.title} ${item.description}`.toLowerCase();
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