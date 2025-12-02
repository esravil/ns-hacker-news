import Link from "next/link";

export default function CommentGuidelinesPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          NS feed / nsreddit – Comment guidelines
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Comments are where this site either becomes a high-signal brain trust
          for the Network State community—or just another noisy group chat.
          These guidelines exist to bias us toward the first outcome.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Why comments exist
        </h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          This forum is intentionally pseudonymous so people can question
          assumptions, critique infrastructure, and have fun without worrying
          about hierarchy. Comments are where that happens. A great comment:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>adds information that wasn&apos;t in the original post,</li>
          <li>shares relevant personal experience,</li>
          <li>offers a thoughtful counterpoint, or</li>
          <li>turns a serious idea into something playful without being cruel.</li>
        </ul>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          The goal is not to win arguments; it&apos;s to make the reader a bit
          more informed or a bit less confused.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Tone: firm on ideas, soft on people
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>
            Be kind. You can be direct without being sharp. If you wouldn&apos;t
            say it to someone across a table at an NS event, don&apos;t post it
            here.
          </li>
          <li>
            Critique ideas, plans, and arguments—not identities, social
            status, or personal traits.
          </li>
          <li>
            When disagreeing, respond to the{" "}
            <span className="font-medium">strongest plausible version</span> of
            what the other person meant, not the laziest reading.
          </li>
          <li>
            Avoid sneering, sarcasm as the main payload, and one-liners whose
            only purpose is to score points.
          </li>
          <li>
            Comments should generally get{" "}
            <span className="font-medium">more</span> thoughtful and precise as
            a topic gets more contentious, not less.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          What good comments look like
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>
            <span className="font-medium">Add a missing dimension.</span> Point
            out tradeoffs, failure modes, historical context, or related work.
          </li>
          <li>
            <span className="font-medium">Bring real experience.</span> "We
            tried something like this at our startup / DAO / city and here&apos;s
            what we learned."
          </li>
          <li>
            <span className="font-medium">Ask precise questions.</span> Instead
            of "this doesn&apos;t make sense," try "how would this
            work if X and Y disagree about Z?"
          </li>
          <li>
            <span className="font-medium">Offer alternatives.</span> If you&apos;re
            poking holes in a proposal, sketch even a rough direction for what
            might work better.
          </li>
          <li>
            <span className="font-medium">Be generous with thanks.</span> Short,
            positive comments like "Thanks, this was really useful" are
            completely fine. Empty negativity is not.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          What to avoid
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>
            Drive-by dunks: comments whose main content is "lol,"
            "this is stupid," or similar.
          </li>
          <li>
            Pure meta about whether someone "even read the article" or
            deserves to be in the community. If something is missing, just
            state it.
          </li>
          <li>
            Pile-ons where multiple people say the same negative thing without
            adding new information.
          </li>
          <li>
            Thread-derailing tangents, especially about generic politics,
            culture-war topics, or personal drama.
          </li>
          <li>
            Complaints about voting, flags, or moderation on every thread.
            Quietly flag or email the mods instead.
          </li>
          <li>
            ALL CAPS for emphasis, wall-of-text rants, or formatting that makes
            the thread difficult to read. Use *italics* or short paragraphs
            instead.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Anonymity and privacy in comments
        </h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          The NS world is small, status-heavy, and closely watched. This space
          exists so people can explore ideas without constantly thinking about
          how a tweet screenshot will play. To keep that working:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>
            Don&apos;t out people, connect handles, or speculate publicly about
            who is behind which pseudonym.
          </li>
          <li>
            Don&apos;t share identifying details about other people without their
            clear consent, even if you believe "everyone already knows."
          </li>
          <li>
            Throwaway accounts are fine for sensitive topics. Rotating through
            new accounts just to stir drama or evade consequences is not.
          </li>
          <li>
            Avoid posting information that could materially harm someone&apos;s
            physical security, legal situation, or ability to participate.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Politics, ideology, and factions
        </h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          The Network State has strong opinions. This site is not a place to
          reenact X arguments or run ideological purity tests. It&apos;s fine to
          talk about governance, policy, and the outside world, but do it in a
          way that:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>teaches something new,</li>
          <li>acknowledges uncertainty, and</li>
          <li>doesn&apos;t treat disagreement as betrayal.</li>
        </ul>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          If a thread is devolving into team sports, step back or change the
          subject. Curiosity beats tribalism.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">In short</h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          Be the kind of commenter you wish more communities had: curious,
          specific, brave enough to say what you think, and gentle enough that
          people are glad you&apos;re here even when you disagree. If you&apos;re
          unsure whether something crosses a line, imagine it pinned to the top
          of an NS event page with your pseudonym on it. If that makes you
          wince, edit before you post.
        </p>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          For broader expectations around posts, voting, and moderation, see the{" "}
          <Link
            href="/guidelines"
            className="underline-offset-2 hover:underline"
          >
            main site guidelines
          </Link>
          .
        </p>
      </section>
    </section>
  );
}