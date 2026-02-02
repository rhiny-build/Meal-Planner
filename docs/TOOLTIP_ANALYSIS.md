# Tooltip for Truncated Recipe Names - Analysis

## Problem
Recipe names in the meal plan grid are truncated with ellipsis (200px fixed columns), but hover tooltip to show full name doesn't work.

## Failed Approaches

### 1. Native title on SingleValue
- react-select does not forward hover events to SingleValue
- The rendered text is inside a complex tree with pointer events managed by the control
- Native tooltip never fires
- **Verdict:** Unreliable and unsupported

### 2. CSS group-hover tooltip
- react-select sets `overflow: hidden` on multiple internal containers
- CSS tooltips cannot escape overflow
- Grid + overflow = guaranteed clipping
- **Verdict:** CSS-only tooltips are impossible here

### 3. useState + fixed positioning
- react-select recreates internal components
- Hover state was being reset
- mouseenter/mouseleave are not stable targets
- Fighting React reconciliation
- **Verdict:** Events aren't stable enough

### 4. createPortal to document.body
- Tooltip rendered fine
- But the hover trigger never fired
- Because react-select captures pointer events internally
- **Verdict:** Portals don't fix event capture

### 5. title on wrapper div (DraggableRecipeCell)
- react-select uses pointer-events on children
- Parent never receives hover
- Native tooltip won't trigger unless the hovered element itself has title
- **Verdict:** No bubbling = no tooltip

## Root Cause
react-select is not a normal DOM input. It:
- Manages pointer events internally
- Prevents hover bubbling
- Recreates subtrees frequently
- Uses `overflow: hidden` aggressively

So DIY hover detection is a dead end.

## Important Nuance (from debugging)
The alert test proved hover CAN work — when using a simple arrow function component with just `onMouseEnter={() => alert(...)}`, the alert fired successfully. This means react-select doesn't completely block hover events on custom SingleValue components.

**The breakage happened when useState was added** — that's when hover stopped firing. This suggests the real issue with approach 3/4 wasn't "pointer-events capture" but rather **component identity instability**. When you add hooks to a component passed to react-select's `components` prop, react-select may be recreating the component definition on each render, causing React to unmount/remount and lose the event bindings.

## Refined Diagnosis
- Simple stateless custom components CAN receive hover events
- Adding hooks breaks component identity → React reconciliation issues

## Solutions to Try

### Option A: Stable component reference
Define the custom component **outside** the render function (stable reference) so react-select doesn't recreate it.

### Option B: Radix Tooltip (Recommended)
Libraries like **Radix Tooltip** attach directly to the DOM node and do not rely on bubbling or CSS overflow. They use portals internally and handle positioning correctly.

```bash
npm install @radix-ui/react-tooltip
```

This approach bypasses all the react-select quirks by attaching tooltip behavior directly to the DOM element.

### Option C: Other tooltip libraries
- Tippy.js (@tippyjs/react)
- Floating UI
- React Tooltip

All of these attach to DOM directly rather than relying on CSS or event bubbling.
