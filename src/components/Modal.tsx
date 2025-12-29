import { ReactNode, useEffect } from "react";

export default function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="text-base font-extrabold text-slate-900">{title}</div>
            <button className="btn-secondary" onClick={onClose}>
              Закрыть
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? <div className="border-t border-slate-100 px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
