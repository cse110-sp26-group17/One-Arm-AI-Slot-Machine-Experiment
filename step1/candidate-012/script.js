const icons = ["🤖", "🪙", "🔥", "🧠", "📉", "🧾", "💸", "🚀"];
const weights = [18, 20, 10, 12, 10, 12, 8, 10];

const spinCost = 12;
const startingTokens = 120;
const tokenStorageKey = "llm-lootbox-tokens";

const reels = [
  document.getElementById("reel0"),
  document.getElementById("reel1"),
  document.getElementById("reel2")
];
const tokenBalance = document.getElementById("tokenBalance");
const lastPayout = document.getElementById("lastPayout");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spinBtn");
const cashOutBtn = document.getElementById("cashOutBtn");
const resetBtn = document.getElementById("resetBtn");

let tokens = startingTokens;
let isSpinning = false;
let streak = 0;

function saveTokens() {
  localStorage.setItem(tokenStorageKey, String(tokens));
}

function loadTokens() {
  const raw = localStorage.getItem(tokenStorageKey);
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) {
    tokens = Math.floor(parsed);
  }
}

function weightedPick() {
  const total = weights.reduce((sum, n) => sum + n, 0);
  let r = Math.random() * total;
  for (let i = 0; i < icons.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return icons[i];
  }
  return icons[0];
}

function setMessage(text) {
  messageEl.textContent = text;
}

function updateUi(payout = 0) {
  tokenBalance.textContent = tokens;
  lastPayout.textContent = payout;
  spinBtn.disabled = isSpinning || tokens < spinCost;
  cashOutBtn.disabled = isSpinning || tokens < 20;
  saveTokens();
}

function evaluateSpin(result) {
  const [a, b, c] = result;
  const allMatch = a === b && b === c;
  const pairMatch = a === b || b === c || a === c;

  if (allMatch) {
    streak += 1;
    if (a === "🚀") return 120;
    if (a === "🤖") return 70;
    if (a === "🪙") return 55;
    return 45;
  }

  if (pairMatch) {
    streak = 0;
    return 16;
  }

  streak = 0;
  return 0;
}

function spinAnimation(reel, durationMs) {
  return new Promise((resolve) => {
    reel.classList.add("spinning");
    const interval = setInterval(() => {
      reel.textContent = icons[Math.floor(Math.random() * icons.length)];
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      reel.classList.remove("spinning");
      resolve();
    }, durationMs);
  });
}

async function spin() {
  if (isSpinning || tokens < spinCost) return;
  isSpinning = true;
  reels.forEach((reel) => reel.classList.remove("win"));
  tokens -= spinCost;
  updateUi(0);
  setMessage("Deploying model to production. Monitoring token burn...");

  const spinPromises = reels.map((reel, i) => spinAnimation(reel, 850 + i * 240));
  const finalIcons = reels.map(() => weightedPick());

  await Promise.all(spinPromises);

  reels.forEach((reel, i) => {
    reel.textContent = finalIcons[i];
  });

  const payout = evaluateSpin(finalIcons);
  tokens += payout;
  updateUi(payout);

  if (payout >= 45) {
    reels.forEach((reel) => reel.classList.add("win"));
    setMessage(
      `Jackpot hallucination! You won ${payout} tokens. Investors call this "product-market fit".`
    );
  } else if (payout > 0) {
    setMessage(
      `Minor success: +${payout} tokens. Enough for 4 vague API calls and one existential crisis.`
    );
  } else if (tokens < spinCost) {
    setMessage(
      "Out of tokens. The model now responds with: 'Please upgrade to Enterprise Infinite Plus.'"
    );
  } else {
    setMessage("No match. Your prompt was 'be revolutionary' and the output was a bulleted list.");
  }

  if (streak >= 2) {
    setMessage("Back-to-back jackpots. The board says you're now an 'AI thought leader.'");
  }

  isSpinning = false;
  updateUi(payout);
}

function cashOut() {
  if (isSpinning || tokens < 20) return;
  const spend = Math.min(40, Math.floor(tokens * 0.4));
  tokens -= spend;
  updateUi(0);
  const buzzwords = [
    "agentic",
    "multimodal",
    "reasoning",
    "autonomous",
    "synthetic",
    "scalable"
  ];
  const pick = buzzwords[Math.floor(Math.random() * buzzwords.length)];
  setMessage(
    `You spent ${spend} tokens on premium ${pick} mode. It improved confidence by 300% and accuracy by vibes.`
  );
}

function resetWallet() {
  if (isSpinning) return;
  tokens = startingTokens;
  streak = 0;
  reels[0].textContent = "🤖";
  reels[1].textContent = "🪙";
  reels[2].textContent = "🔥";
  reels.forEach((reel) => reel.classList.remove("win"));
  updateUi(0);
  setMessage("Wallet reset. Fresh funding round secured. Please resume responsible token gambling.");
}

spinBtn.addEventListener("click", spin);
cashOutBtn.addEventListener("click", cashOut);
resetBtn.addEventListener("click", resetWallet);

loadTokens();
updateUi();
