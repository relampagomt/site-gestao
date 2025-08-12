import { useState, useEffect, useCallback } from "react";

export default function ImagePreview({ src, alt = "Imagem", size = 56 }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const onKey = useCallback((e) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  if (!src) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  return (
    <>
      {/* thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block rounded-md overflow-hidden ring-1 ring-gray-200 hover:ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        style={{ width: size, height: size }}
        title="Clique para ampliar"
      >
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-100" />
        )}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </button>

      {/* modal */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-[90vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 rounded-full bg-white/90 text-gray-700 shadow px-3 py-1 text-sm hover:bg-white"
              aria-label="Fechar"
            >
              Fechar
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
