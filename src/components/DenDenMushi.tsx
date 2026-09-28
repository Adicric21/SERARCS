"use client";

import Image from "next/image";
import Link from "next/link";
import { BellRing, PhoneCall, Radio, ShieldAlert } from "lucide-react";

export function DenDenMushi({ unanswered = 0, compact = false }: { unanswered?: number; compact?: boolean }) {
  const ringing = unanswered > 0;
  return (
    <section className={`den-den-card ${compact ? "den-den-card--compact" : ""} ${ringing ? "den-den-card--ringing" : ""}`}>
      <div className="den-den-art">
        {ringing && <span className="den-den-wave" />}
        <Image src="/images/theme/den-den-mushi.png" alt="Den Den Mushi transponder snail" fill sizes={compact ? "150px" : "250px"} className="object-contain" priority />
        {ringing && <div className="den-den-ring-badge"><BellRing size={13}/> RINGING</div>}
      </div>
      <div className="den-den-copy">
        <div className="paper-kicker">TRANS-PONDER RELAY</div>
        <h2 className="font-display text-3xl leading-none text-[#2d1707]">Den Den Mushi</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5a3518]">
          {ringing ? `Puru puru… ${unanswered} distress ${unanswered === 1 ? "call" : "calls"} are waiting for a response.` : "The emergency relay is quiet. The snail is standing by."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/sos" className="btn-pirate"><PhoneCall size={15}/> Answer / transmit SOS</Link>
          <Link href="/" className="btn-paper"><Radio size={14}/> Open command map</Link>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#80572d]">
          <ShieldAlert size={13}/> Emergency relay · {ringing ? "Attention required" : "Standing by"}
        </div>
      </div>
    </section>
  );
}
