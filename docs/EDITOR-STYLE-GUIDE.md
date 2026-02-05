# Bonk Engine Editor Style Guide

This document defines the visual design system for the Bonk Engine editor UI.

## Color Palette

The editor uses Tailwind's **zinc** color scale as the foundation, providing a cool, neutral gray palette that's easy on the eyes for extended development sessions.

### Background Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Background | `bg-zinc-950` | `#09090b` | Main app background, viewport background |
| Panel | `bg-zinc-900` | `#18181b` | Panel backgrounds, cards |
| Surface | `bg-zinc-800` | `#27272a` | Elevated surfaces, hover states |
| Input | `bg-zinc-950` | `#09090b` | Input field backgrounds |

### Border Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Border Default | `border-zinc-800` | `#27272a` | Panel borders, dividers |
| Border Subtle | `border-zinc-700` | `#3f3f46` | Input borders, secondary dividers |

### Text Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Primary | `text-zinc-200` | `#e4e4e7` | Primary text, headings |
| Secondary | `text-zinc-400` | `#a1a1aa` | Secondary text, labels |
| Muted | `text-zinc-500` | `#71717a` | Placeholder text, disabled |

### Accent Colors

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Primary (Blue) | `text-sky-400` | `#38bdf8` | Primary actions, links, selection |
| Success (Green) | `text-green-400` | `#4ade80` | Success states, play mode |
| Warning (Yellow) | `text-yellow-400` | `#facc15` | Warnings, folders, code files |
| Error (Red) | `text-red-400` | `#f87171` | Errors, destructive actions, stop |

### Axis Colors (Transform Inspector)

| Axis | Tailwind Class | Usage |
|------|---------------|-------|
| X | `text-red-400` | X-axis labels and gizmos |
| Y | `text-green-400` | Y-axis labels and gizmos |
| Z | `text-sky-400` | Z-axis labels and gizmos |

---

## Typography

### Font Families

```css
font-family: 'Inter', sans-serif;     /* UI text */
font-family: 'JetBrains Mono', monospace; /* Code, values, file names */
```

### Font Sizes

| Size | Class | Usage |
|------|-------|-------|
| 10px | `text-[10px]` | Tiny labels (axis labels, counts) |
| 11px | `text-[11px]` | Input values |
| 12px | `text-xs` | Most UI text, tree items |
| 14px | `text-sm` | Panel titles, larger labels |

### Text Styles

```tsx
// Panel title
<span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/80 font-mono">
  Panel Title
</span>

// Section header
<span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
  Section
</span>

// Tree item
<span className="text-xs font-mono truncate">
  ItemName
</span>

// Label
<label className="text-[10px] text-zinc-500">
  Label
</label>
```

---

## Components

### Panel

Panels are the primary container for editor sections.

```tsx
<div className="flex flex-col h-full overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-900">
  {/* Header */}
  <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-3 py-1">
    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/80 font-mono">
      Title
    </span>
  </div>
  {/* Content */}
  <div className="flex-1 overflow-hidden">
    {children}
  </div>
</div>
```

### Button Variants

```tsx
// Primary (default)
className="bg-zinc-800 border border-sky-400/30 text-sky-400 hover:bg-sky-400 hover:text-zinc-950"

// Outline
className="border border-sky-400/30 bg-transparent hover:bg-sky-400/10 text-sky-400"

// Destructive
className="bg-red-500/10 border border-red-400/50 text-red-400 hover:bg-red-500 hover:text-white"

// Ghost
className="hover:bg-sky-400/10 hover:text-sky-400 text-zinc-400"

// Secondary
className="bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"
```

### Input

```tsx
<input className="
  flex h-9 w-full rounded-md
  border border-zinc-700 bg-zinc-950
  px-3 py-1 text-sm font-mono text-zinc-100
  placeholder:text-zinc-500
  focus-visible:outline-none focus-visible:border-sky-400 focus-visible:ring-1 focus-visible:ring-sky-400
  disabled:cursor-not-allowed disabled:opacity-50
" />
```

### Tree Item (Hierarchy/Project)

```tsx
// Default state
className="flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors select-none hover:bg-zinc-800 text-zinc-300"

// Selected state
className="flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors select-none bg-sky-400/20 text-sky-400"
```

### Inspector Section

```tsx
<div className="bg-zinc-950/50 rounded border border-zinc-800">
  {/* Header - clickable to expand/collapse */}
  <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-zinc-800">
    <ChevronDown size={12} className="text-zinc-500" />
    <Icon size={12} className="text-sky-400" />
    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
      Section Name
    </span>
  </button>

  {/* Content */}
  <div className="px-2 pb-2 space-y-2">
    {/* Fields */}
  </div>
</div>
```

### Toolbar (Viewport)

Floating toolbar with backdrop blur:

```tsx
<div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 bg-zinc-900/90 p-1 rounded-md border border-zinc-800 shadow-lg backdrop-blur-sm">
  <button className="p-1.5 rounded transition-colors text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
    <Icon size={16} />
  </button>
</div>
```

---

## Spacing

Use Tailwind's default spacing scale:

| Token | Value | Usage |
|-------|-------|-------|
| `gap-0.5` | 2px | Tight gaps (panel grid) |
| `gap-1` | 4px | Small gaps (button groups, toolbar) |
| `gap-2` | 8px | Standard gaps (form fields) |
| `p-1` | 4px | Compact padding (toolbars) |
| `p-2` | 8px | Standard padding (panel content) |
| `p-3` | 12px | Comfortable padding (inspector) |
| `px-3 py-1` | | Panel header padding |

---

## Borders & Rounded Corners

| Token | Class | Usage |
|-------|-------|-------|
| Panel | `rounded-xl` | Main panels, viewport |
| Button/Input | `rounded-md` | Buttons, inputs, cards |
| Small | `rounded` | Tags, small elements |
| Tab | `rounded-t-lg` | Tab buttons |

---

## Shadows

The editor uses minimal shadows for a flat, modern look:

```tsx
// Floating toolbar/dropdown
className="shadow-lg"

// No shadows on panels (borders provide separation)
```

---

## States

### Hover

```tsx
// Background lightens
"hover:bg-zinc-800"

// Text brightens
"hover:text-zinc-300"

// Accent elements
"hover:bg-sky-400/10"
```

### Focus

```tsx
// Ring style
"focus-visible:outline-none focus-visible:border-sky-400 focus-visible:ring-1 focus-visible:ring-sky-400"
```

### Selected

```tsx
// Background tint + accent text
"bg-sky-400/20 text-sky-400"
```

### Disabled

```tsx
"disabled:cursor-not-allowed disabled:opacity-50"
```

### Active/Playing

```tsx
// Green tint for play mode
"border-green-500/50"
"bg-green-500/20 text-green-500"
```

---

## Icons

Use [Lucide React](https://lucide.dev/) for icons.

### Sizes

| Size | Usage |
|------|-------|
| 10px | Inline with small text |
| 12px | Tree items, inspector headers |
| 14px | Toolbar icons (secondary) |
| 16px | Primary toolbar icons |
| 24-32px | Empty states |

### Colors

- Default: `text-zinc-500`
- Hover: `text-zinc-300`
- Active: `text-sky-400`
- Semantic: Use accent colors (green for success, red for error, etc.)

---

## Scrollbars

Custom webkit scrollbars:

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #18181b; /* zinc-900 */
}

::-webkit-scrollbar-thumb {
  background: #3f3f46; /* zinc-700 */
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #38bdf8; /* sky-400 */
}
```

---

## File Type Icons

| Extension | Color | Icon |
|-----------|-------|------|
| `.ts`, `.tsx`, `.js` | `text-yellow-400` | `FileCode` |
| `.json` | `text-green-400` | `FileText` |
| `.png`, `.jpg`, `.gif` | `text-sky-400` | `Image` |
| Folder | `text-yellow-400` | `Folder`/`FolderOpen` |
| Default | `text-zinc-400` | `FileText` |

---

## Animation

Keep animations subtle and fast:

```tsx
// Standard transition
"transition-colors"

// Duration (when needed)
"duration-200"
```

Avoid:
- CRT effects (scanlines, flicker)
- Offset shadows
- Excessive motion

---

## Dark Theme Only

The editor is designed exclusively for dark mode. Do not add light theme support.

---

## Accessibility

- All interactive elements must have visible focus states
- Use semantic HTML where possible
- Provide `title` attributes on icon-only buttons
- Maintain sufficient color contrast (WCAG AA minimum)
