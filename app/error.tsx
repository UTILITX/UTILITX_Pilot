"use client";

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--utilitx-gray-50)] p-6 text-center">
      <div className="rounded-xl border border-[#d1d5db] bg-white p-8 shadow-lg">
        <p className="text-lg font-semibold text-gray-900">Something went wrong.</p>
        <p className="mt-2 text-sm text-gray-600">
          We captured the error and notified the team. You can retry the last action.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center rounded-md bg-black px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

