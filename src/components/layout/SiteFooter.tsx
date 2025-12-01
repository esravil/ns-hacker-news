"use client";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-background/80 py-4 text-xs text-zinc-500 dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4">
        <nav className="flex items-center gap-4">
          <a
            href="https://ns.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            legal
          </a>
          <a
            href="https://ns.com/security"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            security
          </a>
          <a
            href="https://ns.com/apply"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            apply
          </a>
        </nav>

        <div className="flex justify-center">
          <img
            src="/plus-flag-white.png"
            alt="Network State flag"
            className="h-6 w-auto"
          />
        </div>
      </div>
    </footer>
  );
}