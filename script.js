const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");

const closeMenu = () => {
  if (!menuToggle || !nav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Открыть меню");
  nav.classList.remove("is-open");
  document.body.classList.remove("menu-open");
};

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Открыть меню" : "Закрыть меню");
    nav.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

if (header) {
  const headerObserver = new IntersectionObserver(
    ([entry]) => header.classList.toggle("is-compact", !entry.isIntersecting),
    { rootMargin: "-120px 0px 0px 0px" }
  );
  const hero = document.querySelector(".hero");
  if (hero) headerObserver.observe(hero);
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll(".reveal");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

document.querySelectorAll("[data-carousel-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-carousel-target");
    const direction = Number(button.getAttribute("data-direction")) || 1;
    const carousel = document.getElementById(targetId);
    if (!carousel) return;

    const distance = Math.max(280, carousel.clientWidth * 0.76);
    carousel.scrollBy({
      left: distance * direction,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 960) closeMenu();
});
