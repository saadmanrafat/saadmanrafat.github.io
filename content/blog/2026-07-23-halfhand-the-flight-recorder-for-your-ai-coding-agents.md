---
title: "Halfhand: The Flight Recorder for Your AI Coding Agents"
description: "Halfhand (hh) is a local-first Rust CLI that records AI coding agent sessions — Claude Code, Codex CLI, Gemini CLI — and replays them faithfully. Zero network calls, zero cloud, 100% yours."
readTime: 8
date: "2026-07-23T00:00:00Z"
author: "Saadman Rafat"
image: "halfhand-cover.png"
imageAlt: "Halfhand logo, a circular flight-recorder icon"
tags: ["Rust", "CLI", "AI Agents", "Claude Code", "Developer Tools", "Open Source", "Observability", "Local-first"]
category: "Developer Tools"
tldr: "Halfhand (hh) wraps any AI agent command in a PTY and records its terminal output, file diffs, and — for Claude Code, Claude Desktop, Codex CLI, and Gemini CLI — its internal tool calls, all to a local SQLite database. Replay sessions faithfully in a TUI, inspect them non-interactively, search across them, and scrub secrets before you ever share one. No servers, no uploads, zero network calls from hh itself."
keyPoints:
  - "hh run wraps any agent command in a PTY and records terminal output, file diffs, and — for recognized agents — the agent's internal prompts, tool calls, and tool results."
  - "hh replay plays a session back faithfully in a keyboard-driven TUI; hh inspect gives the same detail non-interactively, with --step, --diff, --json, and --failed."
  - "Built-in adapters auto-detect Claude Code, Claude Desktop, OpenAI Codex CLI, and Google Gemini CLI; anything else still gets full terminal and file-change recording."
  - "hh scan finds secrets in a recording without printing them; hh redact strips them in place; hh export is redacted by default."
  - "Everything lives in one local SQLite file plus a content-addressed blob store — a CI check enforces zero network calls from the hh binary itself."
  - "Ships as a crates.io package or a shell installer with a SHA-256-checked prebuilt binary; Linux and macOS are fully CI-tested, Windows builds but is best-effort."
faqs:
  - question: "What is Halfhand?"
    answer: "Halfhand (the hh CLI) is a local-first flight recorder for AI coding agents. It wraps a command like claude, codex, or gemini in a PTY, records everything that happens — terminal output, file changes, and the agent's own tool calls — to a local SQLite database, and lets you replay or inspect the session afterward."
  - question: "Does Halfhand send my data anywhere?"
    answer: "No. Halfhand makes zero network calls from the hh binary itself, and that's enforced by a CI check, not just a promise. Recordings are stored in a SQLite file and a content-addressed blob store on your own machine, in a data directory you control."
  - question: "Which AI agents does Halfhand support?"
    answer: "hh run captures terminal output and file changes for any command you wrap. On top of that, it auto-detects Claude Code, Claude Desktop, OpenAI Codex CLI, and Google Gemini CLI and records their internal prompts, tool calls, and tool results as structured events. Unrecognized agents still get the full terminal and file-change recording."
  - question: "How do I install Halfhand?"
    answer: "cargo install halfhand if you have a Rust toolchain, or run the shell installer: curl --proto '=https' --tlsv1.2 -LsSf https://github.com/halfhandorg/halfhand/releases/latest/download/halfhand-installer.sh | sh. Both install the hh binary; the shell installer verifies a SHA-256 checksum against the release."
  - question: "What happens to secrets that end up in a recording?"
    answer: "Recorded sessions can contain secrets present in prompts and outputs. hh scan reports what it found without printing the secret itself. hh redact removes detected secrets from a recording in place, irreversibly. hh export is redacted by default, and you can turn on at_record redaction in config.toml so secrets never hit disk in the first place."
  - question: "Is hh replay a real re-execution of the agent?"
    answer: "No — it's a faithful transcript, not deterministic re-execution. Replay renders the agent's text, tool calls, and file diffs in the exact order they happened, but the agent is never re-invoked and no API calls or side effects occur during playback."
---

Your agent just finished a 40-minute run. It touched two dozen files, rewrote a config, deleted a module you didn't expect it to touch, and reported "done." Now you're staring at a diff you didn't watch happen, trying to reconstruct *why* — scrolling back through a terminal buffer that's already scrolled off, or digging through a chat transcript that doesn't quite line up with what actually landed on disk.

I hit this often enough running Claude Code, Codex CLI, and Gemini CLI back to back on the same repo that I built a tool to fix it. It's called **[Halfhand](https://halfhand.org)**, and it's a local-first flight recorder for AI agents, written in Rust.

## What Halfhand Actually Does

Halfhand ships as a single binary, `hh`. Point it at any agent command and it wraps that command in a PTY, recording terminal output and file changes as they happen — regardless of what you run. For agents it recognizes, it goes a level deeper and also captures the agent's internal turns: prompts, tool calls, and tool results, as structured events.

```bash
hh run -- claude              # record a Claude Code session (or any command)
hh replay last                # faithfully play it back in an interactive TUI
hh inspect last                # non-interactive summary + step table
hh list                        # every recording, newest first
hh delete last --yes           # remove one
```

Everything — terminal bytes, file diffs, structured agent events — lands in a single local SQLite database plus a content-addressed blob store. There's no server component, no account, no dashboard to log into. Recordings never leave your machine.

## Recording a Session Looks Like This

Here's `hh inspect` on a real Claude Code session — a step-by-step timeline of every file it touched, in order, with timestamps:

![hh inspect output showing a step-by-step file-change timeline from a recorded Claude Code session](/assets/images/blog/halfhand-inspect-timeline.png)

87 steps, 23 files changed, 36 minutes, one command. That table alone answers the question "what did it actually do" faster than re-reading the whole transcript.

## Replaying It Faithfully

`hh replay` drops you into a keyboard-driven TUI: a timeline pane on the left, the detail for whatever step you're on the right, and a keymap overlay (`?`) if you forget the bindings. `j`/`k` to move, `J` to jump to a timestamp, `/` to filter by kind or summary text, `t` to toggle terminal-output segments, `d` to jump straight to the next file diff.

![Halfhand's interactive replay TUI showing the timeline, file diff detail pane, and keymap overlay](/assets/images/blog/halfhand-replay-tui.png)

Worth being precise about what this is: `hh replay` is a **faithful transcript**, not deterministic re-execution. It renders the agent's text, tool calls, and file diffs in the exact order they happened, but the agent is never re-invoked, no API calls are made, and no side effects are reproduced. A session that got cut short (`hh` killed mid-run) replays the partial timeline and is honestly marked `interrupted` rather than pretending otherwise.

## Zooming Into a Single Step

For scripting or quick audits, `hh inspect <id> --step N --diff` skips the TUI entirely and prints the exact unified diff for that step:

![hh inspect --step --diff output showing the exact unified diff for a single recorded step](/assets/images/blog/halfhand-inspect-diff.png)

Add `--json` and the same data comes back structured, so you can pipe a session's file changes into whatever review or CI tooling you already have. `--failed` filters down to steps where something went wrong — useful when an agent run silently regressed something and you don't want to page through 80 steps to find where.

## Installing It

Pick one, both install the `hh` binary:

```bash
# cargo, any OS with a Rust toolchain
cargo install halfhand

# shell installer (macOS & Linux), prebuilt binary + SHA-256 checksum
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/halfhandorg/halfhand/releases/latest/download/halfhand-installer.sh | sh
```

`hh --help` gives you the full command surface — every subcommand also takes `--help` with its own usage example:

![Halfhand hh --help output listing all subcommands: run, replay, inspect, list, delete, mcp-proxy, doctor, gc, stats, scan, redact, export, import, search, completions](/assets/images/blog/halfhand-cli-help.png)

A few worth calling out beyond the obvious ones:

| Command | What it does |
|---|---|
| `hh search <query>` | Full-text search over recorded events (FTS5), filterable by `--agent`, `--kind` |
| `hh scan <id\|last\|--all>` | Reports secrets found in a recording — never the secret itself |
| `hh redact <id\|last>` | Irreversibly strips detected secrets from a recording, in place |
| `hh export <id\|last>` | JSON bundle, portable `--bundle`, or a self-contained `--html` page — redacted by default |
| `hh mcp-proxy -- <server>` | Wraps an MCP server in a recording stdio proxy, so you can see the MCP traffic too |
| `hh doctor` / `hh gc` / `hh stats` | Health check, disk reclaim, and store summary (sessions, disk usage, largest recordings) |

## Adapters: More Than Just a Terminal Recording

Every `hh run` captures terminal output and file changes no matter what you point it at. On top of that, Halfhand auto-detects a handful of agents and records their internal turns as structured events instead of just raw bytes: **Claude Code**, **Claude Desktop**, **OpenAI Codex CLI**, and **Google Gemini CLI** — force a specific one with `--adapter` if detection guesses wrong. If it can't find a transcript for whatever you're running, it degrades gracefully: you still get the complete terminal and file-change recording, just without the structured breakdown.

## Secrets Are a First-Class Concern, Not an Afterthought

Recorded sessions can contain secrets present in prompts and tool outputs — that's just the reality of recording an agent that has your API keys in its environment. Halfhand treats this as a first-class problem instead of a footnote:

- `hh scan` reports what it found, without ever printing the secret itself
- `hh redact` removes detected secrets from a recording in place, irreversibly
- `hh export` is redacted by default, whether you're producing a JSON bundle, a portable `.hh` archive, or a self-contained HTML replay page

You can also turn on redaction at record time, before anything touches disk:

```toml
[redaction]
at_record = true   # default: false — scrub secrets before they hit disk
entropy = true     # default: true — conservative high-entropy detector
rules = [
  { name = "anthropic-api-key", pattern = "sk-ant-[a-zA-Z0-9\\-_]{32,}" },
  { name = "openai-api-key",    pattern = "sk-(?:proj|svcacct|[A-Za-z0-9]{2})-[A-Za-z0-9]{32,}" },
  { name = "stripe-secret-key", pattern = "sk_(?:live|test)_[a-zA-Z0-9]{24,}" },
]
```

Built-in detectors already cover AWS, GitHub, GitLab, Slack, PEM keys, and JWTs — the `rules` block just fills gaps for anything Halfhand doesn't know about yet. A malformed rule is a hard error at startup, on purpose: silently dropping a detector would be a redaction hole, not a convenience.

## Why Local-First

This is the part I care about most, and it's not a marketing line — it's enforced:

- **Zero network calls.** The `hh` binary links no HTTP client. A CI check fails the build if that ever changes.
- **You own the data.** One SQLite file plus a content-addressed blob store, in a data directory you control (`HH_DATA_DIR`). `hh delete` and it's actually gone.
- **Stable interface.** The `--json` schema is frozen going into 1.0, CLI flags are additive-only, and database migrations only ever run forward.

No account, no telemetry, no "anonymous usage stats." If you're recording agent sessions that touch client code, production configs, or anything under an NDA, that constraint isn't a nice-to-have.

## What Developers Are Saying

> "This is super cool! It's like a VCR for LLMs."
> — [Kenneth Reitz](https://kennethreitz.org), creator of [Requests](https://requests.readthedocs.io/en/latest/), [Certifi](https://github.com/certifi/python-certifi), [Pipenv](https://pipenv.pypa.io/en/latest/) & [more](https://github.com/kennethreitz)

## Try It

```bash
cargo install halfhand
hh run -- claude
hh replay last
```

Halfhand is Apache-2.0 licensed and open to contributions — read `CONTRIBUTING.md` before opening a PR. Source, docs, and the full command reference live at [github.com/halfhandorg/halfhand](https://github.com/halfhandorg/halfhand); the project site is [halfhand.org](https://halfhand.org).

I built this because I kept losing track of what my own agents were doing to my own repos. If you run Claude Code, Codex, or Gemini CLI against anything you'd want to audit later, it might save you the same headache it saved me.
