// frontend/src/components/ScrollSafeArea.jsx
import React from "react";

/**
 * Área rolável para usar DENTRO de Dialog/Popover/Menu (Radix).
 * Bloqueia a propagação de wheel/scroll/touch para o overlay,
 * evitando "fechar sozinho" e permitindo rolar até o fim.
 */
export default function ScrollSafeArea({ className = "", children, ...rest }) {
  const stopAll = (e) => e.stopPropagation();
  return (
    <div
      className={className}
      onWheelCapture={stopAll}
      onScrollCapture={stopAll}
      onTouchMoveCapture={stopAll}
      {...rest}
    >
      {children}
    </div>
  );
}
