import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-lg text-center">
      <div className="font-display text-7xl gold-text">Lost at Sea</div>
      <p className="mt-3 text-slate-400">This distress call drifted beyond the Calm Belt. Your Log Pose can&apos;t find it.</p>
      <Link href="/" className="btn-gold mt-6">
        Return to Command Deck
      </Link>
    </div>
  );
}
