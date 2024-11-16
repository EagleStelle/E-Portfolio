// project.js
import { projectsCollection } from "./firestore.js";
import {
  isAdminMode,
  setAdminModeChangeHandler,
} from "./auth.js"; // Updated import to use auth.js
import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Mapping tech names to Font Awesome icon classes
const techIcons = {
  HTML: "fa-html5",
  "C#": "fa-code",
  "C# .NET": "fa-code",
  "Visual Basic .NET": "fa-code",
  PHP: "fa-php",
  JavaScript: "fa-js",
  CSS: "fa-css3-alt",
  Python: "fa-python",
  Java: "fa-java",
};

// Fetch projects from Firestore and render them
export async function fetchProjects() {
  try {
    const querySnapshot = await getDocs(projectsCollection);
    const projectsContainer = document.querySelector(".card-grid.project");
    projectsContainer.innerHTML = ""; // Clear existing content

    querySnapshot.forEach((doc) => {
      const project = { id: doc.id, ...doc.data() };
      const projectCard = createProjectCard(project);
      projectsContainer.appendChild(projectCard);
    });

    // Add the "Add Project" card only for admins
    if (isAdminMode()) {
      const addProjectCard = createAddProjectCard();
      projectsContainer.appendChild(addProjectCard);
    }
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

  const description = project.description;
  const maxDescriptionLength = 100; // Maximum length for truncated description
  const truncatedDescription = description.length > maxDescriptionLength
    ? description.substring(0, maxDescriptionLength) + "..."
    : description;

  // Build the card HTML
  card.innerHTML = `
    <div class="card-icons" style="display: ${isAdminMode() ? "flex" : "none"};">
        <i class="fas fa-edit edit-icon" title="Edit Project"></i>
        <i class="fas fa-trash delete-icon" title="Delete Project"></i>
    </div>
    <img src="${project.image}" alt="${project.title}">
    <h3>${project.title}</h3>
    <p class="project-description">${truncatedDescription}</p>
    <div class="tech-stack">
        ${project.tech
          .map(
            (tech) =>
              `<div class="tech-item"><i class="fab ${
                techIcons[tech] || "fa-code"
              }"></i>${tech}</div>`
          )
          .join("")}
    </div>
    <a href="${project.link}" class="card-link" target="_blank">View Project</a>
  `;

  const descriptionElement = card.querySelector(".project-description");

  // Apply initial styles for transition effect
  descriptionElement.style.overflow = "hidden";
  descriptionElement.style.transition = "max-height 0.3s ease";
  descriptionElement.style.maxHeight = "6em"; // Approx. height for truncated description

  // Handle hover to expand/collapse description
  card.addEventListener("mouseover", () => {
    if (description.length > maxDescriptionLength) {
      descriptionElement.textContent = description;
      descriptionElement.style.maxHeight = "100em"; // Adjust this based on expected content height
    }
  });

  card.addEventListener("mouseout", (event) => {
    // Ensure the mouse actually left the card (not just moved between children)
    if (!card.contains(event.relatedTarget)) {
      if (description.length > maxDescriptionLength) {
        descriptionElement.style.maxHeight = "6em"; // Collapse back to truncated height
        setTimeout(() => {
          descriptionElement.textContent = truncatedDescription; // Revert content after transition
        }, 300); // Match the transition duration
      }
    }
  });

  // Add event listeners for admin actions (edit, delete)
  if (isAdminMode()) {
    card.querySelector(".edit-icon").addEventListener("click", () => {
      openModal("Edit Project", project);
    });
    card.querySelector(".delete-icon").addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this project?")) {
        deleteProject(project.id);
      }
    });
  }

  return card;
}

// Create the "Add Project" card
function createAddProjectCard() {
  const card = document.createElement("div");
  card.className = "project-card add-project";
  card.innerHTML = `<i class="fas fa-plus"></i><h3>Add Project</h3>`;
  card.addEventListener("click", () => openModal("Add Project"));
  return card;
}

// Open modal for adding or editing a project
function openModal(title, project = null) {
  const modal = document.getElementById("projectModal");
  modal.style.display = "flex";

  const modalTitle = document.querySelector("#projectModal h2");
  modalTitle.textContent = title;

  // Reset hidden input and form fields for safety
  document.getElementById("projectId").value = project?.id || "";
  document.getElementById("projectTitle").value = project?.title || "";
  document.getElementById("projectDescription").value = project?.description || "";
  document.getElementById("projectImage").value = project?.image || "";
  document.getElementById("projectLink").value = project?.link || "";
  document.getElementById("projectTech").value = project?.tech?.join(", ") || "";
}

// Close modal
document.querySelector(".cancel-btn").addEventListener("click", () => {
  document.getElementById("projectModal").style.display = "none";
});

// Handle form submission
document.getElementById("projectForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const projectId = document.getElementById("projectId").value; // Hidden input for ID
  const projectData = {
    title: document.getElementById("projectTitle").value,
    description: document.getElementById("projectDescription").value,
    image: document.getElementById("projectImage").value,
    link: document.getElementById("projectLink").value,
    tech: document
      .getElementById("projectTech")
      .value.split(",")
      .map((t) => t.trim()),
  };

  try {
    if (projectId) {
      // Update existing project
      await updateProject(projectId, projectData);
    } else {
      // Add new project
      await addProject(projectData);
    }

    document.getElementById("projectModal").style.display = "none"; // Close modal
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
