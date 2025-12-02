import Link from "next/link";

export default function GuidelinesPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          NS feed / nsreddit – Site guidelines
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          nsreddit is an anonymous, invite-gated forum for people in and around
          the Network State community. It exists to collect signal across
          Discords, WhatsApp groups, Luma events, X, and everything else into a
          single place where thoughtful people can think out loud without
          worrying about who&apos;s watching.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Preface</h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          This space is{" "}
          <span className="font-medium">
            for the people of the Network State, not for the brand of the
            Network State
          </span>
          . The broader community is heavily shaped by its founder and other
          visible leaders. That has upsides, but it can also make honest
          disagreement, sideways ideas, and plain old banter feel risky. This
          forum is designed to tilt the incentives back towards{" "}
          <span className="font-medium">
            privacy, experimentation, and genuine conversation
          </span>
          .
        </p>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          You don&apos;t have to be a founder or investor to belong here. Curious
          builders, operators, researchers, creators, and "normies" who care
          about ideas are all welcome. If you&apos;re the kind of person who reads
          Luma event pages, YC Hacker News, Reddit, or Circle communities for
          fun, you&apos;re in the right neighborhood.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">What belongs here</h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          Post things that would make a smart, curious person in the NS orbit
          sit up a little straighter. A good rule of thumb is:{" "}
          <span className="font-medium">
            does this help thoughtful people see the world, the network, or
            themselves a bit more clearly?
          </span>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>
            Deep dives, analyses, and writeups about technology, governance,
            crypto, cities, coordination, and similar topics.
          </li>
          <li>
            First-hand experiences: building in the NS ecosystem, shipping
            products, running events, investing, moderating communities, or
            just trying to live differently.
          </li>
          <li>
            Concrete proposals and experiments for the Network State and its
            adjacent communities.
          </li>
          <li>
            Pointers to great essays, threads, talks, or tools that you believe
            are worth everyone&apos;s finite attention.
          </li>
          <li>
            Banter and memes that are legible to the community and don&apos;t
            require knowing anyone&apos;s real-world status to understand.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">What doesn&apos;t belong here</h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          This is not a general-purpose social feed, nor a place to wage faction
          wars. The quickest way to make the site worse is to flood it with
          things that are intensely attention-grabbing but intellectually thin.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>
            Pure gossip about specific people in the NS community or elsewhere,
            especially when it edges toward doxxing or reputation attacks.
          </li>
          <li>
            Generic outrage-bait headlines, celebrity drama, or partisan
            politics that could have been copied from any other social network.
          </li>
          <li>
            Low-effort content whose main purpose is to chase karma, followers,
            or attention rather than to inform or entertain in a thoughtful way.
          </li>
          <li>
            Personal beefs, callout posts, or off-site drama imported here to
            score points.
          </li>
          <li>
            Anything that materially risks someone else&apos;s safety, privacy, or
            ability to participate (e.g. doxxing, threats, coordinated
            harassment).
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Voting and submissions</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>
            Upvote things that are{" "}
            <span className="font-medium">useful, insightful, or delightful</span>,
            not just things you agree with or that mention your friends.
          </li>
          <li>
            Downvote things that are off-topic, lazy, or clearly in bad faith,
            not merely because they challenge your views.
          </li>
          <li>
            It&apos;s fine to post your own work, but the site shouldn&apos;t feel like
            a marketing channel. If every other post you submit is about you or
            your company, you&apos;re overdoing it.
          </li>
          <li>
            Prefer original sources when sharing links. If you found something
            via a tweet or secondary blog post, link to the deeper source when
            possible.
          </li>
          <li>
            Titles should be informative, not clickbait. Avoid hype adjectives
            and ALL CAPS. Edit titles to be clearer, not more dramatic.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Anonymity, privacy, and safety
        </h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          The platform intentionally leans toward privacy and pseudonymity so
          that people can question assumptions, critique infrastructure, and
          have fun without an authority figure breathing down their neck. That
          only works if everyone treats it as a{" "}
          <span className="font-medium">trustworthy space</span>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>Don&apos;t out people, link accounts, or share private information.</li>
          <li>
            Don&apos;t ask others to disclose personal details that aren&apos;t clearly
            relevant to the topic.
          </li>
          <li>
            It&apos;s fine to use a throwaway identity for sensitive topics; it&apos;s
            not fine to spin up alts to astroturf, brigad, or evade moderation.
          </li>
          <li>
            If you see something that looks dangerous or crosses a serious line,
            reach out to moderators rather than trying to run your own
            investigation in public.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Comments and discussion
        </h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          The most important thing on the site is not the links but the
          conversation under them. Comments should make the thread{" "}
          <span className="font-medium">smarter, kinder, or more fun</span>.
          Drive-by dunks, pile-ons, or content-free negativity are discouraged.
        </p>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          Please read the{" "}
          <Link
            href="/comments-guidelines"
            className="underline-offset-2 hover:underline"
          >
            comment guidelines
          </Link>{" "}
          for more detail on how to participate well.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Moderation</h2>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          Moderation is an experiment, just like the rest of the Network State.
          The goal is to keep the quality high and the space safe without
          crushing weirdness or honest dissent. Moderators will remove content
          that is clearly off-topic, abusive, or unsafe. When that happens,
          treat it as feedback on fit rather than a referendum on your worth.
        </p>
        <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-200">
          The rules will evolve as the community grows. When in doubt, ask:
          would I still stand by this comment or post if someone screenshotted
          it a year from now? If the answer is yes, you&apos;re probably within
          bounds.
        </p>
      </section>
    </section>
  );
}