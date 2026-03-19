import Link from "next/link";

export const metadata = {
  title: "How to",
  description:
    "How to use Pomobro — voice options, beeps, circuits, and loopers.",
};

export default function HowToPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-zinc-700 dark:text-zinc-300">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
      >
        ← Back
      </Link>

      <h1 className="font-display mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        How to use Pomobro
      </h1>
      <p className="mb-10 text-zinc-500 dark:text-zinc-400">
        Voice-guided interval timer for workouts and focus sessions.
      </p>

      <section className="mb-10">
        <h2 className="font-display mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Voice options
        </h2>
        <p className="mb-3 text-sm leading-relaxed">
          Each card can have voice announcements. Use the badges on the card (or
          expand for more):
        </p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Voice On/Off</strong> — Toggle spoken announcements for that
            interval.
          </li>
          <li>
            <strong>Start</strong> — Announces the activity name when the
            interval begins.
          </li>
          <li>
            <strong>Halfway</strong> — Announces when you&apos;re halfway
            through (work intervals only).
          </li>
          <li>
            <strong>End</strong> — Spoken countdown (3, 2, 1) at the end of the
            interval.
          </li>
        </ul>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Volume is controlled in Settings (gear icon).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Beep options
        </h2>
        <p className="mb-3 text-sm leading-relaxed">
          Beeps give audio cues without voice. Per interval you can choose:
        </p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Beep On/Off</strong> — One beep per second in the last 3
            seconds, plus a double beep when the interval ends.
          </li>
          <li>
            <strong>Sound</strong> — beep, chime, or bell (in expanded view).
          </li>
        </ul>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Three long beeps play when the whole workout completes.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Simple circuit example
        </h2>
        <p className="mb-3 text-sm leading-relaxed">
          A basic workout: Get ready → Work → Rest, repeated twice.
        </p>
        <ol className="mb-4 list-inside list-decimal space-y-2 text-sm">
          <li>
            Add a <strong>Get ready</strong> card (optional countdown before
            starting).
          </li>
          <li>
            Add a <strong>Workout</strong> card — name it (e.g.
            &quot;Push-ups&quot;), set duration (e.g. 45 sec).
          </li>
          <li>
            Add a <strong>Rest</strong> card — set duration (e.g. 15 sec).
          </li>
          <li>
            Use <strong>Repeat circuit</strong> at the bottom to run the whole
            sequence multiple times.
          </li>
        </ol>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tap the + buttons between cards to add more. Use the chevron to expand
          each card for duration, voice, and beep settings.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Looper (repeat block)
        </h2>
        <p className="mb-3 text-sm leading-relaxed">
          A <strong>Repeat</strong> card repeats the block of cards above it.
          The number is the <em>total</em> times the block runs.
        </p>
        <p className="mb-3 text-sm leading-relaxed">
          Example: Work A (30s) → Rest (10s) → Repeat 3× means: Work A, Rest,
          Work A, Rest, Work A, Rest — three full cycles.
        </p>
        <p className="mb-4 text-sm leading-relaxed">
          Drag the looper handle to include or exclude cards in the block. The
          amber Repeat card sits at the bottom of the block.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You can have multiple loopers; each repeats its own block.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Get ready card
        </h2>
        <p className="mb-4 text-sm leading-relaxed">
          A short countdown before the first work interval. Add it from the top
          connector when no Get ready card exists. When present, it runs first
          and nothing appears before it.
        </p>
      </section>

      <section>
        <h2 className="font-display mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Circuit repeat vs looper
        </h2>
        <p className="text-sm leading-relaxed">
          <strong>Circuit repeat</strong> (bottom of the editor) repeats the
          entire workout. 2× means: do the full sequence, then do it again.
          <br />
          <strong>Looper</strong> repeats only the block of cards above it,
          within a single circuit.
        </p>
      </section>
    </div>
  );
}
