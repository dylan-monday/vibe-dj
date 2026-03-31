"use client";

import { useAuthStore } from "@/lib/stores/auth-store";

export function LogoutButton() {
  const { logout } = useAuthStore();

  return (
    <button
      onClick={() => logout()}
      className="px-3 py-1.5 rounded-full text-xs text-foreground/20 hover:text-foreground/50 hover:bg-white/5 transition-all"
    >
      Sign out
    </button>
  );
}
