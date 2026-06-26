# Deadline Guardian AI

> Built for **Vibe2Ship** (Coding Ninjas × Google for Developers) — Problem Statement 1: *The Last-Minute Life Saver*

An AI execution agent that doesn't just remind you about deadlines — it plans your path to them, watches your progress, and **autonomously replans your schedule** the moment life gets in the way.

## The Problem

Reminders don't help people who are already behind. Deadline Guardian AI is built around a different idea: when you tell it a goal and a deadline, it should act like a coach who actually does the planning work — and re-does it instantly when something goes wrong.

## How It Works

1. **Onboarding** — You enter your profile (name, profession, daily hours available) and your first goal (title, deadline, notes).
2. **Goal Analysis (Gemini)** — The app classifies the goal into a category (Software Project, Exam Prep, Hackathon Project, Job Search, etc.), then sends it to Gemini, which returns:
   - A success probability (0–100%) and risk level
   - Goal-specific reasoning for that score
   - A full day-by-day task schedule from today to the deadline
3. **Dashboard** — Tracks all active goals, today's tasks, and an AI-generated daily brief with priorities, warnings, and recovery suggestions.
4. **Obstacle Reporting & Autonomous Replanning** — If something derails you (illness, extra work, a family event), you log it. Gemini re-evaluates your remaining time, recalculates your success probability, and generates a **new task schedule** — including explicit scope-reduction advice (e.g. "drop the analytics module, focus on core CRUD").
5. **Offline-safe by design** — If no Gemini API key is configured, the app falls back to a deterministic local simulation engine that mirrors the same reasoning structure, so the product is always demoable.

## Key Features

- Goal creation with automatic category classification
- AI-generated, goal-specific day-by-day task plans
- Success probability & risk scoring with explainable reasoning
- Obstacle logging with autonomous AI replanning (not just rescheduling — actual scope/strategy advice)
- AI-generated daily brief (priorities, warnings, recovery suggestions, motivation)
- Light/dark theme, fully client-side persistence (no login required)
- Graceful local-simulation fallback when no API key is present

## Tech Stack

- React 19 + TypeScript + Vite
- Google Gemini API (`@google/generative-ai`, `gemini-1.5-flash`) — structured JSON-mode responses for planning, replanning, and daily briefs
- lucide-react for icons
- Client-side persistence via localStorage (no backend required for this build)

## Running Locally

```bash
npm install
npm run dev
```

Add your Gemini API key in the in-app Settings panel, or set `VITE_GEMINI_API_KEY` in a `.env` file. Without a key, the app runs in local simulation mode automatically.

## Deployment (Google Cloud Run)

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for step-by-step Cloud Run deployment instructions.