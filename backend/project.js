import { projectsCollection } from "./firestore.js";
import { isAdminMode, setAdminModeChangeHandler } from "./auth.js";
import { filter, debounce, scroll } from "./filter.js";
import { 
  getOrdinalSuffix, 
  createCard, 
  techIcons,
  handleNoResults, 
  addPlaceholderCards,
} from "./utility.js";
import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// DOM elements
const searchInput = document.querySelector(".search-box input");
const sortSelect = document.querySelector(".sort-box select");
const projectsContainer = document.querySelector(".card-grid.project");
const toggleBtn = document.getElementById("toggle-projects-btn");
let lastVisibleDoc = null; // Track the last fetched document

// State variables
let cachedProjects = []; // Projects fetched from Firestore
let expanded = false; // Whether hidden projects are visible
let allProjectsFetched = false; // Track if all projects are fetched

// Fetch projects from Firestore
async function fetchProjects(initialFetch = true, fetchAll = false) {
  try {
    if (initialFetch) {
      // Reset cache and pagination state for the initial fetch
      cachedProjects = [];
      lastVisibleDoc = null;
      allProjectsFetched = false; // Reset the flag for a fresh load
    }

    // If all projects are already fetched, skip fetching from Firestore
    if (allProjectsFetched && !fetchAll) {
      renderProjects(cachedProjects);
      return;
    }

    // Adjust the query based on whether fetching all or just a limited number
    const q = query(
      projectsCollection,
      orderBy("priority", "desc"),
      ...(lastVisibleDoc ? [startAfter(lastVisibleDoc)] : []),
      ...(fetchAll ? [] : [limit(5)]) // Fetch all if needed, else limit to 5
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Append fetched projects to cache
      const newProjects = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      cachedProjects = [...cachedProjects, ...newProjects];
      lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1]; // Update last visible document
    } else {
      allProjectsFetched = true; // Mark that all projects have been fetched
    }

    renderProjects(cachedProjects); // Render projects using the cached data
  } catch (error) {
    console.error("Error fetching projects:", error);
  }
}

async function fetchMoreProjects() {
  try {
    // Fetch all remaining projects when the toggle button is clicked
    await fetchProjects(false, true);
  } catch (error) {
    console.error("Error fetching more projects:", error);
  }
}

// Render projects
function renderProjects(projects) {
  const searchTerm = searchInput.value.trim(); // Current search term
  const sortBy = sortSelect.value; // Current sort option (from dropdown)

  // Use cached filtered and sorted results to minimize re-fetches
  const filteredProjects = filter(projects, searchTerm, sortBy);

  // Determine the number of projects to display based on device type
  const isMobile = window.innerWidth <= 970;
  const initialVisibleCount = isAdminMode() ? (isMobile ? 3 : 2) : (isMobile ? 4 : 3);
  const visibleProjects = expanded ? filteredProjects : filteredProjects.slice(0, initialVisibleCount);

  const noResultsMessage = document.querySelector(".no-results-message.project");
  const totalProjects = filteredProjects.length;

  // Handle "No Results Found"
  handleNoResults(projectsContainer, noResultsMessage, totalProjects > 0);

  // Exit early if there are no projects to display
  if (totalProjects === 0) {
    toggleBtn.style.display = "none"; // Hide the toggle button if no results
    return;
  }

  // Update DOM
  projectsContainer.innerHTML = ""; // Clear existing project cards
  visibleProjects.forEach((project) => projectsContainer.appendChild(createProjectCard(project)));

  // Add "Add Project" card for admin mode
  if (isAdminMode()) {
    const addProjectCard = createCard({
      className: "add-project",
      onClick: () => openModal("Add Project"),
    });
    projectsContainer.appendChild(addProjectCard);
  }

  // Calculate total cards, including placeholders
  const totalCards = visibleProjects.length + (isAdminMode() ? 1 : 0);
  addPlaceholderCards(projectsContainer, totalCards);

  // Toggle button visibility and state
  toggleBtn.style.display = totalProjects > initialVisibleCount ? "block" : "none";
  toggleBtn.innerHTML = expanded
    ? '<i class="fa-solid fa-chevron-up"></i>'
    : '<i class="fa-solid fa-chevron-down"></i>';
}

// Create a project card
function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "card-item project";

  const description = project.description || "";
  const projectDate = project.date ? new Date(project.date) : null;
  const formattedDate = projectDate
    ? `${projectDate.getDate()}${getOrdinalSuffix(
        projectDate.getDate()
      )} of ${projectDate.toLocaleString("default", { month: "long" })}, ${projectDate.getFullYear()}`
    : "Date not provided";

  card.innerHTML = `
    <div class="card-icons" ${isAdminMode() ? "" : 'style="display: none;"'}>
        <i class="fas fa-edit edit-icon" title="Edit Project"></i>
        <i class="fas fa-trash delete-icon" title="Delete Project"></i>
    </div>
    <img src="${project.image}" alt="${project.title || "Project image"}">
    <h3>${project.title || "Untitled Project"}</h3>
    <p class="project-description">${description}</p>
    <p class="project-date">${formattedDate}</p>
    <div class="tech-stack">
        ${project.tech
          .map(
            (tech) =>
              `<div class="tech-item" data-tech="${tech}"><i class="fab ${
                techIcons[tech] || "fa-regular fa-code"
              }"></i>${tech}</div>`
          )
          .join("")}
    </div>
    <a href="${project.link}" class="card-link" target="_blank">View Project</a>
  `;

  // Add click event to each tech stack item
  const techItems = card.querySelectorAll(".tech-item");
  techItems.forEach((techItem) => {
    techItem.addEventListener("click", (e) => {
      const tech = e.currentTarget.dataset.tech;

      // Update search input and re-render projects
      if (searchInput.value === tech) {
        searchInput.value = ""; // Clear the search bar if clicked again
      } else {
        searchInput.value = tech; // Set the search bar to the clicked tech
      }

      renderProjects(cachedProjects); // Trigger project rendering
      scroll("projects"); // Scroll to projects section
    });
  });

  // Admin actions
  if (isAdminMode()) {
    card.querySelector(".edit-icon").addEventListener("click", () => openModal("Edit Project", project));
    card.querySelector(".delete-icon").addEventListener("click", () => {
      if (confirm(`Delete project: ${project.title || "Untitled"}?`)) {
        deleteProject(project.id);
      }
    });
  }

  return card;
}

// Trigger search when the user presses Enter
searchInput.addEventListener(
  "input",
  debounce(async () => {
    const searchTerm = searchInput.value.trim();

    if (!allProjectsFetched) {
      // Fetch all projects on the first search query
      await fetchProjects(false, true);
    }

    // Filter and render projects from the cached data
    renderProjects(filter(cachedProjects, searchTerm, sortSelect.value));
  }, 300)
);

// Open project modal
function openModal(title, project = null) {
  const modal = document.getElementById("projectModal");
  modal.style.display = "flex";

  document.querySelector("#projectModal h2").textContent = title;
  document.getElementById("projectId").value = project?.id || "";
  document.getElementById("projectTitle").value = project?.title || "";
  document.getElementById("projectDescription").value = project?.description || "";
  document.getElementById("projectDate").value = project?.date || "";
  document.getElementById("projectImage").value = project?.image || "";
  document.getElementById("projectLink").value = project?.link || "";
  document.getElementById("projectTech").value = project?.tech?.join(", ") || "";
  document.getElementById("projectPriority").value = project?.priority || "";
}

// Close modal
document.querySelector(".cancel-btn").addEventListener("click", () => {
  document.getElementById("projectModal").style.display = "none";
});

// Add a new project to Firestore
export async function addProject(projectData) {
  try {
    const docRef = await addDoc(projectsCollection, projectData); // Add the new project to Firestore
    const newProject = { id: docRef.id, ...projectData }; // Create a new project object with the Firestore ID
    cachedProjects.push(newProject); // Add it to the cache
    renderProjects(cachedProjects); // Re-render the projects
  } catch (error) {
    console.error("Error adding project:", error);
    throw error; // Propagate the error for handling in the caller
  }
}

// Update an existing project in Firestore
export async function updateProject(projectId, updatedData) {
  try {
    const projectDoc = doc(projectsCollection, projectId);
    await updateDoc(projectDoc, updatedData); // Update the project in Firestore

    // Update the project in the cache
    const projectIndex = cachedProjects.findIndex((project) => project.id === projectId);
    if (projectIndex !== -1) {
      cachedProjects[projectIndex] = { ...cachedProjects[projectIndex], ...updatedData };
    }

    renderProjects(cachedProjects); // Re-render projects with the current state of "expanded"
  } catch (error) {
    console.error("Error updating project:", error);
    throw error; // Propagate the error for handling in the caller
  }
}

// Delete a project from Firestore
export async function deleteProject(projectId) {
  try {
    const projectDoc = doc(projectsCollection, projectId);
    await deleteDoc(projectDoc); // Delete the project in Firestore

    // Remove the project from the cache
    cachedProjects = cachedProjects.filter((project) => project.id !== projectId);

    renderProjects(cachedProjects); // Re-render the projects
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error; // Propagate the error for handling in the caller
  }
}


// Handle form submission
document.getElementById("projectForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const projectId = document.getElementById("projectId").value;
  const projectData = {
    title: document.getElementById("projectTitle").value,
    description: document.getElementById("projectDescription").value,
    date: document.getElementById("projectDate").value,
    image: document.getElementById("projectImage").value,
    link: document.getElementById("projectLink").value,
    tech: document.getElementById("projectTech").value.split(",").map((t) => t.trim()),
    priority: parseInt(document.getElementById("projectPriority").value, 10),
  };

  try {
    if (projectId) {
      await updateProject(projectId, projectData);
    } else {
      await addProject(projectData);
    }

    document.getElementById("projectModal").style.display = "none";
    fetchProjects();
  } catch (error) {
    console.error("Error saving project:", error);
  }
});

// Toggle hidden projects
toggleBtn.addEventListener("click", async () => {
  expanded = !expanded;

  if (expanded) {
    if (!allProjectsFetched) {
      // Only fetch more projects the first time expanded mode is activated
      await fetchMoreProjects();
      allProjectsFetched = true; // Mark that additional projects have been fetched
    }
    renderProjects(cachedProjects); // Render all projects
  } else {
    renderProjects(cachedProjects); // Collapse and render limited projects
  }
});

// Sort projects
sortSelect.addEventListener("change", async () => {
  if (!allProjectsFetched) {
    // Only fetch more projects the first time expanded mode is activated
    await fetchMoreProjects();
    allProjectsFetched = true; // Mark that additional projects have been fetched
  }
  renderProjects(cachedProjects); // Re-render projects with the selected sort
});

// Handle resize
window.addEventListener("resize", debounce(() => renderProjects(cachedProjects), 300));

// Listen for admin mode changes
setAdminModeChangeHandler(() => fetchProjects());

// Fetch and render projects on load
fetchProjects();
