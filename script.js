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

const countUp = (element) => {
  const target = Number(element.dataset.count);
  const started = performance.now();

  const step = (now) => {
    const progress = Math.min((now - started) / 1600, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = Math.round(target * eased).toLocaleString("ru-RU");
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll("[data-count]").forEach(countUp);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

if (!reducedMotion && window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".result-card, .audience-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
      card.style.setProperty("--my", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
    });
  });
}

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const slides = Array.from(carousel.children);
  const shell = carousel.closest(".carousel-shell");
  const controls = shell
    ? Array.from(shell.querySelectorAll(`[data-carousel-target="${carousel.id}"]`))
    : [];

  if (!slides.length || !controls.length) return;

  let currentIndex = 0;

  const renderCarousel = () => {
    carousel.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
    slides.forEach((slide, index) => {
      slide.setAttribute("aria-hidden", String(index !== currentIndex));
    });
  };

  controls.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.getAttribute("data-direction")) || 1;
      currentIndex = (currentIndex + direction + slides.length) % slides.length;
      renderCarousel();
    });
  });

  renderCarousel();
});

const finalVideo = document.querySelector("[data-final-video]");
const videoToggles = Array.from(document.querySelectorAll("[data-video-toggle]"));
const videoTextToggle = document.querySelector("[data-video-text-toggle]");
const videoOverlayLabel = document.querySelector("[data-video-overlay-label]");
const videoShell = document.querySelector("[data-video-shell]");

if (finalVideo && videoToggles.length && videoShell) {
  const setVideoButtons = (textLabel, overlayLabel, isPlaying = false) => {
    if (videoTextToggle) videoTextToggle.textContent = textLabel;
    if (videoOverlayLabel) videoOverlayLabel.textContent = overlayLabel;
    videoToggles.forEach((button) => {
      button.setAttribute("aria-pressed", String(isPlaying));
    });
  };

  const toggleVideo = async () => {
    if (!finalVideo.paused) {
      finalVideo.pause();
      return;
    }

    finalVideo.controls = true;
    if (finalVideo.readyState === 0) finalVideo.load();

    try {
      await finalVideo.play();
    } catch {
      finalVideo.muted = true;

      try {
        await finalVideo.play();
      } catch {
        setVideoButtons("Смотреть видео", "Воспроизвести");
      }
    }
  };

  videoToggles.forEach((button) => {
    button.addEventListener("click", toggleVideo);
  });

  finalVideo.addEventListener("click", toggleVideo);

  finalVideo.addEventListener("play", () => {
    videoShell.classList.add("is-playing");
    setVideoButtons("Пауза", "Пауза", true);
  });

  finalVideo.addEventListener("pause", () => {
    videoShell.classList.remove("is-playing");
    if (!finalVideo.ended) {
      setVideoButtons("Продолжить видео", "Продолжить");
    }
  });

  finalVideo.addEventListener("ended", () => {
    videoShell.classList.remove("is-playing");
    setVideoButtons("Смотреть снова", "Смотреть снова");
  });

  finalVideo.addEventListener("error", () => {
    videoToggles.forEach((button) => {
      button.disabled = true;
    });
    setVideoButtons("Видео недоступно", "Видео недоступно");
  });
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 960) closeMenu();
});
