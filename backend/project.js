// project.js
import { projectsCollection } from "./firestore.js";
import { isAdminMode, setAdminModeChangeHandler } from "./auth.js"; // Updated import to use auth.js
import { filter } from "./filter.js";
import { 
  getOrdinalSuffix, 
  createCard, 
  techIcons 
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

    const renderProjects = () => {
      const searchTerm = searchInput.value.trim();
      const sortBy = sortSelect.value;

      const filteredAndSortedProjects = filter(projects, searchTerm, sortBy);

      projectsContainer.innerHTML = ""; // Clear existing cards
      filteredAndSortedProjects.forEach((project) => {
        const projectCard = createProjectCard(project);
        projectsContainer.appendChild(projectCard);
      });

      if (isAdminMode()) {
        const addProjectCard = createCard({
          className: "add-project",
          onClick: () => openModal("Add Project"),
        });
        projectsContainer.appendChild(addProjectCard);
      }
    };

    searchInput.addEventListener("input", renderProjects);
    sortSelect.addEventListener("change", renderProjects);

    renderProjects();
  } catch (error) {
    console.error("Error fetching projects:", error);
  }
}

// Add a new project to Firestore
export async function addProject(projectData) {
  try {
    await addDoc(projectsCollection, projectData);
    fetchProjects(); // Re-render the projects
  } catch (error) {
    console.error("Error adding project:", error);
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
    <div class="card-icons" style="display: ${isAdminMode() ? "flex" : "none"};">
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
              `<div class="tech-item"><i class="fab ${
                techIcons[tech] || "fa-regular fa-code"
              }"></i>${tech}</div>`
          )
          .join("")}
    </div>
    <a href="${project.link}" class="card-link" target="_blank">View Project</a>
  `;

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
  document.getElementById("projectPriority").value = project?.priority || 50;
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
