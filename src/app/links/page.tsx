import Link from "next/link";

export const metadata = {
  title: "nsreddit links",
  description: "Curated resources for the Network State community",
};

export default function LinksPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center py-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Network State links
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Quick access to key resources used by the community.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="https://docs.google.com/document/d/1nLZ4-zaAETjcZ8YTWdYpWFFtXUUxT9wFmDOQFpJwoRw/edit?tab=t.0"
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Resource Doc
          </Link>

          <Link
            href="https://www.google.com/maps/place/Gleneagles+Hospital+Medini+Johor/@1.455334,103.5499793,13z/data=!4m7!3m6!1s0x31da0c76089c8ad1:0x3112ed4c64361833!8m2!3d1.4265967!4d103.6355912!15sCgpHbGVuZWFnbGVzWgwiCmdsZW5lYWdsZXOSARBwcml2YXRlX2hvc3BpdGFs4AEA!16s%2Fg%2F11f5vc9ntk?entry=tts&g_ep=EgoyMDI0MDkyNC4wKgBIAVAD"
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Hospital (Gleneagles Medini Johor)
          </Link>

          <Link
            href="https://luma.com/ns"
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Network State events
          </Link>

          <Link
            href="https://ns.com/wiki"
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            NS wiki
          </Link>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          All links open in a new tab so you can keep nsreddit open.
        </p>
      </div>
    </section>
  );
}