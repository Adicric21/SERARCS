"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ArchiveError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the browser console useful while giving the user a recoverable UI.
    console.error("Captain's Log failed to load", error);
  }, []);

  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <div className="paper-card p-8">
        <div className="font-display text-5xl gold-text">Log Pose Disrupted</div>
        <p className="mt-3 text-sm text-[#6f512e]">The Captain&apos;s Log hit a temporary relay error.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button className="btn-gold" onClick={() => reset()}>Retry Log</button>
          <Link href="/" className="btn-ghost">Return to Deck</Link>
        </div>
      </div>
    </div>
  );
}
