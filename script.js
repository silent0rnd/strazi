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

  // панель занимает не всю ширину: тап по оставшейся полосе должен закрывать меню
  document.addEventListener("pointerdown", (event) => {
    if (!nav.classList.contains("is-open")) return;
    if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
    closeMenu();
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

// фоновые циклы держим только в видимых секциях: иначе два десятка бесконечных
// анимаций крутятся всю сессию и жгут батарею на телефоне
if (!reducedMotion && "IntersectionObserver" in window) {
  const idleObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-idle", !entry.isIntersecting));
    },
    { rootMargin: "10% 0px" }
  );

  document.querySelectorAll("section").forEach((section) => idleObserver.observe(section));
}

const countUp = (element) => {
  if (element.dataset.counted) return;
  element.dataset.counted = "1";

  const target = Number(element.dataset.count);
  const started = performance.now();

  // ширину резервируем по итоговому числу, иначе строка дергается, пока набегают разряды
  element.style.display = "inline-block";
  element.style.minWidth = `${element.getBoundingClientRect().width}px`;
  element.style.textAlign = "right";

  const step = (now) => {
    // карусель отзывов листается каждые 7000 мс: счётчик должен успеть добежать
    // сильно раньше, иначе цифра половину показа противоречит тексту рядом
    const progress = Math.min((now - started) / 1400, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = Math.round(target * eased).toLocaleString("ru-RU");

    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }

    element.style.minWidth = "";
  };

  requestAnimationFrame(step);
};

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      // соседи попадают в экран одним пакетом: разводим их по времени, чтобы шел каскад.
      // задержка тут, а не в transition-delay: ту наследовал ховер-наклон карточек
      let order = 0;

      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);

        const delay = Math.min(order * 90, 540);
        order += 1;

        setTimeout(() => {
          entry.target.classList.add("is-visible");
          entry.target.querySelectorAll("[data-count]").forEach((counter) => {
            // соседние слайды карусели ждут своей очереди, иначе сгорят вхолостую
            if (counter.closest('[aria-hidden="true"]')) return;
            countUp(counter);
          });
        }, delay);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  // первый экран не проявляется по скроллу, счетчик запускаем после его выезда
  setTimeout(() => {
    document.querySelectorAll(".hero [data-count]").forEach(countUp);
  }, 520);
}

// наклон и подсветка запускаются пользователем и работают даже при reduce
if (window.matchMedia("(hover: hover)").matches) {
  const maxTilt = 13;

  document.querySelectorAll(".result-card, .audience-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;

      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);

      // ось наклона перпендикулярна вектору от центра карточки к курсору
      const dx = (x - 0.5) * 2;
      const dy = (y - 0.5) * 2;
      card.style.setProperty("--tilt-x", `${-dy}`);
      card.style.setProperty("--tilt-y", `${dx}`);
      card.style.setProperty("--tilt", `${Math.min(Math.hypot(dx, dy), 1) * maxTilt}deg`);
      card.style.setProperty("--tilt-scale", "1.02");
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt", "0deg");
      card.style.setProperty("--tilt-scale", "1");
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
  let timer = 0;
  let stopped = false;

  const dotStrip = document.createElement("div");
  dotStrip.className = "carousel-dots";

  const dots = slides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `Перейти к слайду ${index + 1}`);
    dot.addEventListener("click", () => {
      stopAuto(true);
      goTo(index);
    });
    dotStrip.append(dot);
    return dot;
  });

  if (shell && slides.length > 1) shell.append(dotStrip);

  const renderCarousel = () => {
    carousel.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
    slides.forEach((slide, index) => {
      slide.setAttribute("aria-hidden", String(index !== currentIndex));
    });
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
      dot.setAttribute("aria-current", String(index === currentIndex));
    });
    // до появления секции на экране счетчики не трогаем: анимацию никто не увидит
    if (!reducedMotion && (!shell || shell.classList.contains("is-visible"))) {
      slides[currentIndex].querySelectorAll("[data-count]").forEach(countUp);
    }
  };

  const goTo = (index) => {
    currentIndex = (index + slides.length) % slides.length;
    renderCarousel();
  };

  const stopAuto = (permanent) => {
    if (permanent) stopped = true;
    clearInterval(timer);
    timer = 0;
  };

  const startAuto = () => {
    if (stopped || timer || reducedMotion || slides.length < 2) return;
    timer = setInterval(() => goTo(currentIndex + 1), 7000);
  };

  controls.forEach((button) => {
    button.addEventListener("click", () => {
      stopAuto(true);
      goTo(currentIndex + (Number(button.getAttribute("data-direction")) || 1));
    });
  });

  // свайп только для пальца и пера: у мыши перетаскивание конфликтует с выделением текста
  let startX = 0;
  let tracking = false;

  carousel.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    startX = event.clientX;
    tracking = true;
  });

  carousel.addEventListener("pointerup", (event) => {
    if (!tracking) return;
    tracking = false;

    const delta = event.clientX - startX;
    if (Math.abs(delta) < 45) return;

    stopAuto(true);
    goTo(currentIndex + (delta < 0 ? 1 : -1));
  });

  carousel.addEventListener("pointercancel", () => {
    tracking = false;
  });

  if (shell) {
    shell.addEventListener("pointerenter", () => stopAuto(false));
    shell.addEventListener("pointerleave", startAuto);
    shell.addEventListener("focusin", () => stopAuto(false));
    shell.addEventListener("focusout", startAuto);
  }

  renderCarousel();
  startAuto();
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

// искра за курсором и магнитные кнопки: только для точного указателя
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  if (!reducedMotion) {
    const spark = document.createElement("div");
    spark.className = "cursor-spark";
    spark.setAttribute("aria-hidden", "true");
    document.body.append(spark);

    document.addEventListener("pointermove", (event) => {
      spark.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      spark.classList.add("is-active");
    });

    document.addEventListener("pointerleave", () => spark.classList.remove("is-active"));
  }

  // сильнее нельзя: кнопка уезжает из-под курсора, ловит pointerleave и дребезжит
  const pull = 0.18;
  const maxPull = 14;
  const clamp = (value) => Math.max(-maxPull, Math.min(maxPull, value * pull));

  document.querySelectorAll(".button--primary, .header-cta").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const bounds = button.getBoundingClientRect();
      button.style.setProperty(
        "--pull-x",
        `${clamp(event.clientX - bounds.left - bounds.width / 2)}px`
      );
      button.style.setProperty(
        "--pull-y",
        `${clamp(event.clientY - bounds.top - bounds.height / 2)}px`
      );
    });

    button.addEventListener("pointerleave", () => {
      button.style.setProperty("--pull-x", "0px");
      button.style.setProperty("--pull-y", "0px");
    });
  });
}

// лайтбокс галереи работ
const workGallery = document.getElementById("work-gallery");
const lightbox = document.getElementById("lightbox");

if (workGallery && lightbox) {
  const lightboxImg = lightbox.querySelector("img");

  workGallery.querySelectorAll(".work-shot").forEach((shot) => {
    shot.tabIndex = 0;
    shot.setAttribute("role", "button");
  });

  // лента продублирована для бесшовного цикла — листаем только оригиналы
  const shots = [...workGallery.querySelectorAll(".work-shot:not([aria-hidden]) img")];
  let current = 0;

  const show = (index) => {
    current = (index + shots.length) % shots.length;
    const img = shots[current];
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || "Пример работы";
  };

  // у img глобально pointer-events: none, поэтому цель клика — сама карточка
  const openLightbox = (shot) => {
    const img = shot.querySelector("img");
    if (!img) return;
    const index = shots.findIndex((item) => item.src === img.src);
    show(index < 0 ? 0 : index);
    lightbox.showModal();
  };

  workGallery.addEventListener("click", (event) => {
    const shot = event.target.closest(".work-shot");
    if (shot) openLightbox(shot);
  });

  workGallery.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const shot = event.target.closest(".work-shot");
    if (!shot) return;
    event.preventDefault();
    openLightbox(shot);
  });

  lightbox.querySelector(".lightbox-nav--prev").addEventListener("click", () => show(current - 1));
  lightbox.querySelector(".lightbox-nav--next").addEventListener("click", () => show(current + 1));

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });

  lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());

  // сам dialog как цель клика = попали в фон мимо картинки и кнопок
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
}

// примерочная: ползунок "до/после". range лежит прозрачным слоем на всю
// витрину, поэтому тянуть можно в любой точке фотографии
const tryonShell = document.querySelector(".tryon-shell");

if (tryonShell) {
  const stage = tryonShell.querySelector("[data-tryon-stage]");
  const range = tryonShell.querySelector("[data-tryon-range]");
  const before = tryonShell.querySelector("[data-tryon-before]");
  const after = tryonShell.querySelector("[data-tryon-after]");
  const done = tryonShell.querySelector("[data-tryon-done]");
  const tabs = Array.from(tryonShell.querySelectorAll("[data-tryon-item]"));
  const labels = { shoe: "Туфля", mug: "Кружка", shirt: "Футболка" };

  const draw = () => {
    const value = Number(range.value);
    stage.style.setProperty("--reveal", `${value}%`);
    // метка без своей половины кадра только мешает
    stage.classList.toggle("is-full", value > 88);
    stage.classList.toggle("is-empty", value < 12);
    // CTA отдаем тому, кто довел показ до конца, а не просто дернул ползунок
    if (done) done.hidden = value < 92;
  };

  range.addEventListener("input", () => {
    tryonShell.classList.add("is-dragged");
    draw();
  });

  // кадры остальных изделий подтягиваем на подходе к экрану: иначе первое
  // переключение вкладки ждёт загрузку и показывает пустой кадр
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        Object.keys(labels).forEach((key) => {
          ["before", "after"].forEach((state) => {
            new Image().src = `assets/tryon/${key}-${state}.webp`;
          });
        });
      },
      { rootMargin: "300px" }
    ).observe(tryonShell);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.tryonItem;
      before.src = `assets/tryon/${key}-before.webp`;
      before.alt = `${labels[key]} до инкрустации`;
      after.src = `assets/tryon/${key}-after.webp`;
      after.alt = `${labels[key]}, инкрустированная кристаллами`;

      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
    });
  });

  draw();
}
