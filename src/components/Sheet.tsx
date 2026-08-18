import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Bottom sheet rendered through a portal to <body>.
 *
 * Why a portal: any ancestor with a `transform` (our `.screen` entrance
 * animation leaves an identity transform behind under `animation-fill-mode:
 * both`) becomes the containing block for `position: fixed` children. Rendered
 * in-tree, the sheet anchored to the full page height and appeared thousands of
 * pixels below the fold — the backdrop covered the screen and the sheet was
 * invisible, which read as "the app went blank".
 */
export default function Sheet({
  children,
  onClose,
  maxHeight = "70vh",
}: {
  children: ReactNode;
  onClose: () => void;
  maxHeight?: string;
}) {
  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" style={{ maxHeight, overflowY: "auto" }} role="dialog" aria-modal="true">
        {children}
      </div>
    </>,
    document.body
  );
}
