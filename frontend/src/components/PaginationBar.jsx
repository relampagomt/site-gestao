// frontend/src/components/PaginationBar.jsx
import React from "react";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils";

/**
 * Barra de paginação reutilizável (mobile-safe).
 *
 * Props:
 * - page: número da página atual (1-based)
 * - totalPages: total de páginas (>=1)
 * - onPrev: () => void
 * - onNext: () => void
 * - left: ReactNode (texto/elemento à esquerda, ex.: "Exibindo X de Y …")
 * - className: string (opcional)
 */
export default function PaginationBar({
  page = 1,
  totalPages = 1,
  onPrev,
  onNext,
  left,
  className,
}) {
  return (
    <div
      className={cn(
        // quebra em duas linhas no mobile para não estourar
        "flex flex-wrap items-center justify-between gap-2 sm:gap-3",
        className
      )}
    >
      {/* texto da esquerda ocupa a linha inteira no mobile */}
      <div className="order-2 sm:order-1 basis-full sm:basis-auto min-h-6">
        {left || <span className="text-xs text-transparent">.</span>}
      </div>

      {/* controles à direita */}
      <div className="order-1 sm:order-2 ml-auto flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 sm:h-9 px-3 sm:px-4 whitespace-nowrap"
          disabled={page <= 1}
          onClick={onPrev}
          aria-label="Página anterior"
          title="Anterior"
        >
          Anterior
        </Button>

        {/* chip Página n/n — compacto e não estoura */}
        <div
          className="shrink-0 text-[11px] sm:text-xs tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="inline-block rounded-md border bg-muted/60 px-2.5 py-1">
            Página <b>{page}</b>
            <span className="opacity-60">/{totalPages}</span>
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 sm:h-9 px-3 sm:px-4 whitespace-nowrap"
          disabled={page >= totalPages}
          onClick={onNext}
          aria-label="Próxima página"
          title="Próxima"
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
