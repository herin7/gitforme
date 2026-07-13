import { useState } from 'react';

const NEW_URL = 'https://gitforme-jbsp.vercel.app/';

/**
 * Soft notice that gitforme.tech is moving to the new Vercel domain.
 * Shown to every visitor; dismissible for the session.
 */
export default function DomainShiftBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('gitforme-domain-shift-dismissed') === '1',
  );

  if (dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem('gitforme-domain-shift-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div
      className="w-full sticky top-0 z-[60] border-b-2 border-black bg-[#F9C79A] px-4 py-3 text-center text-sm text-gray-900 shadow-[0_2px_0_rgba(0,0,0,0.08)]"
      role="status"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span className="font-semibold">A little heads-up</span>
        <span className="text-gray-800">
          we&apos;re moving home soon — from{' '}
          <span className="font-mono text-xs sm:text-sm">gitforme.tech</span> to our new place at{' '}
          <a
            href={NEW_URL}
            className="font-semibold underline decoration-2 underline-offset-2 hover:text-black"
            target="_blank"
            rel="noopener noreferrer"
          >
            gitforme-jbsp.vercel.app
          </a>
          . Same GitForMe, just a new address. Thanks for sticking with us.
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="ml-1 rounded-md border border-black/20 bg-white/50 px-2 py-0.5 text-xs font-medium hover:bg-white"
          aria-label="Dismiss domain shift notice"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
