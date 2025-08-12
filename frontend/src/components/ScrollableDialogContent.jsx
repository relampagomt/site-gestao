import React from "react";

/**
 * ScrollableDialogContent
 * Usa uma área com scroll vertical seguro para conteúdo grande em modais.
 * Exemplo de uso:
 * <DialogContent className="max-w-2xl p-0">
 *   <ScrollableDialogContent>
 *     ...seu formulário...
 *   </ScrollableDialogContent>
 * </DialogContent>
 */
export default function ScrollableDialogContent({ children, className = "" }) {
  return (
    <div
      className={[
        "max-h-[80vh] overflow-y-auto px-6 py-4",
        "scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent",
        className
      ].join(" ")}
    >
      {children}
    </div>
  );
}
