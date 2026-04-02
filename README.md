# OSCAR — Unified Frontend Dashboard

This repository is the core user interface module of the broader **OSCAR** project:
> **OSCAR — Open Supply-Chain Assurance & Resilience for Cloud-Native Software Ecosystems**

## 🌐 The OSCAR Architecture

The OSCAR ecosystem is decoupled into three standalone repositories that work together to form a comprehensive supply-chain and risk intelligence platform:

1. **`oscar-dependency-observatory`:** Analyzes macro-level transitive dependencies between packages (e.g., npm and PyPI) across entire software ecosystems.
2. **`oscar-method-observatory`:** Analyzes micro-level, internal source code topologies, resolving deep function-to-function abstract syntax trees and structural risks.
3. **`oscar-frontend` (This Repository):** The unified React/Vite UI that bridges both backends into an interactive dashboard, visualizer, and method explorer.

---

## 📌 Overview

The **OSCAR Frontend** acts as a singular pane of glass allowing researchers and developers to deeply engage with the datasets exposed by the observatory backends. Key functionality includes:

- **Ecosystem Hotspot Dashboard:** A consolidated view of the highest risk elements in external dependency resolution.
- **Dependency Graph Visualizer:** Powered by Cytoscape, interactively traverse multi-layered macro resolution trees.
- **Method Explorer:** Interface directly with local AST parsing telemetry to view module clustering, method Blast Radius charts, and code complexities of deeply parsed code paths. 

---

## 🗂️ Project Structure

This application is built with **React, TypeScript, Vite, and TailwindCSS.**

```
oscar-frontend/
├── src/
│   ├── components/         # Reusable structural components (Nav, Table, Modals)
│   ├── hooks/              # Custom Data Fetching wrappers using React Query
│   ├── pages/              # Router mapping endpoints (Search, Dashboard, GraphViewer)
│   ├── services/           # Axios network clients mapping to environmental backend URIs
│   ├── types/              # Extensive typescript definitions mirroring Pydantic models
│   ├── App.tsx             # Application router setup
│   ├── index.css           # Raw styling overrides and Tailwind injection
│   └── main.tsx            # DOM initialization loop
├── .env                    # Contains bindings to the external API addresses
├── package.json            # Node module dependency manifests
├── vite.config.ts          # Vite bundler toolchains
└── tailwind.config.js      # Styling design systems config (if present)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Ensure both the `oscar-dependency-observatory` and `oscar-method-observatory` backends are already successfully running on your local machine.

### Start the Frontend Server

```bash
# 1. Install Node Packages
npm install

# 2. Run the Vite Dev Server
npm run dev
```

The web server will immediately spin up and generally mount at `http://localhost:5173/`.
As long as the environmental URL variables map to the correct backend ports (generally `:8000` and `:8001`), the dashboard will automatically hydrate and render data from both APIs.

---

## 📡 API Routing

The application relies on environmental variables indicating where the Observatories reside. These can commonly be mapped in a `.env` file at the root directory:

```env
VITE_OSCAR_API_URL=http://localhost:8000
VITE_METHOD_API_URL=http://localhost:8001
```
