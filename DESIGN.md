# Groundwork Design System — Paper-Ink

## Design Philosophy

Groundwork uses the **Paper-Ink** design system — a modern, crisp, editorial engineering aesthetic featuring warm dark modes, high-contrast typography, refined borders, and amber status accents.

## Palette & Color System (`oklch`)

```css
:root {
  --background: oklch(0.985 0.002 90);
  --foreground: oklch(0.145 0.005 90);
  --card: oklch(0.99 0.002 90);
  --border: oklch(0.92 0.004 90);
  --primary: oklch(0.75 0.15 65); /* Amber accent */
  --muted-foreground: oklch(0.55 0.01 90);
}

.dark {
  --background: oklch(0.14 0.005 90);
  --foreground: oklch(0.98 0.002 90);
  --card: oklch(0.18 0.005 90);
  --border: oklch(0.26 0.005 90);
  --primary: oklch(0.78 0.16 65); /* Vibrant Amber */
  --muted-foreground: oklch(0.65 0.01 90);
}
```

## Core Tokens & Usage

### 1. Typography

- **Primary / Body Font**: Clean sans-serif font stack for readability.
- **Monospace Font**: JetBrains Mono / Geist Mono for system metrics, status badges, code files, and track labels.
- **Tracking**: Uppercase tracking `[0.2em]` to `[0.3em]` for status tags and category labels.

### 2. Glassmorphism & Surface Contrast

- **Sticky Shell Header**: `bg-background/80 backdrop-blur-md border-b border-border`.
- **Card Containers**: `rounded-xl border border-border bg-card shadow-xs hover:border-amber-500/50`.
- **Interactive Badges**: Monospace text with low-opacity amber backgrounds (`bg-amber-500/10 text-amber-500 border-amber-500/30`).

### 3. Responsive Breakpoints

- **Mobile (`< sm`)**: Horizontal scrolling file tabs in incident rooms, stacked card columns, compact headers.
- **Desktop (`>= lg`)**: Split 3-column incident workspace (Files Sidebar -> Monaco Editor -> Signal Panel).
