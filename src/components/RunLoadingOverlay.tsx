"use client";

import { createPortal } from "react-dom";

export function RunLoadingOverlay({ open }: { open: boolean }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-[color:var(--ck-bg-base)]/90 pointer-events-none" />

      <div className="fixed inset-0 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[color:var(--ck-bg-soft)] p-8 sm:p-10 shadow-[var(--ck-shadow-2)]">
          <div className="text-xl font-semibold text-[color:var(--ck-text-primary)]">
            Gathering your ingredients..
          </div>

          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-[loading-bar_1.5s_ease-in-out_infinite] rounded-full bg-[var(--ck-accent-red)]" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
