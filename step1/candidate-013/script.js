const symbols = ["🤖", "🧠", "💾", "🪙", "📉", "🔥", "🧾"];

const reels = [
  document.getElementById("reel1"),
  document.getElementById("reel2"),
  document.getElementById("reel3"),
];

const tokenCountEl = document.getElementById("tokenCount");
const spinCostEl = document.getElementById("spinCost");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spinBtn");
const refillBtn = document.getElementById("refillBtn");

let tokens = 100;
const spinCost = 10;
let spinning = false;

function setMessage(text, tone = "neutral") {
  messageEl.textContent = text;
  if (tone === "win") messageEl.style.borderLeftColor = "#22c55e";
  else if (tone === "warn") messageEl.style.borderLeftColor = "#f59e0b";
  else messageEl.style.borderLeftColor = "#ef4444";
}

function updateUI() {
  tokenCountEl.textContent = String(tokens);
  spinCostEl.textContent = String(spinCost);
  spinBtn.disabled = spinning || tokens < spinCost;
}

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function calcPayout([a, b, c]) {
  const same3 = a === b && b === c;
  const same2 = a === b || b === c || a === c;
  const hasFire = [a, b, c].includes("🔥");

  if (same3) return 60;
  if (same2) return 20;
  if (hasFire) return -5;
  return 0;
}

function roastFor(result, payout) {
  if (payout >= 60) return `Jackpot. You aligned 3 ${result[0]} symbols and accidentally replaced a product manager.`;
  if (payout >= 20) return "Two of a kind. Congratulations, your startup now has a 300-slide deck and no users.";
  if (payout < 0) return "A 🔥 appeared. Your tokens were spent on keeping a GPU cluster emotionally stable.";

  const lines = [
    "No win. The model produced confidence with no citations.",
    "No match. That spin was pure sycophancy-as-a-service.",
    "Nothing landed. At least your hallucinations were grammatically correct.",
    "Zero payout. The AI promised AGI by Friday, then asked for more tokens.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

async function animateSpin() {
  reels.forEach((r) => r.classList.add("spinning"));

  const result = [];
  for (let i = 0; i < reels.length; i += 1) {
    await new Promise((resolve) => {
      const start = performance.now();
      const duration = 450 + i * 220;

      function step(now) {
        reels[i].textContent = randomSymbol();
        if (now - start < duration) {
          requestAnimationFrame(step);
        } else {
          const finalSymbol = randomSymbol();
          reels[i].textContent = finalSymbol;
          result.push(finalSymbol);
          reels[i].classList.remove("spinning");
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  return result;
}

async function spin() {
  if (spinning || tokens < spinCost) return;
  spinning = true;
  tokens -= spinCost;
  setMessage("Spinning... calculating how to monetize your curiosity.", "warn");
  updateUI();

  const result = await animateSpin();
  const payout = calcPayout(result);
  tokens = Math.max(0, tokens + payout);

  const roast = roastFor(result, payout);
  const summary = `Result ${result.join(" ")} | Cost -${spinCost} | Payout ${payout >= 0 ? `+${payout}` : payout}`;

  if (payout > 0) setMessage(`${summary}. ${roast}`, "win");
  else if (payout < 0) setMessage(`${summary}. ${roast}`, "warn");
  else setMessage(`${summary}. ${roast}`);

  spinning = false;

  if (tokens < spinCost) {
    setMessage(`You are out of spin budget (${tokens} tokens). Click "Beg For VC Funding" and call it a growth round.`, "warn");
  }

  updateUI();
}

function refillTokens() {
  tokens += 50;
  setMessage("Funding secured. Nobody asked about revenue, so you got +50 tokens.", "win");
  updateUI();
}

spinBtn.addEventListener("click", spin);
refillBtn.addEventListener("click", refillTokens);

updateUI();
