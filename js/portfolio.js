const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

function revealSections() {
  if (motionPreference.matches || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08 });

  document.querySelectorAll("#portfolio h2, .feature, .project, #about > div, #services > div, #contact .wrap")
    .forEach(element => observer.observe(element));
}

function animateComparison(figure) {
  const svg = figure.querySelector("svg");
  if (!svg.animate) return;

  // Trace the same SVG coordinates that draw the two visible series.
  const portfolio = Array.from(svg.querySelector(".portfolio-line").points);
  const benchmark = Array.from(svg.querySelector(".benchmark-line").points);
  const timing = { duration: 11000, iterations: Infinity, easing: "linear" };
  function trace(selector, points, rule = false) {
    const frames = points.map(({ x, y }, index) => ({
      transform: `translate(${x}px, ${rule ? 0 : y}px)`,
      offset: index / (points.length - 1) * .94
    }));
    frames.push({ ...frames[frames.length - 1], offset: 1 });
    return svg.querySelector(selector).animate(frames, timing);
  }
  const animations = [
    trace(".probe-rule", portfolio, true),
    trace(".portfolio-dot", portfolio),
    trace(".benchmark-dot", benchmark),
    svg.querySelector(".time-probe").animate([
      { opacity: 0, offset: 0 }, { opacity: 1, offset: .045 },
      { opacity: 1, offset: .94 }, { opacity: 0, offset: 1 }
    ], timing)
  ];
  let inView = true;
  function syncMotion() {
    const playing = inView && !motionPreference.matches && !document.hidden;
    for (const animation of animations) {
      if (playing) animation.play();
      else animation.pause();
    }
  }
  figure.classList.add("is-animated");
  motionPreference.addEventListener("change", syncMotion);
  document.addEventListener("visibilitychange", syncMotion);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncMotion();
    }).observe(figure);
  }
  syncMotion();
}

function scrollSkills(skills) {
  const list = skills.querySelector(".skills-list");
  const copy = list.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  copy.removeAttribute("aria-labelledby");
  list.after(copy);

  skills.classList.add("is-ready");
}

scrollSkills(document.querySelector(".skills"));
revealSections();
animateComparison(document.querySelector(".performance"));
