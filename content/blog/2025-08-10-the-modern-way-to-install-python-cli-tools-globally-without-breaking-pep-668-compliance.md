---
title: "How to Install Python CLI Tools Globally Without Breaking PEP 668"
description: "Ubuntu 24.04 enforces PEP 668, blocking global pip installs. Learn how to use pipx, uv, and other modern methods to install Python CLI tools globally while staying compliant."
readTime: 10
date: "2025-08-09T23:20:00Z"
author: "Saadman Rafat"
image: "modern-way-to-install-cli-tools-globally.png"
tags: ["python", "cli", "pipx", "uv", "pep-668", "developer-tools"]
category: "Python Development"
keyPoints:
  - "PEP 668 blocks global pip installs to protect system Python on many Linux systems."
  - "Using --break-system-packages is unsafe and not recommended."
  - "Modern ways to install Python CLI tools globally:"
  - "pipx: Stable, isolates each tool in its own virtual environment."
  - "uv: Fast, Rust-based, similar to pipx."
  - "pip --user: Quick and PEP 668–compliant, but no isolation."
  - "Dedicated venv: Maximum control, more setup required."
tldr: "PEP 668 blocks global pip installs. Use pipx or uv for safe, isolated global CLI tool installs."
faqs:
  - question: "Why can't I use sudo pip install anymore?"
    answer: "PEP 668 marks system Python as externally managed to protect OS tools. sudo pip install can break critical system packages."
  - question: "Should I use pipx or uv?"
    answer: "pipx is mature and stable. uv is newer and extremely fast. Both isolate tools and avoid dependency conflicts."
  - question: "Does PEP 668 affect virtual environments?"
    answer: "No. PEP 668 only applies to system/global installs, not virtualenvs or venvs you create."
  - question: "Is pip --user safe?"
    answer: "Yes, it respects PEP 668 and installs to your home directory, but does not isolate dependencies between tools."
---

# The Modern Way to Install Python CLI Tools Globally Without Breaking PEP 668 Compliance

You’ve built a slick Python CLI tool—clean help messages, intuitive flags, everything just works. Time to install it globally:

```bash
pip install .
```

And then... this happens:

```bash
error: externally-managed-environment

× This environment is externally managed
╰─ To install Python packages system-wide, try apt install
    python3-xyz, where xyz is the package you are trying to
    install.
```

I wrote a [blog post](https://saadman.dev/blog/2025-05-15-the-reason-pip-refuses-to-install-globally) about this error, explaining why it exists and how to work around it. But today, I want to focus on a more elegant solution that respects PEP 668 compliance while allowing you to install Python CLI tools globally.

## Welcome to the PEP 668 era.

PEP 668 introduced “externally managed environments” to protect your OS from broken dependencies, especially on Linux distributions like Ubuntu 24.04. It’s a good safeguard—but it also means your old pip install habits for global CLI tools no longer work without hacks.

This post isn’t about fighting PEP 668. It’s about working with it—using modern, safe methods to install CLI tools globally without wrecking your system.


## The Problem We All Face

Here's the thing: PEP 668 isn't trying to ruin your day. It's actually solving a real problem that anyone who's maintained Linux systems has experienced:

- **Dependency hell**: Your system's Python packages conflicting with pip-installed ones
- **Broken OS tools**: That time `apt` stopped working because you installed the wrong version of `requests`
- **The Friday afternoon panic**: When your deployment scripts fail because someone globally installed a package that broke system dependencies

But here's what PEP 668 *didn't* solve: how to elegantly install the CLI tools we actually want to use globally. Tools like `black`, `ruff`, `httpie`, or that awesome script you just wrote.

## What Actually Works in 2025

Let me save you some time. Here are the approaches that actually work, ranked by how much your future self will thank you:

### 1. pipx: The Tool You Should Be Using

If you're not using `pipx` yet, you're missing out. It's specifically designed for this exact problem:

```bash
# Install pipx (once)
sudo apt install pipx  # Ubuntu/Debian
brew install pipx      # macOS

# Install CLI tools the right way
pipx install black
pipx install ruff
pipx install your-awesome-cli-tool
```

What makes `pipx` brilliant:
- Each tool gets its own isolated virtual environment
- Tools are globally accessible from `~/.local/bin`
- Zero dependency conflicts between tools
- Dead simple management

```bash
pipx list                    # See what's installed
pipx upgrade black          # Update one tool
pipx upgrade-all            # Update everything
pipx uninstall black        # Clean removal
```

### 2. uv: The Speed Demon

If you haven't tried `uv` yet, prepare to have your mind blown. It's like `pipx` but written in Rust and ridiculously fast:

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install tools at light speed
uv tool install ruff
uv tool install black
uv tool install your-cli-tool

# Management is equally fast
uv tool list
uv tool upgrade --all
```

The performance difference is noticeable. What takes `pipx` 30 seconds, `uv` does in 3.

### 3. pip --user: When You Need Simple

Sometimes you just need something installed quickly without the overhead:

```bash
pip install --user black
```

This installs to `~/.local/lib/python3.x/site-packages` and puts binaries in `~/.local/bin`. It's fast, simple, and respects PEP 668.

**The catch?** No isolation. If two tools need conflicting dependencies, you're back to dependency hell.

### 4. The Dedicated Virtual Environment Approach

For maximum control, create a dedicated virtual environment for your CLI tools:

```bash
# Set up once
python -m venv ~/.venv/cli-tools
source ~/.venv/cli-tools/bin/activate
pip install black ruff httpie your-awesome-tool

# Add to your shell config (~/.bashrc, ~/.zshrc)
alias black='~/.venv/cli-tools/bin/black'
alias ruff='~/.venv/cli-tools/bin/ruff'
alias http='~/.venv/cli-tools/bin/http'
```

This gives you complete control but requires more setup and maintenance.

## Real-World Example: Setting Up a Development Environment

Here's how I set up CLI tools on a new machine in 2025:

```bash
# Install uv (my current preference for speed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Essential development tools
uv tool install black          # Code formatting
uv tool install ruff           # Linting and more formatting
uv tool install mypy           # Type checking
uv tool install pytest         # Testing
uv tool install cookiecutter   # Project scaffolding
uv tool install httpie         # API testing
uv tool install poetry         # Dependency management

# Verify everything is working
uv tool list
```

Total time: under 2 minutes. Everything isolated, everything working.

## The "But I Have a Script" Problem

"That's great for published packages, but I just have a Python script I want to install globally." 

I hear you. Here's the modern approach:

### Option 1: Make it a proper package (recommended)

Create a minimal `pyproject.toml`:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-awesome-script"
version = "0.1.0"
dependencies = []

[project.scripts]
my-script = "my_awesome_script:main"
```

Then install with `pipx` or `uv tool install .`

### Option 2: Use pipx run for one-offs

```bash
pipx run --spec . my-script
```

This runs your script without permanently installing it.

### Option 3: Direct installation with pipx

```bash
pipx install .  # From your script's directory
```

## What About Docker and CI/CD?

In containerized environments, you can often ignore PEP 668 since you control the entire environment:

```dockerfile
# In a Dockerfile, this is fine
RUN pip install --break-system-packages my-cli-tool
```

But even there, consider using `uv` for speed:

```dockerfile
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
RUN uv tool install my-cli-tool
```

## The Migration Path

If you're currently using `--break-system-packages` everywhere, here's your migration strategy:

1. **Audit what you have**: `pip list --user` to see what's installed
2. **Start fresh**: Use `pipx` or `uv tool` for new installations
3. **Migrate gradually**: Replace `--break-system-packages` installs one by one
4. **Update your scripts**: Change deployment scripts to use modern tools

## Performance Comparison

I tested installing 5 common CLI tools on a fresh Ubuntu 24.04 system:

| Method | Time | Isolation | Conflicts |
|--------|------|-----------|-----------|
| `uv tool install` | 12s | Perfect | None |
| `pipx install` | 45s | Perfect | None |
| `pip --user` | 8s | None | Possible |
| Virtual env + pip | 15s | Perfect | None |

`uv` is clearly the speed winner, but `pipx` has better ecosystem maturity.

## What's Next?

The Python packaging ecosystem keeps evolving. Keep an eye on:
- **PEP 704**: Requiring virtual environments (might make this even more important)
- **uv's rapid development**: New features land frequently
- **pipx improvements**: Still the most stable choice

## Bottom Line

PEP 668 isn't the enemy—it's pushing us toward better practices. Instead of fighting it:

1. **Use `pipx` or `uv tool`** for CLI applications
2. **Embrace isolation** instead of global package soup
3. **Update your deployment scripts** to use modern tools
4. **Never use `--break-system-packages`** in production

Your future self (and your sysadmin) will thank you. Trust me on this one.
