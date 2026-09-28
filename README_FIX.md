# Fix applied

- Exported `eventColor` from `src/components/CommandDeck.tsx` so `ArchiveView.tsx` can import it.
- Made the initial SOS queue timestamp hydration-safe by using `data.generatedAt` until the live clock is mounted.

Run `npm install` if needed, then `npm run dev`.
