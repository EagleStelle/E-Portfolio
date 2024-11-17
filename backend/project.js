// project.js
import { projectsCollection } from "./firestore.js";
import { isAdminMode, setAdminModeChangeHandler } from "./auth.js"; // Updated import to use auth.js
import { filter, scroll, attachSearchListener  } from "./filter.js";
import { 
  getOrdinalSuffix, 
  createCard, 
  techIcons,
} from "./utility.js"; // Import utilities
import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// DOM elements (queried once)
const searchInput = document.querySelector(".search-box input");
if (searchInput) {
  attachSearchListener(searchInput);
}
const sortSelect = document.querySelector(".sort-box select");
const projectsContainer = document.querySelector(".card-grid.project");

// Fetch projects from Firestore and render them
export async function fetchProjects() {
  try {
    const querySnapshot = await getDocs(projectsCollection);
    let projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() });
    });

    // Sort projects by priority (default behavior)
    projects = projects.sort((a, b) => {
      const priorityA = Number.isFinite(a.priority) ? a.priority : Number.MIN_SAFE_INTEGER;
      const priorityB = Number.isFinite(b.priority) ? b.priority : Number.MIN_SAFE_INTEGER;
      return priorityB - priorityA; // Descending order
    });

    renderProjects(projects); // Render the projects
    return projects; // Return the projects
  } catch (error) {
    console.error("Error fetching projects:", error);
  }
}

function renderProjects(projects) {
  const searchTerm = searchInput.value.trim();
  const sortBy = sortSelect.value;

  // Determine viewport size
  const isMobile = window.innerWidth <= 970;

  // Adjust initialVisibleCount based on admin mode and viewport
  let initialVisibleCount = isMobile ? 4 : 3; // Mobile displays 4 by default
  if (isAdminMode()) {
    initialVisibleCount = isMobile ? 3 : 2; // Reserve space for "Add Project" card
  }

  const filteredAndSortedProjects = filter(projects, searchTerm, sortBy);

  const projectsToShow = filteredAndSortedProjects.slice(0, initialVisibleCount);
  const projectsHidden = filteredAndSortedProjects.slice(initialVisibleCount);

  projectsContainer.innerHTML = ""; // Clear existing cards

  // Render visible projects
  projectsToShow.forEach((project) => {
    const projectCard = createProjectCard(project);
    projectsContainer.appendChild(projectCard);
  });

  // Render hidden projects (with `hidden` class)
  projectsHidden.forEach((project) => {
    const projectCard = createProjectCard(project);
    projectCard.classList.add("hidden");
    projectsContainer.appendChild(projectCard);
  });

  // Add "Add Project" card for admin mode
  if (isAdminMode()) {
    const addProjectCard = createCard({
      className: "add-project",
      onClick: () => openModal("Add Project"),
    });
    projectsContainer.appendChild(addProjectCard); // Append to the container
  }

  // Toggle button visibility
  const toggleBtn = document.getElementById("toggle-projects-btn");

  // Handle toggle logic
  let expanded = false;

  toggleBtn.addEventListener("click", () => {
    expanded = !expanded;
    toggleBtn.innerHTML = expanded 
      ? '<i class="fa-solid fa-chevron-up"></i>' 
      : '<i class="fa-solid fa-chevron-down"></i>';

    // Show or hide extra projects
    const hiddenCards = projectsContainer.querySelectorAll(".project-card.hidden");
    hiddenCards.forEach((card) => {
      card.style.display = expanded ? "block" : "none";
    });
  });

  // Handle search and sort dynamically
  searchInput.addEventListener("input", () => {
    toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    renderProjects(projects);
  });
  sortSelect.addEventListener("change", () => renderProjects(projects));

  // Ensure only initial cards are visible on load
  const hiddenCards = projectsContainer.querySelectorAll(".project-card.hidden");
  hiddenCards.forEach((card) => (card.style.display = "none"));
}

let cachedProjects = []; // Global variable to store fetched projects

// Fetch projects on load and cache them
fetchProjects().then((projects) => {
  cachedProjects = projects || []; // Cache the fetched projects
  window.dispatchEvent(new Event("resize")); // Trigger resize event after initial fetch
});

// Add event listener to adjust the view on window resize
window.addEventListener("resize", () => {
  if (cachedProjects.length) {
    renderProjects(cachedProjects); // Use cached projects on resize
  } else {
    // Refetch projects if cache is empty
    fetchProjects().then((projects) => {
      cachedProjects = projects || [];
    });
  }
});

// Add a new project to Firestore
export async function addProject(projectData) {
  try {
    await addDoc(projectsCollection, projectData); // Add the new project to Firestore
    fetchProjects(); // Re-fetch and render projects
  } catch (error) {
    console.error("Error adding project:", error);
    throw error; // Propagate the error for handling in the caller
  }
}

// Update an existing project in Firestore
export async function updateProject(projectId, updatedData) {
  try {
    const projectDoc = doc(projectsCollection, projectId);
    await updateDoc(projectDoc, updatedData);
    fetchProjects(); // Re-render the projects
  } catch (error) {
    console.error("Error updating project:", error);
  }
}

// Delete a project from Firestore
export async function deleteProject(projectId) {
  try {
    const projectDoc = doc(projectsCollection, projectId);
    await deleteDoc(projectDoc);
    fetchProjects(); // Re-render the projects
  } catch (error) {
    console.error("Error deleting project:", error);
  }
}

// Create a project card
function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "project-card";

  const description = project.description || "";
  const maxDescriptionLength = 100;
  const truncatedDescription =
    description.length > maxDescriptionLength
      ? description.substring(0, maxDescriptionLength) + "..."
      : description;

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
    <p class="project-description">${truncatedDescription}</p>
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
      if (searchInput.value === tech) {
        searchInput.value = ""; // Clear search bar if clicked again
      } else {
        searchInput.value = tech; // Set the search bar to the clicked tech
      }
      searchInput.dispatchEvent(new Event("input")); // Trigger search

      // Scroll to section's heading
      scroll("projects");
    });
  });

  const descriptionElement = card.querySelector(".project-description");

  // Handle hover to expand/collapse description
  card.addEventListener("mouseover", () => {
    if (description.length > maxDescriptionLength) {
      descriptionElement.textContent = description;
      descriptionElement.style.maxHeight = "100em";
    }
  });

  card.addEventListener("mouseout", (event) => {
    if (!card.contains(event.relatedTarget)) {
      if (description.length > maxDescriptionLength) {
        descriptionElement.style.maxHeight = "6em";
        descriptionElement.textContent = truncatedDescription;
      }
    }
  });

  // Admin actions
  if (isAdminMode()) {
    card.querySelector(".edit-icon").addEventListener("click", () => {
      openModal("Edit Project", project);
    });
    card.querySelector(".delete-icon").addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete the project: ${project.title || "this project"}?`)) {
        deleteProject(project.id);
      }
    });
  }

  return card;
}

// Open modal for adding or editing a project
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
    tech: document
      .getElementById("projectTech")
      .value.split(",")
      .map((t) => t.trim()),
    priority: parseInt(document.getElementById("projectPriority").value, 10),
  };

  try {
    if (projectId) {
      await updateProject(projectId, projectData);
    } else {
      await addProject(projectData);
    }

    document.getElementById("projectModal").style.display = "none";
  } catch (error) {
    console.error("Error saving project:", error);
  }
});

// Listen for admin mode changes and re-fetch projects
setAdminModeChangeHandler((isAdmin) => {
  console.log(`Admin mode: ${isAdmin ? "Enabled" : "Disabled"}`);
  fetchProjects();
});

// Fetch and render projects on page load
fetchProjects();
