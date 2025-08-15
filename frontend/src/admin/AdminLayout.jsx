// frontend/src/admin/AdminLayout.jsx
import React, { useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Package,
  ClipboardList,
  Wallet,
  Briefcase,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";

/**
 * Item da navegação lateral
 */
function SideItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
          "text-sm font-medium",
          isActive
            ? "bg-red-100 text-red-700"
            : "text-foreground/80 hover:text-foreground hover:bg-muted"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

/**
 * Layout principal do painel Admin
 * - Sidebar com itens
 * - Header fixo
 * - <Outlet/> para as rotas filhas
 */
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth(); // precisa estar dentro de <AuthProvider>

  // Mapa de navegação — Configurações REMOVIDO, Usuários RESTAURADO
  const menu = useMemo(
    () => [
      { to: "/admin", label: "Dashboard", icon: Home, end: true },
      { to: "/admin/clients", label: "Clientes", icon: Users },
      { to: "/admin/materials", label: "Materiais", icon: Package },
      { to: "/admin/actions", label: "Ações", icon: ClipboardList },
      { to: "/admin/finance", label: "Finanças", icon: Wallet },
      { to: "/admin/vacancies", label: "Vagas", icon: Briefcase },
      { to: "/admin/users", label: "Usuários", icon: Users }, // ✅ restaurado
      // { to: "/admin/settings", label: "Configurações", icon: Settings }, // ❌ removido
    ],
    []
  );

  const onLogout = async () => {
    try {
      if (typeof signOut === "function") {
        await signOut();
      }
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card/50 hidden md:block">
          <div className="h-16 px-6 flex items-center text-xl font-bold text-red-600">
            Relâmpago
          </div>

          <nav className="px-3 py-2 space-y-1">
            {menu.map((item) => (
              <SideItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                end={item.end}
              />
            ))}
          </nav>

          <div className="px-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </aside>

        {/* Conteúdo */}
        <main className="flex-1">
          {/* Header */}
          <header className="h-16 border-b flex items-center justify-between px-4 sm:px-6 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              {/* Breadcrumb simples */}
              <h1 className="text-base sm:text-lg font-semibold">
                {location.pathname.startsWith("/admin") ? "Administrador" : "Painel"}
              </h1>
              <span className="hidden sm:inline text-muted-foreground">·</span>
              <span className="hidden sm:inline text-muted-foreground capitalize">
                {menu.find((m) => location.pathname.startsWith(m.to))?.label || "Dashboard"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs sm:text-sm bg-muted px-3 py-1 rounded-full">
                {user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Admin"}
              </div>
              <Button variant="ghost" size="sm" className="md:hidden" onClick={onLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </header>

          {/* Conteúdo das rotas filhas */}
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Sidebar mobile simples (opcional): se quiser, substitua por um Drawer */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {[
            { to: "/admin", icon: Home, label: "Início", end: true },
            { to: "/admin/actions", icon: ClipboardList, label: "Ações" },
            { to: "/admin/finance", icon: Wallet, label: "Finanças" },
            { to: "/admin/users", icon: Users, label: "Usuários" }, // atalho útil no mobile
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center py-2 text-xs",
                  isActive ? "text-red-600" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
