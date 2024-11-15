document.addEventListener("scroll", function() {
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-links li");

    let current = "";

    sections.forEach((section) => {
        const sectionTop = section.offsetTop - 70; // Adjust for navbar height
        if (window.pageYOffset >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach((li) => {
        li.classList.remove("active");
        if (li.querySelector("a").getAttribute("href").includes(current)) {
            li.classList.add("active");
        }
    });
});

document.getElementById('subject').addEventListener('change', function() {
    this.style.color = this.value ? '#e0e1dd' : '#aab8c2';
});