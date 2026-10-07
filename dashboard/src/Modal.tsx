import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  title,
  onClose,
  children,
}: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[20px] border border-border bg-surface p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="mb-6 flex items-center justify-between">

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Configuration
            </p>

            <h2 className="text-lg font-semibold tracking-[-0.025em]">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-high text-sm text-text-dim transition-colors hover:bg-[#24272d] hover:text-text"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}