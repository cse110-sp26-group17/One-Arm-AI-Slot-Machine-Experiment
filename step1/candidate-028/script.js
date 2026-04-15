(() => {
  const STORAGE_KEY = "token-burner-3000-state-v1";
  const MIN_BET = 5;
  const SYMBOLS = ["GPT", "TOKEN", "GPU", "BUG", "HYPE", "FLOP", "404"];
  const BASE_WEIGHTS = {
    GPT: 16,
    TOKEN: 14,
    GPU: 12,
    BUG: 14,
    HYPE: 16,
    FLOP: 14,
    "404": 14
  };
  const WIN_MULTIPLIER = {
    GPT: 9,
    TOKEN: 12,
    GPU: 7,
    BUG: 6,
    HYPE: 6,
    FLOP: 4
  };

  const LOSS_LINES = [
    "Your model spent the bet on motivational tweets about AGI.",
    "Training run failed. Apparently cats are not financial advisors.",
    "Cloud bill approved. Profitability was not invited to the meeting.",
    "The model found a new loss function: your wallet.",
    "The AI pivoted to vibes. Tokens were sacrificed."
  ];
  const PAIR_LINES = [
    "Two symbols matched. Investors call this traction.",
    "Near miss upgraded to a press release.",
    "The demo survived. Barely.",
    "Model confidence is high. Accuracy is still a rumor."
  ];
  const JACKPOT_LINES = [
    "All three aligned. Pretend this was reproducible.",
    "Breakthrough discovered. Please ignore previous benchmarks.",
    "Triple match. The board wants a keynote.",
    "Your AI became profitable for a full 2 seconds."
  ];

  const els = {
    token: document.getElementById("tokenValue"),
    spins: document.getElementById("spinValue"),
    booster: document.getElementById("boosterValue"),
    guardrail: document.getElementById("guardrailValue"),
    luck: document.getElementById("luckValue"),
    reels: [0, 1, 2].map((n) => document.getElementById(`reel${n}`)),
    betInput: document.getElementById("betInput"),
    spinBtn: document.getElementById("spinBtn"),
    buyPrompt: document.getElementById("buyPrompt"),
    buyLuck: document.getElementById("buyLuck"),
    buyGuardrail: document.getElementById("buyGuardrail"),
    rebootBtn: document.getElementById("rebootBtn"),
    logList: document.getElementById("logList")
  };

  let state = loadState();
  let spinning = false;

  bindEvents();
  render();
  addLog("Welcome to Token Burner 3000. Finance has left the chat.", "info");

  function bindEvents() {
    els.spinBtn.addEventListener("click", onSpin);
    els.buyPrompt.addEventListener("click", () => purchase("prompt"));
    els.buyLuck.addEventListener("click", () => purchase("luck"));
    els.buyGuardrail.addEventListener("click", () => purchase("guardrail"));
    els.rebootBtn.addEventListener("click", bankruptcyRecovery);
    els.betInput.addEventListener("change", clampBetInput);
  }

  function loadState() {
    const fallback = {
      tokens: 120,
      spins: 0,
      boosters: 0,
      guardrails: 0,
      luckSpins: 0,
      wins: 0,
      losses: 0
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return {
        tokens: saneInt(parsed.tokens, fallback.tokens),
        spins: saneInt(parsed.spins, fallback.spins),
        boosters: saneInt(parsed.boosters, fallback.boosters),
        guardrails: saneInt(parsed.guardrails, fallback.guardrails),
        luckSpins: saneInt(parsed.luckSpins, fallback.luckSpins),
        wins: saneInt(parsed.wins, fallback.wins),
        losses: saneInt(parsed.losses, fallback.losses)
      };
    } catch (err) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function saneInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      return fallback;
    }
    return Math.floor(n);
  }

  function randomFloat() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }

  function randomChoice(list) {
    const idx = Math.floor(randomFloat() * list.length);
    return list[idx];
  }

  function weightedSymbol() {
    const weights = { ...BASE_WEIGHTS };
    if (state.luckSpins > 0) {
      weights.TOKEN += 6;
      weights.GPT += 4;
      weights["404"] = Math.max(2, weights["404"] - 5);
      weights.FLOP = Math.max(3, weights.FLOP - 3);
    }
    const total = SYMBOLS.reduce((sum, sym) => sum + weights[sym], 0);
    let mark = randomFloat() * total;
    for (const sym of SYMBOLS) {
      mark -= weights[sym];
      if (mark <= 0) {
        return sym;
      }
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  function clampBetInput() {
    const raw = Number(els.betInput.value);
    if (!Number.isFinite(raw) || raw < MIN_BET) {
      els.betInput.value = String(MIN_BET);
      return;
    }
    const stepped = Math.floor(raw / MIN_BET) * MIN_BET;
    els.betInput.value = String(Math.max(MIN_BET, stepped));
  }

  async function onSpin() {
    if (spinning) {
      return;
    }
    clampBetInput();
    const bet = Number(els.betInput.value);
    if (bet > state.tokens) {
      addLog("Insufficient tokens. Try cheaper optimism.", "loss");
      tone("loss");
      return;
    }
    if (bet < MIN_BET) {
      addLog(`Minimum bet is ${MIN_BET} tokens.`, "info");
      return;
    }

    spinning = true;
    toggleInputs(true);

    state.tokens -= bet;
    state.spins += 1;
    render();

    const finalSymbols = [weightedSymbol(), weightedSymbol(), weightedSymbol()];
    await animateReels(finalSymbols);
    settleSpin(finalSymbols, bet);

    if (state.luckSpins > 0) {
      state.luckSpins -= 1;
    }

    saveState();
    render();
    spinning = false;
    toggleInputs(false);
  }

  async function animateReels(finalSymbols) {
    const jobs = els.reels.map((reel, i) =>
      new Promise((resolve) => {
        reel.classList.add("spinning");
        const timer = setInterval(() => {
          reel.textContent = randomChoice(SYMBOLS);
        }, 75);
        setTimeout(() => {
          clearInterval(timer);
          reel.classList.remove("spinning");
          reel.classList.add("settled");
          reel.textContent = finalSymbols[i];
          setTimeout(() => reel.classList.remove("settled"), 180);
          resolve();
        }, 900 + i * 220);
      })
    );
    await Promise.all(jobs);
  }

  function settleSpin(symbols, bet) {
    const counts = symbols.reduce((acc, sym) => {
      acc[sym] = (acc[sym] || 0) + 1;
      return acc;
    }, {});
    const repeat = Object.values(counts).sort((a, b) => b - a)[0];
    const topSymbol = Object.keys(counts).find((sym) => counts[sym] === repeat);
    let payout = 0;
    let toneType = "loss";
    let logType = "loss";
    let message = "";

    if (repeat === 3) {
      if (topSymbol === "404") {
        const outageTax = Math.round(bet * 0.5);
        state.tokens = Math.max(0, state.tokens - outageTax);
        state.losses += 1;
        message = `Triple 404. Service outage tax: -${outageTax} tokens.`;
      } else {
        payout = Math.round(bet * WIN_MULTIPLIER[topSymbol]);
        const boosted = applyPromptBooster(payout);
        payout = boosted.amount;
        state.tokens += payout;
        state.wins += 1;
        toneType = "win";
        logType = "win";
        message = `${randomChoice(JACKPOT_LINES)} +${payout} tokens on ${topSymbol}${boosted.note}`;
      }
    } else if (repeat === 2) {
      payout = Math.round(bet * 2);
      const boosted = applyPromptBooster(payout);
      payout = boosted.amount;
      state.tokens += payout;
      state.wins += 1;
      toneType = "win";
      logType = "win";
      message = `${randomChoice(PAIR_LINES)} +${payout} tokens${boosted.note}`;
    } else {
      state.losses += 1;
      message = randomChoice(LOSS_LINES);
      if (state.guardrails > 0) {
        const refund = Math.round(bet * 0.5);
        state.guardrails -= 1;
        state.tokens += refund;
        message += ` Guardrail triggered: +${refund} token refund.`;
        logType = "info";
      }
    }

    if (!message) {
      message = "No payout. Spin again if your risk tolerance agrees.";
    }
    addLog(message, logType);
    tone(toneType);
    pulseTokens();
  }

  function applyPromptBooster(amount) {
    if (state.boosters <= 0) {
      return { amount, note: "" };
    }
    state.boosters -= 1;
    const boosted = Math.round(amount * 1.5);
    return { amount: boosted, note: " (Prompt Pack boosted payout)" };
  }

  function purchase(kind) {
    if (spinning) {
      return;
    }

    if (kind === "prompt") {
      if (!spendTokens(20)) {
        return;
      }
      state.boosters += 1;
      addLog("Prompt Pack installed. Next win gets 50% extra hype.", "info");
      tone("info");
    } else if (kind === "luck") {
      if (!spendTokens(30)) {
        return;
      }
      state.luckSpins += 3;
      addLog("Cloud Burst purchased. Odds tweaked for 3 spins.", "info");
      tone("info");
    } else if (kind === "guardrail") {
      if (!spendTokens(15)) {
        return;
      }
      state.guardrails += 1;
      addLog("Guardrail Patch active. Next loss gets partial refund.", "info");
      tone("info");
    }

    saveState();
    render();
  }

  function spendTokens(cost) {
    if (state.tokens < cost) {
      addLog(`Need ${cost} tokens, but finance said no.`, "loss");
      tone("loss");
      return false;
    }
    state.tokens -= cost;
    return true;
  }

  function bankruptcyRecovery() {
    if (spinning) {
      return;
    }
    state.tokens += 80;
    addLog("Emergency funding round closed. +80 tokens.", "info");
    saveState();
    render();
    tone("info");
  }

  function tone(kind) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = kind === "loss" ? "sawtooth" : "triangle";
    oscillator.frequency.value = kind === "loss" ? 180 : 480;
    gain.gain.value = 0.00001;

    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.18);
    if (kind === "win") {
      oscillator.frequency.setValueAtTime(420, now);
      oscillator.frequency.linearRampToValueAtTime(760, now + 0.18);
    } else if (kind === "info") {
      oscillator.frequency.setValueAtTime(320, now);
      oscillator.frequency.linearRampToValueAtTime(520, now + 0.18);
    }
    oscillator.start(now);
    oscillator.stop(now + 0.2);
    oscillator.onended = () => {
      ctx.close().catch(() => {});
    };

    if (navigator.vibrate) {
      if (kind === "win") {
        navigator.vibrate([25, 20, 25]);
      } else if (kind === "loss") {
        navigator.vibrate([50]);
      }
    }
  }

  function addLog(text, kind) {
    const li = document.createElement("li");
    li.className = kind;
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.textContent = `[${stamp}] ${text}`;
    els.logList.prepend(li);
    while (els.logList.children.length > 12) {
      els.logList.removeChild(els.logList.lastChild);
    }
  }

  function pulseTokens() {
    els.token.classList.remove("pulse");
    void els.token.offsetWidth;
    els.token.classList.add("pulse");
  }

  function toggleInputs(disabled) {
    els.spinBtn.disabled = disabled;
    els.buyPrompt.disabled = disabled;
    els.buyLuck.disabled = disabled;
    els.buyGuardrail.disabled = disabled;
    els.betInput.disabled = disabled;
  }

  function render() {
    els.token.textContent = String(state.tokens);
    els.spins.textContent = String(state.spins);
    els.booster.textContent = String(state.boosters);
    els.guardrail.textContent = String(state.guardrails);
    els.luck.textContent = String(state.luckSpins);

    const canAffordAny = state.tokens >= MIN_BET;
    els.rebootBtn.classList.toggle("hidden", canAffordAny);

    els.token.style.color = state.tokens < 25 ? "var(--warn)" : "var(--ink)";
  }
})();
