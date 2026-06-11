# Wellness Proton

A desktop wellness companion for Windows. Track hydration, nutrition, medication, exercise, and sleep — all stored locally on your machine. Includes **VitaCloud**, an AI-powered wellness coach that reads your tracked data and gives personalized advice.

---

## Getting Started

Download the latest installer from the [Releases](https://github.com/gellyzoid/wellness-app/releases) page, run it, and Wellness Proton will open automatically when done.

---

## Setting Up the AI Coach (VitaCloud)

VitaCloud is powered by [Groq](https://groq.com) and requires a free API key. Your data is only sent to Groq when you actively send a message — nothing is stored externally.

### 1. Get a free Groq API key

1. Go to [console.groq.com/keys](https://console.groq.com/keys) and sign in (or create a free account).
2. Click **Create API key**, give it a name, and copy the key — it starts with `gsk_`.

### 2. Add the key in Wellness Proton

1. Open Wellness Proton and go to **Settings** (sidebar).
2. Scroll down to the **AI assistant** section.
3. Paste your key into the **Groq API key** field.
4. Optionally choose a model from the dropdown:
   - `openai/gpt-oss-120b` — most capable (default)
   - `openai/gpt-oss-20b` — faster, lighter
   - `llama-3.3-70b-versatile` — Llama-based, versatile
   - `llama-3.1-8b-instant` — fastest, lowest latency
5. Click **Save changes**.
6. Click **Test connection** to confirm the key is working.

### 3. Chat with VitaCloud

Open the **AI Assistant** page from the sidebar. VitaCloud can see your hydration, exercise, sleep, meals, and medication logs. You can ask things like:

- *How am I doing this week?*
- *Suggest a 20-minute workout I can do now.*
- *Am I sleeping enough?*
- *What should I eat for dinner given my logged meals today?*

Type your message and press **Enter** or click **Send**. Past conversations are saved in the sidebar and can be resumed or deleted at any time.

---

## Features

- **Hydration** — log water intake and set a daily goal with optional reminders
- **Nutrition** — track meals throughout the day
- **Medications** — schedule medications with reminders and mark doses taken
- **Exercise** — log workouts and track against a daily minute goal
- **Sleep** — record sleep sessions and monitor against your sleep goal
- **Analytics** — charts and trends across all tracked categories
- **Achievements** — milestone badges as you build healthy habits
- **Backup & restore** — export your data to JSON or restore from a previous backup
- **Start on boot** — optionally launch automatically with Windows

---

## Data & Privacy

All data is stored locally in a SQLite database on your machine. The only outbound network requests are:

- Groq API calls when you send a message to VitaCloud (contains your wellness data for that session)
- Update checks when you click **Check for updates** in Settings
