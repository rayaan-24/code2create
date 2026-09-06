# NEXORA UI & Design System Specification

## 1. Design Philosophy: "Apple-level simplicity + Modern AI Dashboard + Futuristic Glass Interface"

NEXORA avoids generic chat layouts and gaming-style neon overuse. Instead, it utilizes a **dark-mode-first glassmorphism** aesthetic defined by:
- Layered translucent panels (`rgba(15, 23, 42, 0.65)`)
- Hardware-accelerated backdrop blur (`backdrop-filter: blur(16px - 24px)`)
- Restrained luminous borders (`rgba(255, 255, 255, 0.08)` to `rgba(56, 189, 248, 0.35)`)
- Soft ambient accent lighting (`rgba(56, 189, 248, 0.15)`)
- Deep layered background radial gradients (`#06080d` base)

## 2. Design Tokens & CSS Variables

| Token | CSS Variable | Value | Purpose |
|---|---|---|---|
| Background | `--background` | `#06080d` | Deep obsidian base surface |
| Foreground | `--foreground` | `#f1f5f9` | High contrast body text |
| Muted Foreground | `--foreground-muted` | `#94a3b8` | Subtitles, labels, captions |
| Subtle Foreground | `--foreground-subtle` | `#64748b` | Placeholders & inactive icons |
| Glass Background | `--glass-bg` | `rgba(15, 23, 42, 0.65)` | Standard card/panel surface |
| Glass Elevated | `--glass-bg-elevated` | `rgba(30, 41, 59, 0.75)` | Modals, floating sheets |
| Glass Border | `--glass-border` | `rgba(255, 255, 255, 0.08)` | Default container borders |
| Glass Border Hover | `--glass-border-hover` | `rgba(56, 189, 248, 0.35)` | Interactive focus/hover border |
| Accent Primary | `--accent-primary` | `#38bdf8` | Sky blue AI accent |
| Accent Secondary | `--accent-secondary` | `#818cf8` | Indigo neural secondary accent |
| Status Success | `--status-success` | `#10b981` | Verified sources, available staff |
| Status Warning | `--status-warning` | `#f59e0b` | In class, pending review |
| Status Error | `--status-error` | `#ef4444` | Urgent medical, validation error |

## 3. Reusable UI Components

- `GlassCard`: Supports `default`, `interactive`, `elevated`, and `subtle` variants.
- `GlassButton`: Supports `primary` (gradient glow), `secondary`, `outline`, `ghost`, and `danger`.
- `GlassInput`: Form control with focus glow, icon slots, and validation messages.
- `GlassBadge`: Pill badge for tags, statuses, and roles.
- `GlassModal`: Dialog with ESC keybindings, backdrop blur, and body scroll lock.
- `GlassPanel`: Layout container for headers, sidebars, and chat decks.

## 4. Typography & Accessibility Standards

- Fonts: Geist Sans & Geist Mono
- Hierarchy: Clear `h1` - `h4` hierarchy, minimum font size 11px.
- Contrast: Meets WCAG AA contrast standards across all dark glass surfaces.
- Focus: Visible outline indicators (`focus-visible:ring-2 focus-visible:ring-sky-400/50`) on all interactive controls.
