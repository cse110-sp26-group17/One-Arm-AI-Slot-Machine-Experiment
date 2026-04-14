# One-Arm-AI-Slot-Machine-Experiment

## Overview
A team-bonding warm-up and science experiment measuring the consistency and variation of AI coding assistants when given identical prompts.

## Setup

### Model & Tool
- **Tool:** OpenAI Codex (via [VS Code / Standalone / etc.])
- **Model:** GPT-5.3-Codex
- **All 50 baseline runs use this exact model. No switching.**

### The Frozen Prompt
See `prompts/original-prompt.txt` — use this text exactly, verbatim, every time.

# Project Structure

```
One-Arm-AI-Slot-Machine-Experiment/
│
├── README.md
├── docs/ 
│   ├── original-prompt.txt
│
├── steps(1-50)/ 
│   ├── 1/
│   │   ├── README.md
│   │   └── files/(code+stats)
│   
└── shared/
    ├── assets/
    └── utils/
```

---

## How to Use

* Each folder inside `steps/` is a **work chunk** (e.g. 1–5)
*   5 prompts each person, one folder per prompt
* Work amd put data only inside your assigned folder
* Add notes or instructions in that folder’s `README.md`


---

## Notes

* `shared/` = common resources everyone can use, images, helpers if needed etc
* `docs/` = extra documentation
* Keep everything organized by chunk to avoid overlap
