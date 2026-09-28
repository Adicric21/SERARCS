import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Den Den Mushi SOS · Grand Line Rescue Dispatch",
  description: "A pirate-chart emergency response coordination system for distress calls, rescue crews and live priority dispatch.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased"><Shell>{children}</Shell></body>
    </html>
  );
}
