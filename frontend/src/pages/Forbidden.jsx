// frontend/src/pages/Forbidden.jsx
import React from "react";
import { Button } from "@/components/ui/button.jsx";
import { useNavigate } from "react-router-dom";

export default function Forbidden() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">403</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    </div>
  );
}
