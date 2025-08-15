// frontend/src/pages/NotFound.jsx
import React from "react";
import { Button } from "@/components/ui/button.jsx";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-muted-foreground">Página não encontrada.</p>
        <Button onClick={() => navigate("/")}>Ir para o início</Button>
      </div>
    </div>
  );
}
