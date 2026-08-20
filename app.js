(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (value, digits = 2) => Number(value).toFixed(digits);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(random) {
    const u = Math.max(1e-9, random());
    const v = Math.max(1e-9, random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function prepareCanvas(canvas) {
    if (!canvas) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(260, canvas.clientWidth || canvas.parentElement.clientWidth || 600);
    const height = Number(canvas.getAttribute("height")) || 360;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function drawGrid(ctx, width, height, pad = 34, divisions = 5) {
    ctx.save();
    ctx.strokeStyle = css("--border");
    ctx.lineWidth = 1;
    for (let i = 0; i <= divisions; i += 1) {
      const x = pad + (i / divisions) * (width - pad * 2);
      const y = pad + (i / divisions) * (height - pad * 2);
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, height - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(width - pad, y); ctx.stroke();
    }
    ctx.restore();
  }

  function syncRange(range) {
    const min = Number(range.min || 0);
    const max = Number(range.max || 100);
    const pct = ((Number(range.value) - min) / (max - min)) * 100;
    range.style.background = `linear-gradient(90deg, var(--cyan) ${pct}%, rgba(134,163,183,.18) ${pct}%)`;
  }
  $$('input[type="range"]').forEach((range) => {
    syncRange(range);
    range.addEventListener("input", () => syncRange(range));
  });

  // Navigation, theme, and progress
  const panels = $$(".panel");
  const navItems = $$(".nav-item");
  const completionIds = ["data-lab", "linear-lab", "perceptron-lab", "activation-lab", "network-lab", "optimizer-lab", "regularization-lab", "cnn-lab", "sequence-lab", "quiz-lab"];
  let completed = new Set(JSON.parse(localStorage.getItem("neural-lab-progress") || "[]"));

  const redrawByPanel = {
    "data-lab": drawDataset,
    "linear-lab": drawLinearLab,
    "perceptron-lab": drawPerceptron,
    "activation-lab": drawActivation,
    "network-lab": drawNetwork,
    "optimizer-lab": drawOptimizer,
    "regularization-lab": drawRegularization,
    "cnn-lab": updateCNN,
    "sequence-lab": drawSequence
  };

  function showPanel(id, updateHash = true) {
    const target = document.getElementById(id) || document.getElementById("dashboard");
    panels.forEach((panel) => panel.classList.toggle("active", panel === target));
    navItems.forEach((item) => {
      const active = item.dataset.target === target.id;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
    });
    $("#current-section-name").textContent = target.dataset.title;
    $("#sidebar").classList.remove("open");
    $("#menu-toggle").setAttribute("aria-expanded", "false");
    if (updateHash) history.replaceState(null, "", target.id === "dashboard" ? location.pathname : `#${target.id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => redrawByPanel[target.id]?.(), 30);
  }

  navItems.forEach((item) => item.addEventListener("click", () => showPanel(item.dataset.target)));
  $$('[data-go]').forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.go)));
  $("#menu-toggle").addEventListener("click", () => {
    const open = $("#sidebar").classList.toggle("open");
    $("#menu-toggle").setAttribute("aria-expanded", String(open));
  });

  const savedTheme = localStorage.getItem("neural-lab-theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  function updateThemeButton() {
    $("#theme-toggle").textContent = document.documentElement.dataset.theme === "light" ? "☀" : "☾";
  }
  updateThemeButton();
  $("#theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("neural-lab-theme", next);
    updateThemeButton();
    setTimeout(redrawVisible, 20);
  });

  let toastTimer;
  function toast(message) {
    const element = $("#toast");
    $("p", element).textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
  }

  function updateProgress() {
    const valid = [...completed].filter((id) => completionIds.includes(id));
    const percent = Math.round((valid.length / completionIds.length) * 100);
    $("#sidebar-progress-text").textContent = `${percent}%`;
    $("#sidebar-progress-bar").style.width = `${percent}%`;
    $("#mastery-percent").textContent = `${percent}%`;
    $("#mastery-ring").style.setProperty("--progress", `${percent * 3.6}deg`);
    $("#xp-count").textContent = `${valid.length * 100} XP`;
    $$("[data-complete]").forEach((button) => {
      const done = completed.has(button.dataset.complete);
      button.classList.toggle("done", done);
      button.lastChild.textContent = done ? " Completed" : " Mark complete";
    });
    $$(".module-card").forEach((card) => card.classList.toggle("completed", completed.has(card.dataset.module)));
    localStorage.setItem("neural-lab-progress", JSON.stringify(valid));
  }

  $$("[data-complete]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.complete;
    if (completed.has(id)) completed.delete(id); else completed.add(id);
    updateProgress();
    toast(completed.has(id) ? "Lab completed — 100 XP earned" : "Lab marked incomplete");
  }));

  $("#reset-progress").addEventListener("click", () => {
    if (window.confirm("Reset all Neural Lab progress and quiz results on this device?")) {
      completed = new Set();
      localStorage.removeItem("neural-lab-quiz-score");
      updateProgress();
      resetQuiz();
      toast("Progress reset");
    }
  });
  updateProgress();

  // Data laboratory
  let dataSeed = 12;
  let dataset = [];

  function generateDataset() {
    const type = $("#data-type").value;
    const count = Number($("#sample-count").value);
    const noise = Number($("#noise-level").value) / 100;
    const split = Number($("#split-ratio").value) / 100;
    const random = seededRandom(dataSeed);
    dataset = [];
    for (let i = 0; i < count; i += 1) {
      let x; let y; let label = 0;
      if (type === "moons") {
        label = i % 2;
        const angle = random() * Math.PI;
        if (label === 0) {
          x = 0.12 + 0.42 * (1 + Math.cos(angle)) + gaussian(random) * noise * 0.15;
          y = 0.18 + 0.55 * Math.sin(angle) + gaussian(random) * noise * 0.15;
        } else {
          x = 0.45 + 0.42 * (1 - Math.cos(angle)) + gaussian(random) * noise * 0.15;
          y = 0.70 - 0.55 * Math.sin(angle) + gaussian(random) * noise * 0.15;
        }
      } else if (type === "regression") {
        x = random();
        y = 0.18 + 0.65 * x + gaussian(random) * noise * 0.45;
      } else {
        x = random(); y = random();
        label = y + gaussian(random) * noise * 0.7 > 0.72 * x + 0.12 ? 1 : 0;
      }
      dataset.push({ x, y, label, train: i < Math.round(count * split) });
    }
    updateDataUI();
  }

  function updateDataUI() {
    const split = Number($("#split-ratio").value) / 100;
    dataset.forEach((point, index) => { point.train = index < Math.round(dataset.length * split); });
    $("#sample-count-output").value = $("#sample-count").value;
    $("#noise-output").value = `${$("#noise-level").value}%`;
    $("#split-output").value = `${$("#split-ratio").value}%`;
    const xs = dataset.map((point) => point.x);
    const mean = xs.reduce((sum, value) => sum + value, 0) / Math.max(1, xs.length);
    const std = Math.sqrt(xs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, xs.length));
    const normalized = $("#normalize-data").checked;
    $("#feature-mean").textContent = normalized ? "0.00" : fmt(mean);
    $("#feature-std").textContent = normalized ? "1.00" : fmt(std);
    $("#train-count").textContent = dataset.filter((point) => point.train).length;
    $("#test-count").textContent = dataset.filter((point) => !point.train).length;
    $("#data-insight p").textContent = normalized
      ? "Standardization changes the scale, not the underlying pattern. It helps gradient-based optimizers treat features more evenly."
      : "Increase noise and shrink the training split. Notice that fewer, messier examples make it harder to learn a dependable boundary.";
    drawDataset();
  }

  function drawDataset() {
    const prepared = prepareCanvas($("#data-canvas"));
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const pad = 38;
    drawGrid(ctx, width, height, pad, 5);
    const normalized = $("#normalize-data").checked;
    let display = dataset.map((point) => ({ ...point }));
    if (normalized && dataset.length) {
      ["x", "y"].forEach((key) => {
        const values = display.map((point) => point[key]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) || 1;
        display.forEach((point) => { point[key] = (point[key] - mean) / std; });
      });
      const allValues = display.flatMap((point) => [point.x, point.y]);
      const min = Math.min(...allValues); const max = Math.max(...allValues);
      display.forEach((point) => { point.x = (point.x - min) / (max - min); point.y = (point.y - min) / (max - min); });
    }
    display.forEach((point) => {
      const x = pad + clamp(point.x, 0, 1) * (width - pad * 2);
      const y = height - pad - clamp(point.y, 0, 1) * (height - pad * 2);
      const regression = $("#data-type").value === "regression";
      const color = regression ? css("--cyan") : point.label ? css("--pink") : css("--blue");
      ctx.beginPath(); ctx.arc(x, y, point.train ? 4.2 : 5.1, 0, Math.PI * 2);
      if (point.train) { ctx.fillStyle = color; ctx.globalAlpha = 0.78; ctx.fill(); }
      else { ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.globalAlpha = 1; ctx.stroke(); }
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = css("--muted"); ctx.font = "10px DM Sans";
    ctx.fillText(normalized ? "standardized feature 1" : "feature 1", width / 2 - 42, height - 9);
    ctx.save(); ctx.translate(12, height / 2 + 35); ctx.rotate(-Math.PI / 2); ctx.fillText(normalized ? "standardized feature 2" : "feature 2", 0, 0); ctx.restore();
  }

  ["sample-count", "noise-level", "split-ratio", "normalize-data"].forEach((id) => $("#" + id).addEventListener("input", () => {
    if (id === "split-ratio" || id === "normalize-data") updateDataUI(); else generateDataset();
  }));
  $("#data-type").addEventListener("change", generateDataset);
  $("#generate-data").addEventListener("click", () => { dataSeed += 1; generateDataset(); toast("Fresh dataset generated"); });
  $("#data-randomize").addEventListener("click", () => { dataSeed += 7; generateDataset(); });
  $("#shuffle-data").addEventListener("click", () => {
    const random = seededRandom(++dataSeed);
    for (let i = dataset.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1)); [dataset[i], dataset[j]] = [dataset[j], dataset[i]];
    }
    updateDataUI(); toast("Examples shuffled before splitting");
  });
  generateDataset();

  // Linear regression laboratory
  let linearData = [];
  let linearM = -0.5;
  let linearC = 0.2;
  let linearLossHistory = [];
  let linearRunning = false;

  function resetLinear() {
    const random = seededRandom(41);
    linearData = Array.from({ length: 34 }, (_, i) => {
      const x = i / 33;
      return { x, y: 0.14 + 0.7 * x + gaussian(random) * 0.065 };
    });
    linearM = -0.5; linearC = 0.2; linearLossHistory = [];
    $("#slope").value = -50; $("#bias").value = 20;
    syncRange($("#slope")); syncRange($("#bias"));
    linearRunning = false; $("#linear-train").textContent = "Auto train"; $("#linear-status").textContent = "Manual";
    drawLinearLab();
  }

  function linearLoss() {
    return linearData.reduce((sum, point) => sum + (linearM * point.x + linearC - point.y) ** 2, 0) / linearData.length;
  }

  function linearStep() {
    let dm = 0; let dc = 0;
    linearData.forEach((point) => {
      const error = linearM * point.x + linearC - point.y;
      dm += 2 * error * point.x; dc += 2 * error;
    });
    const lr = Number($("#linear-lr").value) / 100;
    linearM -= lr * dm / linearData.length;
    linearC -= lr * dc / linearData.length;
    $("#slope").value = clamp(Math.round(linearM * 100), -200, 200);
    $("#bias").value = clamp(Math.round(linearC * 100), -100, 100);
    syncRange($("#slope")); syncRange($("#bias"));
    linearLossHistory.push(linearLoss());
    if (linearLossHistory.length > 80) linearLossHistory.shift();
    drawLinearLab();
  }

  function drawLinearLab() {
    $("#slope-output").value = fmt(linearM);
    $("#bias-output").value = fmt(linearC);
    $("#linear-lr-output").value = fmt(Number($("#linear-lr").value) / 100);
    $("#linear-formula").textContent = `ŷ = ${fmt(linearM)}x ${linearC >= 0 ? "+" : "−"} ${fmt(Math.abs(linearC))}`;
    $("#linear-loss").textContent = fmt(linearLoss(), 4);
    const prepared = prepareCanvas($("#linear-canvas"));
    if (prepared) {
      const { ctx, width, height } = prepared; const pad = 38;
      drawGrid(ctx, width, height, pad, 5);
      linearData.forEach((point) => {
        const x = pad + point.x * (width - pad * 2); const y = height - pad - point.y * (height - pad * 2);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = css("--violet"); ctx.globalAlpha = .78; ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.save(); ctx.beginPath(); ctx.rect(pad, pad, width - pad * 2, height - pad * 2); ctx.clip();
      ctx.beginPath();
      ctx.moveTo(pad, height - pad - linearC * (height - pad * 2));
      ctx.lineTo(width - pad, height - pad - (linearM + linearC) * (height - pad * 2));
      ctx.strokeStyle = css("--cyan"); ctx.lineWidth = 3; ctx.shadowColor = css("--cyan"); ctx.shadowBlur = 10; ctx.stroke(); ctx.restore();
    }
    const lossPrepared = prepareCanvas($("#loss-canvas"));
    if (lossPrepared) {
      const { ctx, width, height } = lossPrepared;
      if (linearLossHistory.length > 1) {
        const max = Math.max(...linearLossHistory, .001); ctx.beginPath();
        linearLossHistory.forEach((loss, index) => {
          const x = 5 + (index / (linearLossHistory.length - 1)) * (width - 10);
          const y = height - 8 - (loss / max) * (height - 16);
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = css("--cyan"); ctx.lineWidth = 2; ctx.stroke();
      }
    }
  }

  $("#slope").addEventListener("input", (event) => { linearM = Number(event.target.value) / 100; linearLossHistory = []; drawLinearLab(); });
  $("#bias").addEventListener("input", (event) => { linearC = Number(event.target.value) / 100; linearLossHistory = []; drawLinearLab(); });
  $("#linear-lr").addEventListener("input", drawLinearLab);
  $("#linear-step").addEventListener("click", () => { $("#linear-status").textContent = "Updated"; linearStep(); });
  $("#linear-train").addEventListener("click", () => {
    linearRunning = !linearRunning;
    $("#linear-train").textContent = linearRunning ? "Pause training" : "Auto train";
    $("#linear-status").textContent = linearRunning ? "Training" : "Paused";
    const run = () => {
      if (!linearRunning) return;
      linearStep();
      if (linearLoss() < .0045 || linearLossHistory.length >= 80) {
        linearRunning = false; $("#linear-train").textContent = "Auto train"; $("#linear-status").textContent = "Converged"; toast("Gradient descent found a strong fit"); return;
      }
      requestAnimationFrame(run);
    };
    if (linearRunning) requestAnimationFrame(run);
  });
  $("#linear-reset").addEventListener("click", resetLinear);
  resetLinear();

  // Perceptron laboratory
  let perceptronPoints = [];
  let perceptron = { w1: 0, w2: 0, b: 0, epoch: 0, mistakes: null };
  let perceptronRunning = false;

  function buildPerceptronData() {
    const type = $("#perceptron-dataset").value;
    const random = seededRandom(type === "xor" ? 81 : 72);
    perceptronPoints = Array.from({ length: 42 }, () => {
      const x = random() * 1.8 - .9; const y = random() * 1.8 - .9;
      const label = type === "xor" ? Number(x * y > 0) : Number(.85 * x + .65 * y > .05);
      return { x, y, label };
    });
    resetPerceptron();
  }

  function resetPerceptron() {
    perceptronRunning = false;
    perceptron = { w1: .08, w2: -.06, b: 0, epoch: 0, mistakes: null };
    $("#perceptron-run").textContent = "Train to stop";
    $("#perceptron-state").textContent = "Untrained";
    drawPerceptron();
  }

  function trainPerceptronEpoch() {
    const lr = Number($("#perceptron-lr").value) / 100;
    let mistakes = 0;
    perceptronPoints.forEach((point) => {
      const predicted = perceptron.w1 * point.x + perceptron.w2 * point.y + perceptron.b >= 0 ? 1 : 0;
      const correction = point.label - predicted;
      if (correction !== 0) {
        perceptron.w1 += lr * correction * point.x;
        perceptron.w2 += lr * correction * point.y;
        perceptron.b += lr * correction;
        mistakes += 1;
      }
    });
    perceptron.epoch += 1; perceptron.mistakes = mistakes;
    $("#perceptron-state").textContent = mistakes === 0 ? "Converged" : "Learning";
    drawPerceptron();
    return mistakes;
  }

  function perceptronAccuracy() {
    return perceptronPoints.filter((point) => (perceptron.w1 * point.x + perceptron.w2 * point.y + perceptron.b >= 0 ? 1 : 0) === point.label).length / perceptronPoints.length;
  }

  function drawPerceptron() {
    $("#perceptron-lr-output").value = fmt(Number($("#perceptron-lr").value) / 100);
    $("#weight-one").textContent = fmt(perceptron.w1);
    $("#weight-two").textContent = fmt(perceptron.w2);
    $("#weight-bias").textContent = fmt(perceptron.b);
    $("#epoch-count").textContent = perceptron.epoch;
    $("#mistake-count").textContent = perceptron.mistakes ?? "—";
    $("#perceptron-accuracy").textContent = `${Math.round(perceptronAccuracy() * 100)}%`;
    const prepared = prepareCanvas($("#perceptron-canvas")); if (!prepared) return;
    const { ctx, width, height } = prepared; const pad = 38;
    const xPx = (x) => pad + ((x + 1) / 2) * (width - pad * 2);
    const yPx = (y) => height - pad - ((y + 1) / 2) * (height - pad * 2);
    const step = 15;
    for (let py = pad; py < height - pad; py += step) {
      for (let px = pad; px < width - pad; px += step) {
        const x = ((px - pad) / (width - pad * 2)) * 2 - 1;
        const y = (1 - (py - pad) / (height - pad * 2)) * 2 - 1;
        const cls = perceptron.w1 * x + perceptron.w2 * y + perceptron.b >= 0;
        ctx.fillStyle = cls ? "rgba(255,102,138,.035)" : "rgba(79,140,255,.035)"; ctx.fillRect(px, py, step, step);
      }
    }
    drawGrid(ctx, width, height, pad, 4);
    if (Math.abs(perceptron.w2) > 1e-6) {
      const y1 = -(perceptron.w1 * -1 + perceptron.b) / perceptron.w2;
      const y2 = -(perceptron.w1 * 1 + perceptron.b) / perceptron.w2;
      ctx.save(); ctx.beginPath(); ctx.rect(pad, pad, width - pad * 2, height - pad * 2); ctx.clip();
      ctx.beginPath(); ctx.moveTo(xPx(-1), yPx(y1)); ctx.lineTo(xPx(1), yPx(y2)); ctx.strokeStyle = css("--cyan"); ctx.lineWidth = 2.5; ctx.shadowColor = css("--cyan"); ctx.shadowBlur = 8; ctx.stroke(); ctx.restore();
    }
    perceptronPoints.forEach((point) => {
      ctx.beginPath(); ctx.arc(xPx(point.x), yPx(point.y), 5, 0, Math.PI * 2); ctx.fillStyle = point.label ? css("--pink") : css("--blue"); ctx.fill();
      ctx.strokeStyle = css("--card-solid"); ctx.lineWidth = 1.5; ctx.stroke();
    });
  }

  $("#perceptron-dataset").addEventListener("change", () => {
    buildPerceptronData();
    $("#perceptron-insight p").textContent = $("#perceptron-dataset").value === "xor"
      ? "XOR places the same class in opposite corners. No single straight line can separate it, so the perceptron keeps correcting without converging."
      : "This dataset has a valid straight boundary. With a suitable learning rate, the perceptron should reach zero mistakes.";
  });
  $("#perceptron-lr").addEventListener("input", drawPerceptron);
  $("#perceptron-step").addEventListener("click", trainPerceptronEpoch);
  $("#perceptron-run").addEventListener("click", () => {
    perceptronRunning = !perceptronRunning; $("#perceptron-run").textContent = perceptronRunning ? "Pause training" : "Train to stop";
    const run = () => {
      if (!perceptronRunning) return;
      const mistakes = trainPerceptronEpoch();
      if (mistakes === 0 || perceptron.epoch >= 45) {
        perceptronRunning = false; $("#perceptron-run").textContent = "Train to stop";
        $("#perceptron-state").textContent = mistakes === 0 ? "Converged" : "No convergence";
        toast(mistakes === 0 ? "Boundary converged" : "XOR needs hidden layers"); return;
      }
      setTimeout(run, 85);
    };
    if (perceptronRunning) run();
  });
  $("#perceptron-reset").addEventListener("click", resetPerceptron);
  buildPerceptronData();

  // Activation function laboratory
  let activeActivation = "sigmoid";
  const activations = {
    sigmoid: { title: "Sigmoid", f: (x) => 1 / (1 + Math.exp(-x)), d: (x) => { const y = 1 / (1 + Math.exp(-x)); return y * (1 - y); }, copy: "Sigmoid saturates at both extremes, where its derivative approaches zero. Deep chains can quickly lose their learning signal." },
    tanh: { title: "Hyperbolic tangent", f: Math.tanh, d: (x) => 1 - Math.tanh(x) ** 2, copy: "Tanh is zero-centered, but its derivative still shrinks near the saturated extremes." },
    relu: { title: "ReLU", f: (x) => Math.max(0, x), d: (x) => x > 0 ? 1 : 0, copy: "ReLU keeps a strong gradient for positive inputs, but inactive negative units receive no gradient." },
    leaky: { title: "Leaky ReLU", f: (x) => x > 0 ? x : .1 * x, d: (x) => x > 0 ? 1 : .1, copy: "Leaky ReLU preserves a small learning signal for negative inputs, reducing the risk of permanently inactive units." }
  };

  function drawActivation() {
    const activation = activations[activeActivation]; const x = Number($("#activation-x").value) / 10; const depth = Number($("#network-depth").value);
    const value = activation.f(x); const derivative = activation.d(x); const retained = Math.min(1, Math.abs(derivative) ** depth);
    $("#activation-title").textContent = activation.title; $("#activation-x-output").value = fmt(x, 1); $("#depth-output").value = depth;
    $("#activation-value").textContent = fmt(value, 3); $("#derivative-value").textContent = fmt(derivative, 3);
    $("#gradient-retained").textContent = retained * 100 < .001 ? "<0.001%" : `${fmt(retained * 100, 3)}%`;
    $("#gradient-meter-bar").style.width = `${Math.max(.4, retained * 100)}%`;
    $("#gradient-formula").textContent = `${fmt(Math.abs(derivative), 3)}${depth > 1 ? `^${depth}` : ""}`;
    $("#activation-explanation").textContent = activation.copy;
    const prepared = prepareCanvas($("#activation-canvas")); if (!prepared) return;
    const { ctx, width, height } = prepared; const pad = 38;
    const maxY = activeActivation === "relu" || activeActivation === "leaky" ? 5.2 : 1.25;
    const minY = activeActivation === "sigmoid" ? -.25 : activeActivation === "relu" ? -.4 : -1.25;
    const px = (vx) => pad + ((vx + 5) / 10) * (width - pad * 2);
    const py = (vy) => height - pad - ((vy - minY) / (maxY - minY)) * (height - pad * 2);
    drawGrid(ctx, width, height, pad, 5);
    ctx.strokeStyle = css("--border-strong"); ctx.beginPath(); ctx.moveTo(pad, py(0)); ctx.lineTo(width-pad, py(0)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px(0), pad); ctx.lineTo(px(0), height-pad); ctx.stroke();
    [[activation.f, css("--cyan"), 2.8], [activation.d, css("--violet"), 2]].forEach(([fn, color, lineWidth]) => {
      ctx.beginPath();
      for (let i = 0; i <= 300; i += 1) {
        const vx = -5 + (i / 300) * 10; const vy = fn(vx);
        if (i === 0) ctx.moveTo(px(vx), py(vy)); else ctx.lineTo(px(vx), py(vy));
      }
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(px(x), py(value), 5, 0, Math.PI*2); ctx.fillStyle = css("--cyan-bright"); ctx.fill();
  }

  $$("#activation-tabs button").forEach((button) => button.addEventListener("click", () => {
    activeActivation = button.dataset.activation; $$("#activation-tabs button").forEach((b) => b.classList.toggle("active", b === button)); drawActivation();
  }));
  $("#activation-x").addEventListener("input", drawActivation); $("#network-depth").addEventListener("input", drawActivation);
  drawActivation();

  // Network architecture builder
  let hiddenLayers = [6, 4];
  function renderLayerControls() {
    const root = $("#hidden-layer-list"); root.innerHTML = "";
    hiddenLayers.forEach((units, index) => {
      const row = document.createElement("label"); row.className = "layer-row";
      row.innerHTML = `<span>Hidden layer ${index + 1}</span><input type="number" min="1" max="16" value="${units}" aria-label="Units in hidden layer ${index + 1}"><button type="button" aria-label="Remove hidden layer ${index + 1}">×</button>`;
      $("input", row).addEventListener("input", (event) => { hiddenLayers[index] = clamp(Number(event.target.value) || 1, 1, 16); updateNetwork(); });
      $("button", row).addEventListener("click", () => { hiddenLayers.splice(index, 1); renderLayerControls(); updateNetwork(); });
      root.appendChild(row);
    });
  }

  function updateNetwork() {
    const layers = [clamp(Number($("#network-inputs").value) || 1, 1, 12), ...hiddenLayers, clamp(Number($("#network-outputs").value) || 1, 1, 8)];
    let params = 0;
    for (let i = 1; i < layers.length; i += 1) params += layers[i - 1] * layers[i] + layers[i];
    $("#parameter-count").textContent = params.toLocaleString();
    $("#network-depth-label").textContent = `${layers.length} layers`;
    $("#network-summary").textContent = `${layers.join(" → ")} units · ${$("#network-activation").value} hidden activations · each dense layer adds (inputs × units) + biases.`;
    drawNetwork();
  }

  function drawNetwork() {
    const prepared = prepareCanvas($("#network-canvas")); if (!prepared) return;
    const { ctx, width, height } = prepared; const padX = 55; const padY = 42;
    const layers = [clamp(Number($("#network-inputs").value) || 1, 1, 12), ...hiddenLayers, clamp(Number($("#network-outputs").value) || 1, 1, 8)];
    const positions = layers.map((count, li) => {
      const shown = Math.min(count, 9); const x = layers.length === 1 ? width/2 : padX + (li/(layers.length-1))*(width-padX*2);
      return Array.from({length:shown},(_,i)=>({x,y:padY + ((i+.5)/shown)*(height-padY*2)}));
    });
    ctx.lineWidth = .8;
    for (let li = 0; li < positions.length - 1; li += 1) {
      positions[li].forEach((a) => positions[li+1].forEach((b) => {
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle = "rgba(83,145,170,.16)"; ctx.stroke();
      }));
    }
    positions.forEach((layer, li) => layer.forEach((point) => {
      const output = li === positions.length - 1; const input = li === 0;
      ctx.beginPath(); ctx.arc(point.x,point.y, output ? 9 : 7,0,Math.PI*2);
      ctx.fillStyle = output ? css("--cyan") : input ? css("--blue") : "rgba(139,114,255,.62)"; ctx.fill();
      ctx.strokeStyle = css("--card-solid"); ctx.lineWidth = 2; ctx.stroke();
    }));
    ctx.fillStyle = css("--muted"); ctx.font = "9px DM Sans"; ctx.textAlign="center";
    layers.forEach((count, li) => {
      const x = layers.length === 1 ? width/2 : padX + (li/(layers.length-1))*(width-padX*2);
      ctx.fillText(li===0?`Input · ${count}`:li===layers.length-1?`Output · ${count}`:`Hidden ${li} · ${count}`,x,height-13);
      if(count>9) ctx.fillText(`+${count-9} more`,x,height/2+6);
    });
  }

  $("#add-hidden-layer").addEventListener("click", () => { if (hiddenLayers.length < 5) { hiddenLayers.push(4); renderLayerControls(); updateNetwork(); } else toast("Five hidden layers is the lab limit"); });
  ["network-inputs","network-outputs","network-activation"].forEach((id)=>$("#"+id).addEventListener("input",updateNetwork));
  renderLayerControls(); updateNetwork();

  // Optimizer laboratory
  let optimizerState;
  let optimizerRunning = false;
  const optimizerDescriptions = {
    sgd: ["SGD", "Uses the current gradient directly. It can oscillate across narrow valleys."],
    momentum: ["Momentum", "Accumulates velocity to smooth oscillations and accelerate along consistent directions."],
    rmsprop: ["RMSProp", "Scales each parameter by a moving average of its squared gradients."],
    adam: ["Adam", "Combines momentum with adaptive per-parameter step sizes."]
  };
  const surfaceLoss = (x,y) => .6 + (x*x)/10 + (y*y)/5 + .13*Math.sin(3*x)*Math.cos(2*y);
  const surfaceGrad = (x,y) => [x/5 + .39*Math.cos(3*x)*Math.cos(2*y), 2*y/5 - .26*Math.sin(3*x)*Math.sin(2*y)];

  function resetOptimizer(x=3.25,y=-3.0) {
    optimizerRunning=false; $("#optimizer-run").textContent="Run 40 steps";
    optimizerState={x,y,path:[{x,y}],step:0,m:[0,0],v:[0,0],velocity:[0,0]}; drawOptimizer();
  }
  function optimizerStep() {
    const type=$("#optimizer-select").value; const lr=Number($("#optimizer-lr").value)/100; const g=surfaceGrad(optimizerState.x,optimizerState.y); optimizerState.step+=1;
    let delta=[0,0];
    if(type==="sgd") delta=g.map(v=>lr*v);
    if(type==="momentum") { optimizerState.velocity=optimizerState.velocity.map((v,i)=>.88*v+g[i]); delta=optimizerState.velocity.map(v=>lr*v); }
    if(type==="rmsprop") { optimizerState.v=optimizerState.v.map((v,i)=>.9*v+.1*g[i]**2); delta=g.map((v,i)=>lr*v/(Math.sqrt(optimizerState.v[i])+1e-7)); }
    if(type==="adam") {
      optimizerState.m=optimizerState.m.map((v,i)=>.9*v+.1*g[i]); optimizerState.v=optimizerState.v.map((v,i)=>.999*v+.001*g[i]**2);
      delta=g.map((_,i)=>lr*(optimizerState.m[i]/(1-.9**optimizerState.step))/(Math.sqrt(optimizerState.v[i]/(1-.999**optimizerState.step))+1e-7));
    }
    optimizerState.x=clamp(optimizerState.x-delta[0],-4,4); optimizerState.y=clamp(optimizerState.y-delta[1],-4,4); optimizerState.path.push({x:optimizerState.x,y:optimizerState.y}); drawOptimizer();
  }
  function drawOptimizer() {
    if(!optimizerState)return;
    $("#optimizer-lr-output").value=fmt(Number($("#optimizer-lr").value)/100); $("#optimizer-step-count").textContent=`Step ${optimizerState.step}`; $("#optimizer-loss").textContent=fmt(surfaceLoss(optimizerState.x,optimizerState.y),3);
    const facts=optimizerDescriptions[$("#optimizer-select").value]; $("#optimizer-facts").innerHTML=`<strong>${facts[0]}</strong><p>${facts[1]}</p>`;
    const prepared=prepareCanvas($("#optimizer-canvas")); if(!prepared)return; const {ctx,width,height}=prepared; const pad=28; const cols=52,rows=42; const cw=(width-pad*2)/cols,ch=(height-pad*2)/rows;
    for(let iy=0;iy<rows;iy+=1){for(let ix=0;ix<cols;ix+=1){const x=-4+(ix/(cols-1))*8,y=4-(iy/(rows-1))*8;const loss=clamp((surfaceLoss(x,y)-.45)/4.8,0,1);const hue=190+loss*75;ctx.fillStyle=`hsla(${hue},55%,${12+loss*18}%,.88)`;ctx.fillRect(pad+ix*cw,pad+iy*ch,cw+1,ch+1);}}
    const px=x=>pad+((x+4)/8)*(width-pad*2), py=y=>pad+((4-y)/8)*(height-pad*2);
    ctx.beginPath();optimizerState.path.forEach((p,i)=>{if(i===0)ctx.moveTo(px(p.x),py(p.y));else ctx.lineTo(px(p.x),py(p.y));});ctx.strokeStyle=css("--pink");ctx.lineWidth=2.2;ctx.stroke();
    optimizerState.path.forEach((p,i)=>{if(i%3===0||i===optimizerState.path.length-1){ctx.beginPath();ctx.arc(px(p.x),py(p.y),i===optimizerState.path.length-1?5:2.3,0,Math.PI*2);ctx.fillStyle=i===optimizerState.path.length-1?css("--cyan-bright"):css("--pink");ctx.fill();}});
    ctx.beginPath();ctx.arc(px(0),py(0),7,0,Math.PI*2);ctx.strokeStyle="rgba(255,255,255,.42)";ctx.lineWidth=1.4;ctx.stroke();
  }
  $("#optimizer-select").addEventListener("change",()=>resetOptimizer()); $("#optimizer-lr").addEventListener("input",drawOptimizer); $("#optimizer-step").addEventListener("click",optimizerStep);
  $("#optimizer-run").addEventListener("click",()=>{optimizerRunning=!optimizerRunning;$("#optimizer-run").textContent=optimizerRunning?"Pause race":"Run 40 steps";const run=()=>{if(!optimizerRunning)return;optimizerStep();if(optimizerState.step>=40){optimizerRunning=false;$("#optimizer-run").textContent="Run 40 steps";toast("Optimizer race complete");return;}setTimeout(run,70)};if(optimizerRunning)run();});
  $("#optimizer-reset").addEventListener("click",()=>resetOptimizer());
  $("#optimizer-canvas").addEventListener("click",(event)=>{const rect=event.currentTarget.getBoundingClientRect();const pad=28;const x=-4+clamp((event.clientX-rect.left-pad)/(rect.width-pad*2),0,1)*8;const y=4-clamp((event.clientY-rect.top-pad)/(rect.height-pad*2),0,1)*8;resetOptimizer(x,y);});
  resetOptimizer();

  // Regularization and generalization laboratory
  function truePattern(x){return .5+.25*Math.sin(Math.PI*2*x)+.08*Math.cos(Math.PI*5*x);}
  function modelPattern(x,complexity,size,lambda,dropout){const learn=Math.min(1,complexity/3);const base=.5+.25*learn*Math.sin(Math.PI*2*x)+.08*Math.min(1,complexity/5)*Math.cos(Math.PI*5*x);const wiggle=Math.max(0,complexity-4)*.025*(22/size)*(1-lambda*.82)*(1-dropout*.7)*Math.sin((complexity+3)*Math.PI*x+0.4);return base+wiggle;}
  function drawRegularization(){
    const complexity=Number($("#model-complexity").value),size=Number($("#training-size").value),lambda=Number($("#regularization-lambda").value)/100,dropout=Number($("#dropout-rate").value)/100;
    $("#complexity-output").value=complexity;$("#training-size-output").value=size;$("#lambda-output").value=fmt(lambda);$("#dropout-output").value=`${Math.round(dropout*100)}%`;
    const effective=complexity*(1-lambda*.55)*(1-dropout*.45);let diagnosis,title,copy;if(effective<2.3){diagnosis="under";title="Underfitting";copy="The model is too constrained to capture the underlying pattern."}else if(effective>6.2&&size<28){diagnosis="over";title="Overfitting risk";copy="High capacity and limited data produce a fragile fit."}else{diagnosis="balanced";title="Balanced fit";copy="Capacity and constraint are currently in a useful range."}
    $("#fit-diagnosis").innerHTML=`<span>${title}</span><p>${copy}</p>`;$("#effective-capacity").textContent=fmt(effective,1);
    const trainError=.12/(complexity+.8)+.015+lambda*.035+dropout*.025;const valError=trainError+.13*Math.max(0,effective-4.5)**1.35/Math.max(9,size)+.07*Math.max(0,2.5-effective);
    $("#train-error").textContent=fmt(trainError,3);$("#validation-error").textContent=fmt(valError,3);
    const prepared=prepareCanvas($("#regularization-canvas"));if(!prepared)return;const{ctx,width,height}=prepared,pad=36;drawGrid(ctx,width,height,pad,5);const px=x=>pad+x*(width-pad*2),py=y=>height-pad-y*(height-pad*2);
    const random=seededRandom(93);for(let i=0;i<size;i+=1){const x=(i+.5)/size,y=truePattern(x)+gaussian(random)*.055;ctx.beginPath();ctx.arc(px(x),py(y),3.5,0,Math.PI*2);ctx.fillStyle=i%5===0?css("--pink"):css("--violet");ctx.globalAlpha=i%5===0?1:.7;ctx.fill();}
    ctx.globalAlpha=1;[[truePattern,"rgba(182,201,214,.55)",1.4,[5,5]],[(x)=>modelPattern(x,complexity,size,lambda,dropout),css("--cyan"),3,[]]].forEach(([fn,color,lw,dash])=>{ctx.beginPath();for(let i=0;i<=250;i+=1){const x=i/250,y=fn(x);if(i===0)ctx.moveTo(px(x),py(y));else ctx.lineTo(px(x),py(y));}ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);});
  }
  ["model-complexity","training-size","regularization-lambda","dropout-rate"].forEach(id=>$("#"+id).addEventListener("input",drawRegularization));drawRegularization();

  // Convolutional neural network laboratory
  const kernels={edge:[[1,0,-1],[1,0,-1],[1,0,-1]],horizontal:[[1,1,1],[0,0,0],[-1,-1,-1]],sharpen:[[0,-1,0],[-1,5,-1],[0,-1,0]],blur:[[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],emboss:[[-2,-1,0],[-1,1,1],[0,1,2]]};
  let cnnInput=Array.from({length:8},()=>Array(8).fill(0));
  function loadCnnShape(){cnnInput=Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>((c===2&&r>0)||(r===6&&c>1&&c<7)||(c-r===1&&r>1&&r<6))?1:0));updateCNN();}
  function convolve(input,kernel,padding,stride){const pad=padding==="same"?1:0;const n=input.length;const outSize=Math.floor((n+2*pad-3)/stride)+1;const output=Array.from({length:outSize},()=>Array(outSize).fill(0));for(let oy=0;oy<outSize;oy+=1){for(let ox=0;ox<outSize;ox+=1){let sum=0;for(let ky=0;ky<3;ky+=1){for(let kx=0;kx<3;kx+=1){const iy=oy*stride+ky-pad,ix=ox*stride+kx-pad;sum+=(input[iy]?.[ix]??0)*kernel[ky][kx];}}output[oy][ox]=$("#cnn-relu").checked?Math.max(0,sum):sum;}}return output;}
  function poolMatrix(input){const out=[];for(let y=0;y+1<input.length;y+=2){const row=[];for(let x=0;x+1<input[0].length;x+=2)row.push(Math.max(input[y][x],input[y][x+1],input[y+1][x],input[y+1][x+1]));out.push(row);}return out;}
  function drawMatrix(canvas,matrix,inputMode=false){const prepared=prepareCanvas(canvas);if(!prepared)return;const{ctx,width,height}=prepared;const size=Math.min(width,height)-30,left=(width-size)/2,top=(height-size)/2,cell=size/matrix.length;const flat=matrix.flat(),max=Math.max(...flat.map(Math.abs),1e-6);matrix.forEach((row,y)=>row.forEach((value,x)=>{const intensity=inputMode?clamp(value,0,1):Math.abs(value)/max;ctx.fillStyle=inputMode?`rgba(36,212,196,${.07+intensity*.88})`:value<0?`rgba(255,102,138,${.08+intensity*.85})`:`rgba(36,212,196,${.07+intensity*.88})`;ctx.fillRect(left+x*cell+1,top+y*cell+1,cell-2,cell-2);ctx.strokeStyle=css("--border");ctx.strokeRect(left+x*cell+.5,top+y*cell+.5,cell-1,cell-1);}));}
  function updateCNN(){const kernel=kernels[$("#kernel-select").value];$("#kernel-grid").innerHTML=kernel.flat().map(value=>`<span>${Number.isInteger(value)?value:fmt(value,2)}</span>`).join("");let output=convolve(cnnInput,kernel,$("#padding-select").value,Number($("#stride-select").value));if($("#cnn-pooling").checked&&output.length>1)output=poolMatrix(output);$("#cnn-output-shape").textContent=`${output.length} × ${output[0]?.length||0}`;$("#cnn-caption").textContent=$("#cnn-pooling").checked?"Max pooling keeps the strongest response in each 2×2 region.":"Bright cells show positive features; pink cells show negative responses when ReLU is off.";drawMatrix($("#cnn-input-canvas"),cnnInput,true);drawMatrix($("#cnn-output-canvas"),output,false);}
  ["kernel-select","padding-select","stride-select","cnn-relu","cnn-pooling"].forEach(id=>$("#"+id).addEventListener("change",updateCNN));$("#cnn-sample").addEventListener("click",loadCnnShape);
  $("#cnn-input-canvas").addEventListener("click",event=>{const rect=event.currentTarget.getBoundingClientRect(),size=Math.min(rect.width,Number(event.currentTarget.getAttribute("height")))-30,left=(rect.width-size)/2,top=(Number(event.currentTarget.getAttribute("height"))-size)/2;const x=Math.floor((event.clientX-rect.left-left)/(size/8)),y=Math.floor((event.clientY-rect.top-top)/(size/8));if(x>=0&&x<8&&y>=0&&y<8){const levels=[0,.35,.7,1],index=levels.findIndex(v=>Math.abs(v-cnnInput[y][x])<.01);cnnInput[y][x]=levels[(index+1)%levels.length];updateCNN();}});loadCnnShape();

  // Recurrent sequence laboratory
  let sequenceWords=[];let sequenceIndex=-1;let sequenceTimer=null;
  function resetSequence(){clearInterval(sequenceTimer);sequenceWords=$("#sequence-input").value.trim().split(/\s+/).filter(Boolean).slice(0,18);sequenceIndex=-1;$("#sequence-step-label").textContent="Ready";renderSequenceTokens();drawSequence();}
  function retentionValue(){const base=Number($("#retention-gate").value)/100;const cell=$("#sequence-cell").value;return clamp(base*(cell==="rnn"?.72:cell==="gru"?.91:1),.05,.995);}
  function renderSequenceTokens(){$("#sequence-tokens").innerHTML=sequenceWords.map((word,index)=>`<span class="${index<sequenceIndex?"seen":index===sequenceIndex?"current":""}">${word}</span>`).join("");}
  function stepSequence(){if(sequenceIndex>=sequenceWords.length-1)return false;sequenceIndex+=1;$("#sequence-step-label").textContent=`Token ${sequenceIndex+1}/${sequenceWords.length}`;renderSequenceTokens();drawSequence();return true;}
  function drawSequence(){
    $("#retention-output").value=`${$("#retention-gate").value}%`;const retention=retentionValue(),cell=$("#sequence-cell").value;const processed=Math.max(0,sequenceIndex+1);const memoryScore=processed?Math.round((retention**Math.max(0,processed-1))*100):0;$("#memory-score").textContent=`${memoryScore}%`;
    if(processed){const remembered=sequenceWords.slice(0,processed).map((word,i)=>({word,strength:retention**(processed-1-i)})).filter(item=>item.strength>.24);$("#memory-summary").innerHTML=`<span><strong>${cell.toUpperCase()} context:</strong> ${remembered.map(item=>item.word).join(" · ")||"Earlier context has faded"}</span>`;}else $("#memory-summary").innerHTML="<span>Waiting for the first token…</span>";
    const prepared=prepareCanvas($("#sequence-canvas"));if(!prepared)return;const{ctx,width,height}=prepared;const max=Math.max(1,sequenceWords.length),left=36,right=25,mid=height*.54,spacing=(width-left-right)/max;ctx.strokeStyle=css("--border-strong");ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(left,mid);ctx.lineTo(width-right,mid);ctx.stroke();
    sequenceWords.forEach((word,i)=>{const x=left+spacing*(i+.5),active=i<=sequenceIndex,strength=active?retention**(sequenceIndex-i):0;ctx.beginPath();ctx.roundRect(x-Math.min(22,spacing*.35),mid-23,Math.min(44,spacing*.7),46,8);ctx.fillStyle=active?`rgba(36,212,196,${.1+strength*.65})`:"rgba(120,154,177,.05)";ctx.fill();ctx.strokeStyle=active?`rgba(36,212,196,${.25+strength*.6})`:css("--border");ctx.stroke();ctx.fillStyle=active?css("--text"):css("--muted");ctx.font="8px DM Sans";ctx.textAlign="center";ctx.fillText(word.slice(0,8),x,mid+3);if(active){ctx.fillStyle=css("--violet");ctx.fillRect(x-Math.min(20,spacing*.3),mid+32,Math.min(40,spacing*.6)*strength,4);}});
    ctx.fillStyle=css("--muted");ctx.font="9px DM Sans";ctx.textAlign="left";ctx.fillText(`${cell.toUpperCase()} hidden state`,left,28);ctx.fillText("time →",width-right-32,height-13);
  }
  $("#sequence-step").addEventListener("click",()=>{if(!stepSequence())toast("Sequence complete")});$("#sequence-run").addEventListener("click",()=>{clearInterval(sequenceTimer);if(sequenceIndex>=sequenceWords.length-1)resetSequence();sequenceTimer=setInterval(()=>{if(!stepSequence()){clearInterval(sequenceTimer);toast("Sequence processed through time")}},310)});$("#sequence-reset").addEventListener("click",resetSequence);$("#sequence-input").addEventListener("change",resetSequence);$("#sequence-cell").addEventListener("change",drawSequence);$("#retention-gate").addEventListener("input",drawSequence);resetSequence();

  // Mastery quiz
  const quizQuestions=[
    {q:"Why keep a test set separate from training data?",a:["To make training run faster","To evaluate performance on unseen examples","To increase the number of epochs","To remove all noisy samples"],correct:1,e:"The test set estimates generalization because its examples were not used to update the model parameters."},
    {q:"A single-layer perceptron cannot solve XOR because…",a:["XOR has too few samples","its classes are not linearly separable","the bias must always be zero","XOR requires regression"],correct:1,e:"One perceptron produces one straight decision boundary; XOR needs multiple boundaries created through hidden units."},
    {q:"What is one epoch?",a:["One parameter update only","One forward pass through one sample","One complete pass through the training set","The final test evaluation"],correct:2,e:"An epoch is one full pass through all training examples, usually divided into batches."},
    {q:"Why can sigmoid cause vanishing gradients in deep networks?",a:["Its output is unbounded","Its derivative is often close to zero","It has no derivative","It always returns negative values"],correct:1,e:"Repeatedly multiplying small sigmoid derivatives through the chain rule can make early-layer gradients extremely small."},
    {q:"What does batch normalization primarily normalize during training?",a:["The labels","Layer activations within a batch","The number of layers","The test-set size"],correct:1,e:"Batch normalization stabilizes the distribution of layer inputs and learns a scale and shift."},
    {q:"Which optimizer combines momentum and adaptive squared-gradient scaling?",a:["Plain SGD","Adam","Early stopping","Dropout"],correct:1,e:"Adam tracks both a first moment (momentum-like) and second moment (RMSProp-like) of gradients."},
    {q:"What is the main purpose of padding in a CNN?",a:["Randomize the kernel","Control output size and preserve border information","Create class labels","Remove activation functions"],correct:1,e:"Padding adds values around the border so filters can process edge pixels and output dimensions can be controlled."},
    {q:"A 3×3 convolution receives a 7×7 input, valid padding, stride 2. What is its output width?",a:["2","3","4","5"],correct:1,e:"⌊(7 − 3) / 2⌋ + 1 = 3."},
    {q:"How does dropout help generalization?",a:["It permanently deletes training data","It randomly removes units during training, discouraging co-adaptation","It makes every gradient larger","It replaces the loss function"],correct:1,e:"Different thinned networks are sampled during training, which reduces reliance on particular feature combinations."},
    {q:"Why do LSTMs usually retain long-range context better than vanilla RNNs?",a:["They never use gradients","Their gated cell state provides a controlled memory path","They only accept one token","They have no trainable parameters"],correct:1,e:"Input, forget, and output gates regulate an explicit cell state, giving information and gradients a more stable path through time."}
  ];
  function renderQuiz(){const form=$("#quiz-form");form.innerHTML=quizQuestions.map((item,index)=>`<article class="question-card" data-question="${index}"><span class="question-number">Question ${String(index+1).padStart(2,"0")}</span><h3>${item.q}</h3>${item.a.map((answer,ai)=>`<label class="answer-option"><input type="radio" name="q${index}" value="${ai}"><span>${answer}</span></label>`).join("")}<p class="answer-explanation">${item.e}</p></article>`).join("");}
  function gradeQuiz(){let answered=0,score=0;quizQuestions.forEach((item,index)=>{const card=$(`[data-question="${index}"]`),selected=$(`input[name="q${index}"]:checked`);card.classList.remove("correct","incorrect","graded");if(selected){answered+=1;const correct=Number(selected.value)===item.correct;score+=Number(correct);card.classList.add(correct?"correct":"incorrect","graded");}});if(answered<quizQuestions.length){toast(`Answer ${quizQuestions.length-answered} more question${quizQuestions.length-answered===1?"":"s"}`);return;}const percent=Math.round(score/quizQuestions.length*100);$("#quiz-score").textContent=`${percent}%`;$("#quiz-score-ring").style.setProperty("--progress",`${percent*3.6}deg`);$("#quiz-message").textContent=percent>=80?"Excellent — you can connect the concepts across the learning pipeline.":percent>=60?"Good foundation. Review the explanations for the missed concepts.":"Use the labs to experiment with the concepts, then try again.";localStorage.setItem("neural-lab-quiz-score",String(percent));if(percent>=80){completed.add("quiz-lab");updateProgress();toast("Mastery achieved — 100 XP earned");}else toast(`Quiz complete: ${score}/${quizQuestions.length}`);}
  function resetQuiz(){renderQuiz();$("#quiz-score").textContent="—";$("#quiz-score-ring").style.setProperty("--progress","0deg");$("#quiz-message").textContent="Answer every question, then submit to reveal explanations.";}
  $("#submit-quiz").addEventListener("click",gradeQuiz);$("#reset-quiz").addEventListener("click",resetQuiz);renderQuiz();const savedScore=localStorage.getItem("neural-lab-quiz-score");if(savedScore!==null){$("#quiz-score").textContent=`${savedScore}%`;$("#quiz-score-ring").style.setProperty("--progress",`${Number(savedScore)*3.6}deg`);$("#quiz-message").textContent="Previous best score saved on this device.";}

  function redrawVisible(){const visible=$(".panel.active");redrawByPanel[visible?.id]?.();}
  let resizeTimer;window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(redrawVisible,120)});
  const initial=location.hash.slice(1);if(initial&&document.getElementById(initial))showPanel(initial,false);else showPanel("dashboard",false);
})();
