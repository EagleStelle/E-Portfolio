import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firestore setup
const db = getFirestore();
const projectsCollection = collection(db, "projects");

// Mapping tech names to Font Awesome icon classes
const techIcons = {
  HTML: "fa-html5",
  "C#": "fa-code",
  "C#.NET": "fa-code",
  "VB.NET": "fa-code",
  PHP: "fa-php",
  JavaScript: "fa-js",
  CSS: "fa-css3-alt",
  Python: "fa-python",
  Java: "fa-java",
};

// Fetch projects from Firestore and render them
async function fetchProjects() {
  try {
    const querySnapshot = await getDocs(projectsCollection);
    const projectsContainer = document.querySelector(".card-grid.project");
    projectsContainer.innerHTML = ""; // Clear existing content

    querySnapshot.forEach((doc) => {
      const project = { id: doc.id, ...doc.data() };
      const projectCard = createProjectCard(project);
      projectsContainer.appendChild(projectCard);
    });

    // Add the "Add Project" card at the end
    const addProjectCard = createAddProjectCard();
    projectsContainer.appendChild(addProjectCard);
  } catch (error) {
    console.error("Error fetching projects:", error);
  }
}

// Add a new project to Firestore
async function addProject(projectData) {
  try {
    await addDoc(projectsCollection, projectData);
    fetchProjects(); // Re-render the projects
  } catch (error) {
    console.error("Error adding project:", error);
  }
}

// Update an existing project in Firestore
async function updateProject(projectId, updatedData) {
  try {
    const projectDoc = doc(db, "projects", projectId);
    await updateDoc(projectDoc, updatedData);
    fetchProjects(); // Re-render the projects
  } catch (error) {
    console.error("Error updating project:", error);
  }
}

// Delete a project from Firestore
async function deleteProject(projectId) {
  try {
    const projectDoc = doc(db, "projects", projectId);
    await deleteDoc(projectDoc);
    fetchProjects(); // Re-render the projects
  } catch (error) {
    console.error("Error deleting project:", error);
  }
}

// Create a project card with action icons
function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "project-card";
  card.innerHTML = `
    <div class="card-icons">
      <i class="fas fa-edit edit-icon" title="Edit Project"></i>
      <i class="fas fa-trash delete-icon" title="Delete Project"></i>
    </div>
    <img src="${project.image}" alt="${project.title}">
    <h3>${project.title}</h3>
    <p>${project.description}</p>
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

  // Add event listeners for edit and delete
  card.querySelector(".edit-icon").addEventListener("click", () => {
    openModal("Edit Project", project);
  });

  card.querySelector(".delete-icon").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject(project.id);
    }
  });

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

// Fetch and render projects on page load
fetchProjects();
