---
phase: 5
plan: 2
title: Quick Action Buttons
wave: 1
depends_on: [05-01-refinement-interpreter]
files_modified:
  - components/chat/quick-actions.tsx
  - components/chat/chat-panel.tsx
  - components/chat/index.ts
requirements_addressed: [CURA-05]
autonomous: true
---

<objective>
Create quick action buttons for common vibe adjustments.

Purpose: One-tap feedback for "more energy", "calmer", "more like this" without typing.
Output: Button row in chat interface that triggers refinements.
</objective>

<must_haves>
- Quick action buttons visible when music is playing
- "More Energy" button → triggers energy_up refinement
- "Calmer" button → triggers energy_down refinement
- "More Like This" button → seeds from current track
- Buttons disabled during processing
- Visual feedback on tap
</must_haves>

<task id="1">
<title>Create Quick Actions Component</title>
<action>
Create components/chat/quick-actions.tsx:

```typescript
"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";

interface QuickActionsProps {
  onAction: (action: string) => void;
  isDisabled: boolean;
}

export function QuickActions({ onAction, isDisabled }: QuickActionsProps) {
  const { currentTrack } = usePlaybackStore();

  // Only show when music is playing
  if (!currentTrack) {
    return null;
  }

  const actions = [
    { id: "energy_up", label: "More Energy", icon: "⚡" },
    { id: "energy_down", label: "Calmer", icon: "🌙" },
    { id: "more_like_this", label: "More Like This", icon: "❤️" },
  ];

  return (
    <div className="flex gap-2 px-4 py-2 border-t border-white/10">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={isDisabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
            bg-white/5 hover:bg-white/10 border border-white/10
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            active:scale-95
          `}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
```
</action>
<acceptance_criteria>
- QuickActions renders 3 buttons
- Hidden when no track playing
- Disabled state when processing
- Visual feedback on interaction
</acceptance_criteria>
</task>

<task id="2">
<title>Update Chat Index Exports</title>
<action>
Update components/chat/index.ts to export QuickActions:

```typescript
export { ChatMessage } from "./chat-message";
export { ChatInput } from "./chat-input";
export { ChatPanel } from "./chat-panel";
export { QuickActions } from "./quick-actions";
```
</action>
<acceptance_criteria>
- QuickActions exported from chat module
</acceptance_criteria>
</task>

<task id="3">
<title>Integrate Quick Actions into Chat Panel</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/components/chat/chat-panel.tsx
</read_first>
<action>
Update components/chat/chat-panel.tsx to include QuickActions:

1. Import QuickActions component
2. Add handleQuickAction function that maps action IDs to messages:
   - "energy_up" → "more energy"
   - "energy_down" → "calmer please"
   - "more_like_this" → "more like this"
3. Use processRefinement if available, otherwise send as regular message
4. Place QuickActions above the ChatInput

```typescript
// Add to imports
import { QuickActions } from "./quick-actions";

// Add handler inside component
const handleQuickAction = async (actionId: string) => {
  const actionMessages: Record<string, string> = {
    energy_up: "more energy",
    energy_down: "calmer please",
    more_like_this: "more like this",
  };

  const message = actionMessages[actionId];
  if (message) {
    addMessage({ role: "user", content: message });
    await processVibe(message);
  }
};

// In JSX, add before ChatInput:
<QuickActions
  onAction={handleQuickAction}
  isDisabled={isLoading}
/>
```
</action>
<acceptance_criteria>
- Quick actions visible in chat interface
- Clicking action sends appropriate message
- Actions disabled during processing
</acceptance_criteria>
</task>

<verification>
```bash
# TypeScript compiles
npx tsc --noEmit

# Build succeeds
npm run build

# File exists
ls -la components/chat/quick-actions.tsx
```
</verification>
