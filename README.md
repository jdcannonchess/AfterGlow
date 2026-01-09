# Daily Command Board

A desktop to-do list application designed as a **Daily Command Board** that stays open on your second monitor, helping you capture and manage all your work.

## Features

- **Today View**: Shows all tasks due today or earlier with automatic rollover
- **Task Types**: One-off tasks and recurring tasks with flexible patterns
- **Priority System**: p0 (Critical) through p4 (Someday) with visual indicators
- **Status Tracking**: Not Started, In Progress, Waiting, Needs Review, Blocked, Someday, Done
- **Drag & Drop**: Reorder tasks within priority bands
- **Keyboard Shortcuts**: Quick navigation and task creation
- **Recurring Patterns**: Weekly, biweekly, monthly, quarterly, yearly, and business-day intervals

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Run in development mode (web only)
npm run dev

# Run with Tauri (desktop app)
npm run tauri dev
```

### Building

```bash
# Build the desktop application
npm run tauri build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New task |
| `T` | Today view |
| `A` | All tasks view |
| `R` | Recurring view |
| `S` | Someday view |
| `Ctrl+1-5` | Quick view navigation |

## Task Priorities

| Priority | Label | Color |
|----------|-------|-------|
| p0 | Critical | Red |
| p0.5 | Urgent | Orange |
| p1 | High | Yellow |
| p2 | Normal | Gray (default) |
| p3 | Low | Dark Gray |
| p4 | Someday | Darkest Gray |

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State**: Zustand
- **Desktop**: Tauri 2.0
- **Storage**: Local JSON file (via Tauri) or localStorage (web)

## License

MIT

