---
title: "A no nonsense guide to UV (a Python Package Manager)"
description: "A fast, modern, all-in-one Python package manager that simplifies dependency management, environments, and Python versions."
readTime: 6
date: "2025-05-15"
updated: "16:33:26Z"
author: "Saadman Rafat"
image: "python-package-manager.jpg"
tags: ["PIP", "Python", "Python Package Manager", "UV", "Rust", "Development Tools", "tutorial", "guide"]
category: "Tools"
tldr: "UV is a blazing-fast Python package manager written in Rust that combines pip, virtualenv, pip-tools, and pyenv into one tool, offering 10-100x speed improvements."
keyPoints:
  - "UV is 10-100x faster than traditional package managers and written in Rust"
  - "Single tool replaces pip, virtualenv, pip-tools, pyenv, and parts of Poetry/Conda"
  - "Handles Python version management seamlessly, even downloading missing versions"
  - "Offers instant environment creation with deterministic dependency resolution"
  - "Compatible with existing pip projects and requirements.txt files"
isHowTo: true
requirements:
  - "Command line terminal"
  - "Basic understanding of Python packages"
tools:
  - "UV package manager"
  - "Terminal/Command line"
steps:
  - name: "Install UV"
    text: "Install UV using Astral's installer with curl -Ls https://astral.sh/uv/install.sh | bash"
  - name: "Initialize a new project"
    text: "Run 'uv init' to create pyproject.toml and .venv with your current Python version"
  - name: "Add dependencies"
    text: "Use 'uv add requests' to add packages to your project"
  - name: "Run your project"
    text: "Execute 'uv run main.py' to run in the virtual environment"
  - name: "Manage Python versions"
    text: "Use 'uv venv -p 3.6 .venv' to create environments with specific Python versions"
---

# A no nonsense guide to UV (a Python Package Manager)

UV, a modern Python package manager, comes from an unexpected place — it’s written in Rust. It's 
10-100 times faster than traditional package managers. However, its true strength lies in addressing
long-standing issues in Python package managers, such as **complex dependency resolution**, inefficient 
virtual environment handling, and fragmented tooling, offering a more reliable and streamlined experience 
for developers. It’s designed to be a drop-in replacement for `pip`, `virtualenv`, `pip-tools`, and sometimes 
even `Poetry`.

Why Use UV?
* Instant environment creation
* Fast, deterministic dependency resolution
* Built-in virtualenv management
* Lockfile support (uv.lock)
* Built-in CLI tool isolation (uvx)
* Python version management via .python-version
* Single binary, no runtime deps

Think of it as: 
`pip` + `virtualenv` + `pip-tools` + `pyenv` + `parts of Poetry` + `parts of Conda`, all in one CLI tool 
— but up to 100x faster.


Install UV with [Astral's Installer](https://github.com/astral-sh/uv#installation):
```bash
curl -Ls https://astral.sh/uv/install.sh | bash
```

### Initialize a new project
```bash
uv init
```
This command creates a `pyproject.toml` and `.venv` with your current Python version. `uv init`
can prompt for additional project metadata.

### Add Dependencies
```bash
uv add requests
```
### Run your project in the environment

```bash
uv pip list
uv pip freeze
uv run main.py
```
You can also activate the venv manually

```bash
uv venv .venv  
source .venv/bin/activate
```
### It's compatible with existing `pip` projects or `requirements.txt`

You can still install traditional requirements.txt:
```bash
uv pip install -r requirements.txt
```

### Install from lockfile

```bash
uv install
```
This installs all dependencies based on `pyproject.toml` and `uv.lock`

### Upgrade dependencies
```bash
uv update
```
Resolves and upgrades all packages, updating the lockfile.

#### Okay so far what do we have?

```bash
$ tree
├── main.py
├── pyproject.toml
├── .python-version
├── README.md
└── uv.lock
```

### Using Any Python Version with `uv` (even if it's not installed)
One of UV’s most powerful features is how it handles Python versions seamlessly — even if you 
don’t have that version installed locally.

```bash
uv venv -p 3.6 .venv
```

* This will create a virtual environment using Python 3.6.
* If you don’t have Python 3.6 installed, UV will:
    * Automatically detect that it's missing.
    * Suggest installing it via pyenv, which UV supports natively.
    * Use `.python-version` to track which Python version the project is using.

### Switching Python Versions Per Project

You can use `.python-version` manually:

```bash
echo "3.12.0" > .python-version
uv venv
```
UV reads the version, creates the venv with that interpreter, and tracks everything in 
`pyproject.toml`

### Removing Package
```bash
uv remove requests 
```

### Cleanup
```bash
rm -rf .venv uv.lock
```

This makes UV fully self-contained and version-aware, solving one of the biggest pain points in Python development.