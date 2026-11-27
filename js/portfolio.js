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

function animateMarket(chart) {
  const series = chart.querySelector(".trades");
  const button = chart.querySelector(".chart-toggle");
  const quotes = [...chart.querySelectorAll("[data-price]")];
  const count = 25;
  const spacing = 24;
  const interval = 2400;
  let elapsed = 0;
  let lastFrame = null;
  let frame = 0;
  let visible = true;
  let paused = false;
  let lastIndex = -1;
  let candles = [];
  const namespace = "http://www.w3.org/2000/svg";

  function svg(tag, attributes) {
    const node = document.createElementNS(namespace, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  // A repeatable price series drives the candles, rolling average and readout.
  function closeAt(index) {
    return 100 + 6 * Math.sin(index * .22) + 3.8 * Math.cos(index * .41) + 2 * Math.sin(index * 1.73);
  }

  function sample(index, progress) {
    const open = closeAt(index - 1);
    const end = closeAt(index);
    const upper = Math.max(open, end) + .55 + Math.abs(Math.sin(index));
    const lower = Math.min(open, end) - .55 - Math.abs(Math.cos(index));
    const ticks = end >= open ? [open, lower, upper, end] : [open, upper, lower, end];
    const phase = Math.min(3, progress * 3);
    const segment = Math.min(2, Math.floor(phase));
    const close = ticks[segment] + (ticks[segment + 1] - ticks[segment]) * (phase - segment);
    const visited = ticks.slice(0, segment + 1);
    return { open, close, high: Math.max(close, ...visited), low: Math.min(close, ...visited),
      volume: (10 + 3 * Math.abs(end - open) + 8 * Math.abs(Math.sin(index * .7))) * progress };
  }

  const y = price => 121 - (price - 100) * 7.5;
  const averageLine = svg("polyline", { fill: "none", stroke: "#e0b78c", "stroke-width": 1.3,
    "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" });
  let completedAveragePoints = "";

  function paint(candle, bar) {
    const rising = bar.close >= bar.open;
    const top = y(Math.max(bar.open, bar.close));
    const bottom = Math.max(top + 1.1, y(Math.min(bar.open, bar.close)));
    candle.group.setAttribute("color", rising ? "#d6efb2" : "#90bbb3");
    candle.wick.setAttribute("d", `M0 ${y(bar.high)}V${top} M0 ${bottom}V${y(bar.low)}`);
    candle.body.setAttribute("fill", rising ? "currentColor" : "none");
    candle.body.setAttribute("y", top);
    candle.body.setAttribute("height", bottom - top);
    candle.volume.setAttribute("height", bar.volume);
    candle.volume.setAttribute("y", 282 - bar.volume);
  }

  function averageAt(index, close) {
    return (close + closeAt(index - 1) + closeAt(index - 2) + closeAt(index - 3) + closeAt(index - 4)) / 5;
  }

  function rebuild(first) {
    series.replaceChildren();
    candles = [];
    const points = [];
    for (let i = 0; i < count; i++) {
      const x = spacing * i + spacing / 2;
      const group = svg("g", { transform: `translate(${x} 0)`, stroke: "currentColor" });
      const wick = svg("path", { "vector-effect": "non-scaling-stroke", fill: "none" });
      const body = svg("rect", { x: -6, width: 12, "vector-effect": "non-scaling-stroke" });
      const volume = svg("rect", { x: -6, width: 12, fill: "currentColor", stroke: "none", opacity: .48 });
      group.append(wick, body, volume);
      series.append(group);
      const candle = { group, wick, body, volume };
      candles.push(candle);
      const index = first + i;
      paint(candle, sample(index, 1));
      if (i < count - 1) points.push(`${x},${y(averageAt(index, closeAt(index)))}`);
    }
    completedAveragePoints = points.join(" ");
    series.append(averageLine);
  }

  function draw() {
    const first = Math.floor(elapsed / interval);
    const phase = (elapsed % interval) / interval;
    if (first !== lastIndex) {
      rebuild(first);
      lastIndex = first;
    }
    const index = first + count - 1;
    const bar = sample(index, Math.min(1, phase / .8));
    paint(candles[count - 1], bar);
    averageLine.setAttribute("points", `${completedAveragePoints} 588,${y(averageAt(index, bar.close))}`);
    // Close the bar first, then slide exactly one slot before opening the next.
    const slide = Math.max(0, (phase - .8) / .2);
    series.setAttribute("transform", `translate(${-spacing * slide * slide * (3 - 2 * slide)} 0)`);
    for (const quote of quotes) {
      const value = bar[quote.dataset.price].toFixed(2);
      if (quote.textContent !== value) quote.textContent = value;
    }
  }

  function tick(now) {
    if (lastFrame !== null) elapsed += Math.min(now - lastFrame, 100);
    lastFrame = now;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function syncPlayback() {
    cancelAnimationFrame(frame);
    lastFrame = null;
    button.hidden = motionPreference.matches;
    if (!paused && visible && !document.hidden && !motionPreference.matches) frame = requestAnimationFrame(tick);
  }
  button.addEventListener("click", () => {
    paused = !paused;
    button.toggleAttribute("data-paused", paused);
    button.setAttribute("aria-label", paused ? "Resume chart animation" : "Pause chart animation");
    syncPlayback();
  });

  elapsed = interval * .45;
  draw();
  chart.querySelector(".chart-fallback").remove();
  chart.querySelector(".quote-row").hidden = false;
  document.addEventListener("visibilitychange", syncPlayback);
  motionPreference.addEventListener("change", syncPlayback);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }).observe(chart);
  }
  syncPlayback();
}

revealSections();
animateMarket(document.querySelector(".market-chart"));
