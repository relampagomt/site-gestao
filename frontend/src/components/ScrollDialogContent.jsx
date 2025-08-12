import React from "react";
import { DialogContent } from "@/components/ui/dialog.jsx";

/**
 * Envolve o conteúdo do Dialog com rolagem e padding.
 * - maxW: classes tailwind de largura, ex.: "max-w-xl", "max-w-2xl", "sm:max-w-[720px]"
 * - bodyClassName: classes extras no wrapper com rolagem
 * - className: classes extras no próprio DialogContent
 */
export default function ScrollDialogContent({
  children,
  maxW = "max-w-2xl",
  bodyClassName = "",
  className = "",
}) {
  return (
    <DialogContent className={`${maxW} p-0 ${className}`}>
      <div className={`max-h-[80vh] overflow-y-auto p-6 ${bodyClassName}`}>
        {children}
      </div>
    </DialogContent>
  );
}
