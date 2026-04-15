(() => {
  const STORAGE_KEY = "vc-reactor-slots-state-v2";
  const DAILY_GRANT_AMOUNT = 300;
  const MAX_LOG_ENTRIES = 14;
  const MAX_AUTOSPIN_CHAIN = 200;
  const BET_OPTIONS = [25, 50, 100, 250, 500];

  const MACHINES = [
    {
      id: "neon-nexus",
      name: "Neon Nexus",
      flavor: "Synthwave reels with balanced volatility.",
      pairMultiplier: 1.8,
      jackpotSymbol: "NOVA",
      symbols: ["ORB", "STAR", "NOVA", "GEM", "BOT", "RIFT", "SKULL"],
      weights: { ORB: 19, STAR: 17, NOVA: 8, GEM: 13, BOT: 14, RIFT: 10, SKULL: 19 },
      triple: { ORB: 4, STAR: 6, NOVA: 16, GEM: 9, BOT: 7, RIFT: 11, SKULL: 2 },
      palette: {
        bg1: "#07131f",
        bg2: "#0f2e37",
        bg3: "#36240d",
        accent: "#ffb347",
        accent2: "#2ad7be"
      }
    },
    {
      id: "solar-vault",
      name: "Solar Vault",
      flavor: "Warmer table, bigger peaks, deeper droughts.",
      pairMultiplier: 2,
      jackpotSymbol: "SUN",
      symbols: ["SUN", "CROWN", "COIN", "EMBER", "VOLT", "NANO", "DUST"],
      weights: { SUN: 7, CROWN: 9, COIN: 16, EMBER: 14, VOLT: 12, NANO: 15, DUST: 21 },
      triple: { SUN: 18, CROWN: 13, COIN: 6, EMBER: 8, VOLT: 10, NANO: 7, DUST: 2 },
      palette: {
        bg1: "#1b0f0b",
        bg2: "#3c2f11",
        bg3: "#12292a",
        accent: "#ffc458",
        accent2: "#52d2ff"
      }
    },
    {
      id: "arctic-circuit",
      name: "Arctic Circuit",
      flavor: "Cool visuals and steadier medium payouts.",
      pairMultiplier: 1.65,
      jackpotSymbol: "CORE",
      symbols: ["CORE", "ICE", "WAVE", "BYTE", "AURA", "SPARK", "GLITCH"],
      weights: { CORE: 9, ICE: 16, WAVE: 15, BYTE: 14, AURA: 13, SPARK: 13, GLITCH: 20 },
      triple: { CORE: 14, ICE: 8, WAVE: 7, BYTE: 6, AURA: 9, SPARK: 11, GLITCH: 2 },
      palette: {
        bg1: "#071927",
        bg2: "#123955",
        bg3: "#1d252d",
        accent: "#79e0ff",
        accent2: "#7affcb"
      }
    }
  ];

  const PAIR_LINES = [
    "Pair hit. Momentum rising.",
    "Clean pair. Multiplier warmed up.",
    "Pair payout landed.",
    "Two-of-a-kind. Nice lift."
  ];

  const TRIPLE_LINES = [
    "Triple connect. Big payout delivered.",
    "All reels aligned. Strong cash-in.",
    "Triple landed. Machine paid out heavy.",
    "Perfect line. Reward spike triggered."
  ];

  const LOSS_LINES = [
    "Missed line. Next spin can rebuild charge.",
    "No match this round.",
    "Drought spin. Perks held steady.",
    "Blank spin. Momentum reset."
  ];

  const els = {
    appShell: document.getElementById("appShell"),
    flashLayer: document.getElementById("flashLayer"),
    fxCanvas: document.getElementById("fxCanvas"),
    prevMachineBtn: document.getElementById("prevMachineBtn"),
    nextMachineBtn: document.getElementById("nextMachineBtn"),
    machineName: document.getElementById("machineName"),
    machineFlavor: document.getElementById("machineFlavor"),
    balance: document.getElementById("balanceValue"),
    betValue: document.getElementById("betValue"),
    spins: document.getElementById("spinValue"),
    sessionNet: document.getElementById("sessionNetValue"),
    biggestWin: document.getElementById("biggestWinValue"),
    multiplier: document.getElementById("multiplierValue"),
    winRate: document.getElementById("winRateValue"),
    tensionFill: document.getElementById("tensionFill"),
    reelShell: document.getElementById("reelShell"),
    reels: [0, 1, 2].map((idx) => document.getElementById(`reel${idx}`)),
    spinResult: document.getElementById("spinResult"),
    betChips: Array.from(document.querySelectorAll(".bet-chip")),
    spinBtn: document.getElementById("spinBtn"),
    autoBtn: document.getElementById("autoBtn"),
    stopAutoBtn: document.getElementById("stopAutoBtn"),
    autoState: document.getElementById("autoState"),
    dailyGrantBtn: document.getElementById("dailyGrantBtn"),
    dailyHint: document.getElementById("dailyHint"),
    comboValue: document.getElementById("comboValue"),
    tierValue: document.getElementById("tierValue"),
    chargeValue: document.getElementById("chargeValue"),
    perkFill: document.getElementById("perkFill"),
    perkCaption: document.getElementById("perkCaption"),
    payoutPair: document.getElementById("payoutPair"),
    payoutRows: document.getElementById("payoutRows"),
    gainLog: document.getElementById("gainLog"),
    journalLog: document.getElementById("journalLog")
  };

  const state = loadState();
  const particles = [];

  let spinning = false;
  let autospin = false;
  let autospinCounter = 0;
  let tensionTimer = null;
  let fxLoopHandle = 0;
  let ctx2d = null;
  let audioCtx = null;

  initialize();

  function initialize() {
    ctx2d = els.fxCanvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    bindEvents();
    applyMachineTheme(currentMachine());
    renderMachineHeader();
    renderPayoutRules();
    seedReels();
    addJournalLog("Machine online. Pick a bet and spin.", "info");
    render();
  }

  function bindEvents() {
    els.prevMachineBtn.addEventListener("click", () => shiftMachine(-1));
    els.nextMachineBtn.addEventListener("click", () => shiftMachine(1));
    els.spinBtn.addEventListener("click", () => {
      void spinOnce();
    });
    els.autoBtn.addEventListener("click", startAutospin);
    els.stopAutoBtn.addEventListener("click", () => stopAutospin("Autospin stopped."));
    els.dailyGrantBtn.addEventListener("click", claimDailyGrant);

    els.betChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const bet = Number(chip.dataset.bet);
        if (Number.isFinite(bet)) {
          setBet(bet);
        }
      });
    });
  }

  function loadState() {
    const fallback = {
      vc: 1000,
      currentBet: 100,
      spins: 0,
      wins: 0,
      losses: 0,
      sessionNet: 0,
      biggestWin: 0,
      machineIndex: 0,
      comboStreak: 0,
      perkTier: 0,
      perkCharge: 0,
      dryStreak: 0,
      dailyClaimDate: ""
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      const safeMachine = clampInt(parsed.machineIndex, fallback.machineIndex, 0, MACHINES.length - 1);
      const safeBet = BET_OPTIONS.includes(Number(parsed.currentBet))
        ? Number(parsed.currentBet)
        : fallback.currentBet;

      return {
        vc: clampInt(parsed.vc, fallback.vc, 0, 999999999),
        currentBet: safeBet,
        spins: clampInt(parsed.spins, fallback.spins, 0, 999999999),
        wins: clampInt(parsed.wins, fallback.wins, 0, 999999999),
        losses: clampInt(parsed.losses, fallback.losses, 0, 999999999),
        sessionNet: clampInt(parsed.sessionNet, fallback.sessionNet, -999999999, 999999999),
        biggestWin: clampInt(parsed.biggestWin, fallback.biggestWin, 0, 999999999),
        machineIndex: safeMachine,
        comboStreak: clampInt(parsed.comboStreak, fallback.comboStreak, 0, 999999999),
        perkTier: clampInt(parsed.perkTier, fallback.perkTier, 0, 50),
        perkCharge: clampInt(parsed.perkCharge, fallback.perkCharge, 0, 99),
        dryStreak: clampInt(parsed.dryStreak, fallback.dryStreak, 0, 999999999),
        dailyClaimDate: typeof parsed.dailyClaimDate === "string" ? parsed.dailyClaimDate : ""
      };
    } catch (error) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clampInt(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    const rounded = Math.round(n);
    return Math.max(min, Math.min(max, rounded));
  }

  function currentMachine() {
    return MACHINES[state.machineIndex];
  }

  function shiftMachine(delta) {
    if (spinning || autospin) {
      return;
    }
    const total = MACHINES.length;
    state.machineIndex = (state.machineIndex + delta + total) % total;
    applyMachineTheme(currentMachine());
    renderMachineHeader();
    renderPayoutRules();
    seedReels();
    saveState();
    addJournalLog(`Switched to ${currentMachine().name}.`, "info");
    render();
  }

  function applyMachineTheme(machine) {
    const root = document.documentElement;
    root.style.setProperty("--bg-1", machine.palette.bg1);
    root.style.setProperty("--bg-2", machine.palette.bg2);
    root.style.setProperty("--bg-3", machine.palette.bg3);
    root.style.setProperty("--accent", machine.palette.accent);
    root.style.setProperty("--accent-2", machine.palette.accent2);
  }

  function renderMachineHeader() {
    const machine = currentMachine();
    els.machineName.textContent = machine.name;
    els.machineFlavor.textContent = machine.flavor;
  }

  function renderPayoutRules() {
    const machine = currentMachine();
    els.payoutPair.textContent = `Any pair pays ${machine.pairMultiplier.toFixed(2)}x bet (before multiplier).`;

    const rows = Object.entries(machine.triple)
      .sort((a, b) => b[1] - a[1])
      .map(([symbol, payout]) => `<tr><td>${symbol}</td><td>${payout.toFixed(2)}x</td></tr>`)
      .join("");
    els.payoutRows.innerHTML = rows;
  }

  function seedReels() {
    const machine = currentMachine();
    els.reels.forEach((reel, idx) => {
      reel.textContent = machine.symbols[idx % machine.symbols.length];
      reel.classList.remove("spinning", "win-pop");
    });
    els.spinResult.textContent = "Choose a bet and launch a spin.";
  }

  function setBet(amount) {
    if (spinning || autospin || !BET_OPTIONS.includes(amount)) {
      return;
    }
    state.currentBet = amount;
    saveState();
    render();
  }

  function currentMultiplier() {
    const tierBoost = state.perkTier * 0.18;
    const streakBoost = Math.min(0.45, state.comboStreak * 0.05);
    return Number((1 + tierBoost + streakBoost).toFixed(2));
  }

  function startAutospin() {
    if (autospin || spinning) {
      return;
    }
    if (state.vc < state.currentBet) {
      addJournalLog("Autospin blocked: balance below bet.", "loss");
      return;
    }

    autospin = true;
    autospinCounter = 0;
    els.autoState.textContent = "Autospin running...";
    els.autoState.classList.add("running");
    render();
    runAutospinLoop();
  }

  async function runAutospinLoop() {
    while (autospin) {
      if (autospinCounter >= MAX_AUTOSPIN_CHAIN) {
        stopAutospin("Autospin paused after 200 spins.");
        break;
      }
      if (state.vc < state.currentBet) {
        stopAutospin("Autospin stopped: insufficient VC.");
        break;
      }
      autospinCounter += 1;
      await spinOnce();
      await sleep(130);
    }
  }

  function stopAutospin(reason) {
    if (!autospin) {
      return;
    }
    autospin = false;
    els.autoState.textContent = reason;
    els.autoState.classList.remove("running");
    addJournalLog(reason, "info");
    render();
  }

  async function spinOnce() {
    if (spinning) {
      return;
    }

    if (state.vc < state.currentBet) {
      addJournalLog("Not enough VC for the selected bet.", "loss");
      tone("loss");
      render();
      return;
    }

    spinning = true;
    render();

    const machine = currentMachine();
    const bet = state.currentBet;
    state.vc -= bet;
    state.sessionNet -= bet;
    state.spins += 1;

    startSpinEffects();
    tone("spin");

    const finalSymbols = [
      pickSymbol(machine),
      pickSymbol(machine),
      pickSymbol(machine)
    ];

    await animateReels(finalSymbols, machine.symbols);
    const outcome = evaluateOutcome(finalSymbols, bet, machine);
    settleOutcome(outcome, bet, finalSymbols, machine);

    stopSpinEffects();

    saveState();
    spinning = false;
    render();
  }

  function evaluateOutcome(symbols, bet, machine) {
    const counts = symbols.reduce((acc, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + 1;
      return acc;
    }, {});

    let bestSymbol = "";
    let bestCount = 0;
    for (const [symbol, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestSymbol = symbol;
      }
    }

    const multiplier = currentMultiplier();

    if (bestCount === 3) {
      const base = machine.triple[bestSymbol] || 4;
      return {
        kind: bestSymbol === machine.jackpotSymbol ? "jackpot" : "triple",
        symbol: bestSymbol,
        payout: Math.round(bet * base * multiplier),
        multiplier
      };
    }

    if (bestCount === 2) {
      return {
        kind: "pair",
        symbol: bestSymbol,
        payout: Math.round(bet * machine.pairMultiplier * multiplier),
        multiplier
      };
    }

    return {
      kind: "loss",
      symbol: "",
      payout: 0,
      multiplier
    };
  }

  function settleOutcome(outcome, bet, finalSymbols, machine) {
    if (outcome.kind === "loss") {
      state.losses += 1;
      state.comboStreak = 0;
      state.dryStreak += 1;
      state.perkCharge = Math.max(0, state.perkCharge - 18);
      if (state.dryStreak % 3 === 0 && state.perkTier > 0) {
        state.perkTier -= 1;
      }

      const line = randomFrom(LOSS_LINES);
      els.spinResult.textContent = `${line} (${finalSymbols.join(" · ")})`;
      addJournalLog(`-${bet.toLocaleString()} VC | ${finalSymbols.join(" / ")}`, "loss");
      tone("loss");
      shakeCamera(220);
      return;
    }

    state.wins += 1;
    state.dryStreak = 0;
    state.comboStreak += 1;
    state.vc += outcome.payout;
    state.sessionNet += outcome.payout;

    const chargeGain = outcome.kind === "jackpot" ? 46 : outcome.kind === "triple" ? 30 : 18;
    state.perkCharge += chargeGain;
    while (state.perkCharge >= 100) {
      state.perkCharge -= 100;
      state.perkTier = Math.min(50, state.perkTier + 1);
    }

    const wasBiggest = outcome.payout > state.biggestWin;
    if (wasBiggest) {
      state.biggestWin = outcome.payout;
    }

    els.reels.forEach((reel) => {
      reel.classList.remove("win-pop");
      void reel.offsetWidth;
      reel.classList.add("win-pop");
    });

    let message = "";
    if (outcome.kind === "pair") {
      message = `${randomFrom(PAIR_LINES)} +${outcome.payout.toLocaleString()} VC`;
    } else if (outcome.kind === "triple") {
      message = `${randomFrom(TRIPLE_LINES)} +${outcome.payout.toLocaleString()} VC`;
    } else {
      message = `JACKPOT ${outcome.symbol}! +${outcome.payout.toLocaleString()} VC`;
    }

    els.spinResult.textContent = `${message} (${finalSymbols.join(" · ")})`;
    addGainLog(`+${outcome.payout.toLocaleString()} VC on ${finalSymbols.join(" / ")}`, "win");
    addJournalLog(`Win +${outcome.payout.toLocaleString()} VC | x${outcome.multiplier.toFixed(2)} total`, "win");

    showMultiplierPopup(`x${outcome.multiplier.toFixed(2)}`);

    if (outcome.kind === "jackpot") {
      burstFireworks();
      tone("jackpot");
      flashScreen(360);
      shakeCamera(330);
    } else {
      burstConfetti(outcome.kind === "triple" ? 90 : 60);
      tone("win");
      flashScreen(220);
      shakeCamera(240);
    }

    if (wasBiggest) {
      addJournalLog(`New biggest win: +${state.biggestWin.toLocaleString()} VC`, "info");
      burstFireworks();
    }
  }

  function pickSymbol(machine) {
    const weights = { ...machine.weights };
    const boostedSymbols = machine.symbols.filter((symbol) => machine.triple[symbol] >= 9);
    const bonus = Math.min(9, state.perkTier * 1.25 + state.comboStreak * 0.55);
    boostedSymbols.forEach((symbol) => {
      weights[symbol] += bonus;
    });

    const total = machine.symbols.reduce((sum, symbol) => sum + weights[symbol], 0);
    let mark = randomFloat() * total;

    for (const symbol of machine.symbols) {
      mark -= weights[symbol];
      if (mark <= 0) {
        return symbol;
      }
    }
    return machine.symbols[machine.symbols.length - 1];
  }

  function randomFloat() {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] / 4294967296;
    }
    return Math.random();
  }

  function randomFrom(list) {
    return list[Math.floor(randomFloat() * list.length)];
  }

  async function animateReels(finalSymbols, symbolPool) {
    const stopTimes = [950, 1270, 1620];

    const jobs = els.reels.map((reel, idx) =>
      new Promise((resolve) => {
        reel.classList.add("spinning");
        const timer = setInterval(() => {
          reel.textContent = randomFrom(symbolPool);
        }, 65);

        setTimeout(() => {
          clearInterval(timer);
          reel.classList.remove("spinning");
          reel.textContent = finalSymbols[idx];
          resolve();
        }, stopTimes[idx]);
      })
    );

    await Promise.all(jobs);
  }

  function startSpinEffects() {
    els.reelShell.classList.add("spinning");
    flashScreen(140);
    shakeCamera(180);
    beginTension(1800);
  }

  function stopSpinEffects() {
    els.reelShell.classList.remove("spinning");
    endTension();
  }

  function beginTension(durationMs) {
    endTension();

    const startedAt = performance.now();
    tensionTimer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      setTension(progress);
      if (progress >= 1) {
        endTension();
      }
    }, 45);
  }

  function setTension(value) {
    const clamped = Math.max(0, Math.min(1, value));
    els.tensionFill.style.transform = `scaleX(${clamped})`;
  }

  function endTension() {
    if (tensionTimer) {
      clearInterval(tensionTimer);
      tensionTimer = null;
    }
    setTension(0);
  }

  function flashScreen(durationMs) {
    els.flashLayer.classList.remove("active");
    void els.flashLayer.offsetWidth;
    els.flashLayer.classList.add("active");
    setTimeout(() => {
      els.flashLayer.classList.remove("active");
    }, durationMs);
  }

  function shakeCamera(durationMs) {
    els.appShell.classList.remove("camera-shake");
    void els.appShell.offsetWidth;
    els.appShell.classList.add("camera-shake");
    setTimeout(() => {
      els.appShell.classList.remove("camera-shake");
    }, durationMs);
  }

  function claimDailyGrant() {
    if (!canClaimDaily()) {
      addJournalLog("Daily grant already claimed today.", "info");
      return;
    }

    state.vc += DAILY_GRANT_AMOUNT;
    state.sessionNet += DAILY_GRANT_AMOUNT;
    state.dailyClaimDate = localDateKey();
    saveState();

    addGainLog(`+${DAILY_GRANT_AMOUNT.toLocaleString()} VC daily grant`, "info");
    addJournalLog(`Claimed daily +${DAILY_GRANT_AMOUNT.toLocaleString()} VC.`, "info");
    flashScreen(200);
    burstConfetti(65);
    tone("info");
    render();
  }

  function canClaimDaily() {
    return state.dailyClaimDate !== localDateKey();
  }

  function localDateKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function tone(kind) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;

    if (kind === "spin") {
      blip(now, 280, 340, 0.09, "triangle", 0.04);
      blip(now + 0.1, 340, 430, 0.1, "triangle", 0.04);
      blip(now + 0.2, 420, 540, 0.12, "triangle", 0.04);
      return;
    }

    if (kind === "win") {
      blip(now, 380, 620, 0.18, "triangle", 0.07);
      blip(now + 0.12, 520, 740, 0.2, "triangle", 0.07);
      return;
    }

    if (kind === "jackpot") {
      blip(now, 360, 700, 0.22, "square", 0.08);
      blip(now + 0.12, 510, 980, 0.24, "square", 0.08);
      blip(now + 0.24, 740, 1240, 0.25, "square", 0.08);
      return;
    }

    if (kind === "loss") {
      blip(now, 240, 170, 0.18, "sawtooth", 0.06);
      return;
    }

    if (kind === "info") {
      blip(now, 300, 450, 0.16, "triangle", 0.05);
    }
  }

  function blip(startAt, freqFrom, freqTo, duration, type, gainPeak) {
    if (!audioCtx) {
      return;
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;

    osc.frequency.setValueAtTime(freqFrom, startAt);
    osc.frequency.linearRampToValueAtTime(freqTo, startAt + duration);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.03);
  }

  function showMultiplierPopup(text) {
    const pop = document.createElement("div");
    pop.className = "floating-note";
    pop.textContent = text;
    els.reelShell.appendChild(pop);

    requestAnimationFrame(() => {
      pop.style.opacity = "1";
      pop.style.transform = "translate(-50%, -68px) scale(1)";
    });

    setTimeout(() => {
      pop.style.opacity = "0";
      pop.style.transform = "translate(-50%, -90px) scale(1.08)";
    }, 520);

    setTimeout(() => {
      pop.remove();
    }, 900);
  }

  function burstConfetti(count) {
    const rect = els.reelShell.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + 16;
    spawnParticles(x, y, count, ["#89ffd9", "#ffe072", "#ff9b72", "#9fd7ff"], 1.3);
  }

  function burstFireworks() {
    const width = els.fxCanvas.width / window.devicePixelRatio;
    const height = els.fxCanvas.height / window.devicePixelRatio;
    const bursts = 4;
    for (let i = 0; i < bursts; i += 1) {
      const x = width * (0.2 + randomFloat() * 0.6);
      const y = height * (0.16 + randomFloat() * 0.33);
      spawnParticles(x, y, 80, ["#fff0a1", "#ffc578", "#9affd7", "#ff9ba3"], 1.65);
    }
  }

  function spawnParticles(x, y, count, colorSet, speedScale) {
    for (let i = 0; i < count; i += 1) {
      const angle = randomFloat() * Math.PI * 2;
      const speed = (1.2 + randomFloat() * 4.6) * speedScale;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 22 + randomFloat() * 32,
        maxLife: 22 + randomFloat() * 32,
        size: 2 + randomFloat() * 4,
        color: colorSet[Math.floor(randomFloat() * colorSet.length)]
      });
    }

    if (!fxLoopHandle) {
      fxLoopHandle = requestAnimationFrame(renderParticles);
    }
  }

  function renderParticles() {
    fxLoopHandle = 0;
    if (!ctx2d) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = els.fxCanvas.width / dpr;
    const height = els.fxCanvas.height / dpr;

    ctx2d.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.06;
      particle.vx *= 0.992;
      particle.life -= 1;

      if (particle.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx2d.globalAlpha = alpha;
      ctx2d.fillStyle = particle.color;
      ctx2d.fillRect(particle.x, particle.y, particle.size, particle.size);
    }

    ctx2d.globalAlpha = 1;

    if (particles.length > 0) {
      fxLoopHandle = requestAnimationFrame(renderParticles);
    }
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    els.fxCanvas.width = Math.floor(width * dpr);
    els.fxCanvas.height = Math.floor(height * dpr);
    if (ctx2d) {
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function addGainLog(text, kind) {
    addToList(els.gainLog, text, kind);
  }

  function addJournalLog(text, kind) {
    addToList(els.journalLog, text, kind);
  }

  function addToList(target, text, kind) {
    const li = document.createElement("li");
    li.className = kind;
    const stamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    li.textContent = `[${stamp}] ${text}`;
    target.prepend(li);

    while (target.children.length > MAX_LOG_ENTRIES) {
      target.removeChild(target.lastChild);
    }
  }

  function render() {
    const net = state.sessionNet;
    const totalSpins = state.spins;
    const winRate = totalSpins > 0 ? Math.round((state.wins / totalSpins) * 100) : 0;

    els.balance.textContent = formatVC(state.vc);
    els.betValue.textContent = formatVC(state.currentBet);
    els.spins.textContent = String(state.spins);
    els.sessionNet.textContent = `${net >= 0 ? "+" : ""}${formatVC(net)}`;
    els.biggestWin.textContent = formatVC(state.biggestWin);
    els.multiplier.textContent = `x${currentMultiplier().toFixed(2)}`;
    els.winRate.textContent = `${winRate}%`;

    els.sessionNet.style.color = net >= 0 ? "var(--good)" : "var(--bad)";
    els.balance.style.color = state.vc < state.currentBet ? "var(--bad)" : "var(--ink)";

    els.comboValue.textContent = String(state.comboStreak);
    els.tierValue.textContent = String(state.perkTier);
    els.chargeValue.textContent = `${state.perkCharge}%`;
    els.perkFill.style.transform = `scaleX(${state.perkCharge / 100})`;

    if (state.comboStreak >= 4) {
      els.perkCaption.textContent = "Hot streak active. Multiplier boosted.";
    } else if (state.perkTier >= 1) {
      els.perkCaption.textContent = "Tier bonus active. Keep charging perks.";
    } else {
      els.perkCaption.textContent = "Win spins to charge perks and lift multiplier.";
    }

    const canClaim = canClaimDaily();
    els.dailyGrantBtn.disabled = !canClaim || spinning || autospin;
    els.dailyHint.textContent = canClaim
      ? "Available now."
      : "Claimed today. Next reset at local midnight.";

    els.betChips.forEach((chip) => {
      const chipBet = Number(chip.dataset.bet);
      chip.classList.toggle("is-active", chipBet === state.currentBet);
      chip.disabled = spinning || autospin;
    });

    const balanceTooLow = state.vc < state.currentBet;
    els.spinBtn.disabled = spinning || autospin || balanceTooLow;
    els.autoBtn.disabled = spinning || autospin || balanceTooLow;
    els.stopAutoBtn.disabled = !autospin;
    els.prevMachineBtn.disabled = spinning || autospin;
    els.nextMachineBtn.disabled = spinning || autospin;

    els.autoBtn.classList.toggle("running", autospin);
    if (!autospin && els.autoState.classList.contains("running")) {
      els.autoState.classList.remove("running");
      if (els.autoState.textContent === "Autospin running...") {
        els.autoState.textContent = "Autospin idle.";
      }
    }
  }

  function formatVC(value) {
    return `${Number(value).toLocaleString("en-US")} VC`;
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
})();
