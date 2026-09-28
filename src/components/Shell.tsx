"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, BookOpen, Compass, Radio, Ship, Skull } from "lucide-react";
import type { ReactNode } from "react";
import { useNow } from "./useNow";

const NAV = [
  { href: "/", label: "Grand Line", icon: Compass },
  { href: "/sos", label: "SOS", icon: Radio },
  { href: "/crews", label: "Rescue Fleet", icon: Ship },
  { href: "/archive", label: "Captain's Log", icon: BookOpen },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const now = useNow(1000);
  return (
    <div className="site-shell">
      <header className="wood-header">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 md:px-7">
          <Link href="/" className="brand-lockup">
            <div className="brand-snail"><Image src="/images/theme/den-den-mushi.png" alt="Den Den Mushi" fill sizes="54px" className="object-cover" priority/></div>
            <div><div className="brand-title">Den Den SOS</div><div className="brand-sub">Grand Line Emergency Armada</div></div>
          </Link>
          <nav className="ml-auto flex items-center gap-1.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return <Link key={href} href={href} className={`wood-nav ${active ? "wood-nav-active" : ""}`}><Icon size={15}/><span>{label}</span></Link>;
            })}
          </nav>
          <div className="header-clock hidden lg:flex"><span className="status-dot"/> <span>{now ? now.toLocaleTimeString("en-GB") : "--:--:--"}</span><Anchor size={13}/><Skull size={13}/></div>
        </div>
      </header>
      <main className="site-main mx-auto min-w-0 max-w-[1440px] px-3 py-4 md:px-6 md:py-6">{children}</main>
      <footer className="mx-auto max-w-[1440px] px-4 pb-8 text-center text-[10px] uppercase tracking-[.2em] text-[#ead7ad]/55">Den Den Mushi Emergency Relay · Grand Line Rescue Coordination</footer>
    </div>
  );
}
