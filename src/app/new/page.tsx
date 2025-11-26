"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function NewThreadPage() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup preview URL when the selected file changes or unmounts
  useEffect(() => {
    if (!mediaFile) {
      setMediaPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(mediaFile);
    setMediaPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [mediaFile]);

  if (!user && loading) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Checking your session…
        </p>
      </section>
    );
  }

  if (!user && !loading) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            You need to sign in to start a new thread.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth"
              className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              View threads
            </Link>
          </div>
        </div>
      </section>
    );
  }

  function normalizeAndValidateUrl(raw: string): {
    url: string | null;
    domain: string | null;
    error: string | null;
  } {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { url: null, domain: null, error: null };
    }

    let candidate = trimmed;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    }

    try {
      const parsed = new URL(candidate);
      const domain = parsed.hostname.replace(/^www\./i, "");
      return { url: parsed.toString(), domain, error: null };
    } catch {
      return {
        url: null,
        domain: null,
        error: "The URL looks invalid. Please check it and try again.",
      };
    }
  }

  function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setMediaFile(null);
      setError(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMediaFile(null);
      setError("We currently only support image uploads.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setMediaFile(null);
      setError("Images must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setMediaFile(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || submitting) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setError("Title and body are required.");
      return;
    }

    const { url: normalizedUrl, domain: urlDomain, error: urlValidationError } =
      normalizeAndValidateUrl(url);

    if (urlValidationError) {
      setError(urlValidationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;

    try {
      // If an image is attached, upload it first to R2.
      if (mediaFile) {
        const formData = new FormData();
        formData.append("file", mediaFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.error(
            "Image upload failed",
            response.status,
            response.statusText
          );
          setError(
            "Could not upload your image. Please try again or use a smaller file."
          );
          setSubmitting(false);
          return;
        }

        const payload = (await response.json()) as {
          url?: string;
          mimeType?: string;
          error?: string;
        };

        if (!payload.url) {
          setError(
            payload.error ||
              "Image upload did not return a URL. Please try again."
          );
          setSubmitting(false);
          return;
        }

        mediaUrl = payload.url;
        mediaMimeType = payload.mimeType ?? mediaFile.type ?? null;
      }

      const { data, error: insertError } = await supabase
        .from("threads")
        .insert({
          author_id: user.id,
          title: trimmedTitle,
          body: trimmedBody,
          url: normalizedUrl,
          url_domain: urlDomain,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
        })
        .select("id")
        .single<{ id: number }>();

      if (insertError) {
        console.error("Failed to create thread", insertError);
        setError("Could not create your thread. Please try again.");
        setSubmitting(false);
        return;
      }

      if (!data) {
        setError("Thread created, but we could not load it. Try refreshing.");
        setSubmitting(false);
        return;
      }

      router.push(`/thread/${data.id}`);
    } catch (err) {
      console.error("Unexpected error creating thread", err);
      setError("Could not create your thread. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-1 items-center justify-center py-10">
      <div className="w-full max-w-xl space-y-6 rounded-xl border border-zinc-200 bg-white p-6 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">New thread</h1>
          <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
            Start an anonymous discussion. You can optionally attach a link and
            an image, similar to link posts on Hacker News.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Keep it short and descriptive."
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <label
              htmlFor="body"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Body
            </label>
            <textarea
              id="body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Lay out the context, your question, or the argument you want to explore."
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Optional link */}
          <div className="space-y-2">
            <label
              htmlFor="url"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Link (optional)
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article-or-tweet"
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Optional. If provided, we&apos;ll show the domain next to your
              title and link out to it from the thread.
            </p>
          </div>

          {/* Optional image upload */}
          <div className="space-y-2">
            <p className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Image (optional)
            </p>
            <div className="flex flex-col gap-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Attach an image</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    JPG, PNG, WebP. Max 5 MB.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {mediaFile && (
                    <button
                      type="button"
                      onClick={() => setMediaFile(null)}
                      className="text-[10px] text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      Remove
                    </button>
                  )}
                  <label
                    htmlFor="media"
                    className="inline-flex cursor-pointer items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-900 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Choose file
                  </label>
                  <input
                    id="media"
                    type="file"
                    accept="image/*"
                    onChange={handleMediaChange}
                    className="hidden"
                  />
                </div>
              </div>

              {mediaFile && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Selected:{" "}
                    <span className="font-mono text-[10px]">
                      {mediaFile.name}
                    </span>
                  </p>
                  {mediaPreviewUrl && (
                    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                      <img
                        src={mediaPreviewUrl}
                        alt="Selected preview"
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Threads are public and anonymous, but still tied to your internal
              member id for abuse prevention.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "Posting…" : "Post thread"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}