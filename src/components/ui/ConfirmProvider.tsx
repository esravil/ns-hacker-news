"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | undefined>(
  undefined
);

interface ConfirmProviderProps {
  children: ReactNode;
}

/**
 * ConfirmProvider renders a simple centered confirmation dialog.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Delete account?",
 *     description: "This cannot be undone.",
 *     confirmLabel: "Delete",
 *   });
 */
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: {},
    resolve: null,
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      });
    });
  };

  const handleClose = (value: boolean) => {
    setState((prev) => {
      if (prev.resolve) {
        prev.resolve(value);
      }
      return {
        ...prev,
        open: false,
        resolve: null,
      };
    });
  };

  const { title, description, confirmLabel, cancelLabel } = {
    title: state.options.title ?? "Are you sure?",
    description: state.options.description,
    confirmLabel: state.options.confirmLabel ?? "Confirm",
    cancelLabel: state.options.cancelLabel ?? "Cancel",
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            {description && (
              <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            )}
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-red-50 shadow-sm hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx.confirm;
}