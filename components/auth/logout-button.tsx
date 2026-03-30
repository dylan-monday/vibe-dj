"use client";

// Logout button - Clears auth state

import { useAuthStore } from "@/lib/stores/auth-store";

export function LogoutButton() {
  const { logout, user } = useAuthStore();

  return (
    <button
      onClick={() => logout()}
      className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
    >
      Sign out {user?.displayName && `(${user.displayName})`}
    </button>
  );
}
