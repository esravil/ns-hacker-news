"use client";

type VoteTargetType = "thread" | "comment";

type VoteValue = -1 | 0 | 1;

interface VoteControlsProps {
  targetType: VoteTargetType;
  targetId: number;
  score: number;
  currentVote: VoteValue;
  onVote: (targetType: VoteTargetType, targetId: number, direction: 1 | -1) => void;
}

export function VoteControls({
  targetType,
  targetId,
  score,
  currentVote,
  onVote,
}: VoteControlsProps) {
  return (
    <div className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
      <button
        type="button"
        onClick={() => onVote(targetType, targetId, 1)}
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
          currentVote === 1
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900",
        ].join(" ")}
        aria-label="Upvote"
      >
        ▲
      </button>
      <span className="min-w-[1.5rem] text-center text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
        {score}
      </span>
      <button
        type="button"
        onClick={() => onVote(targetType, targetId, -1)}
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
          currentVote === -1
            ? "border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950/40 dark:text-red-200"
            : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900",
        ].join(" ")}
        aria-label="Downvote"
      >
        ▼
      </button>
    </div>
  );
}