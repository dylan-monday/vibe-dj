"use client";

import { useAuthStore } from "@/lib/stores/auth-store";

export function LogoutButton() {
  const { logout, user } = useAuthStore();

  return (
    <button
      onClick={() => logout()}
      className="btn-ghost px-4 py-2 rounded-full text-sm text-foreground/70 hover:text-foreground transition-all"
    >
      Sign out
    </button>
  );
}
