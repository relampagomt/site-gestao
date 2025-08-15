// frontend/src/admin/AdminLayout.jsx
import React, { useMemo, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Package,
  ClipboardList,
  Wallet,
  Briefcase,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Menu as MenuIcon,
  X as XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";

/** Item da navegação lateral */
function SideItem({ to, icon: Icon, label, end = false, collapsed = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
          "text-sm font-medium",
          isActive ? "bg-red-100 text-red-700" : "text-foreground/80 hover:text-foreground hover:bg-muted"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

/** Layout principal do painel Admin */
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  // Retrátil (desktop) + persistência e drawer (mobile)
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin.sidebarCollapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("admin.sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Mapa de navegação (rotas mantidas)
  const menu = useMemo(
    () => [
      { to: "/admin", label: "Dashboard", icon: Home, end: true },
      { to: "/admin/clients", label: "Clientes", icon: Users },
      { to: "/admin/materials", label: "Materiais", icon: Package },
      { to: "/admin/actions", label: "Ações", icon: ClipboardList },
      { to: "/admin/finance", label: "Finanças", icon: Wallet },
      { to: "/admin/vacancies", label: "Vagas", icon: Briefcase },
      { to: "/admin/users", label: "Usuários", icon: Users },
    ],
    []
  );

  const onLogout = async () => {
    try {
      if (typeof signOut === "function") await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Sidebar DESKTOP (retrátil) */}
        <aside
          className={cn(
            "hidden md:block border-r bg-card/50 transition-[width] duration-200",
            collapsed ? "w-20" : "w-64"
          )}
        >
          <div
            className={cn(
              "h-16 px-6 flex items-center text-xl font-bold text-red-600",
              collapsed && "justify-center text-lg px-0"
            )}
          >
            {collapsed ? "R" : "Relâmpago"}
          </div>

          <nav className={cn("py-2 space-y-1", collapsed ? "px-2" : "px-3")}>
            {menu.map((item) => (
              <SideItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                end={item.end}
                collapsed={collapsed}
              />
            ))}
          </nav>

          <div className={cn("px-4 py-4", collapsed && "px-2")}>
            <Button
              variant="outline"
              className={cn("w-full justify-center gap-2", collapsed && "px-2")}
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </div>
        </aside>

        {/* Drawer MOBILE */}
        <div className="md:hidden">
          {mobileOpen && (
            <>
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
              <div className="fixed inset-y-0 left-0 w-72 bg-card/95 backdrop-blur shadow-lg z-50">
                <div className="h-16 px-4 border-b flex items-center justify-between">
                  <div className="text-lg font-bold text-red-600">Relâmpago</div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                    <XIcon className="w-5 h-5" />
                  </Button>
                </div>
                <nav className="px-3 py-2 space-y-1">
                  {menu.map((item) => (
                    <SideItem
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
                <div className="px-4 py-4">
                  <Button variant="outline" className="w-full justify-center gap-2" onClick={onLogout}>
                    <LogOut className="w-4 h-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Conteúdo */}
        <main className="flex-1">
          {/* Header */}
          <header className="h-16 border-b flex items-center justify-between px-4 sm:px-6 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              {/* Hambúrguer (MOBILE) */}
              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
                title="Menu"
              >
                <MenuIcon className="w-4 h-4" />
              </Button>

              {/* Toggle retrátil (DESKTOP) */}
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
              </Button>

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

          {/* ===== CONTEÚDO CENTRALIZADO (duplo wrapper garante centro em qualquer largura) ===== */}
          <div className="p-4 sm:p-6">
            {/* 1º wrapper: limita largura e adiciona padding lateral */}
            <div className="mx-auto w-full max-w-[860px] px-4">
              {/* 2º wrapper: força alinhamento central até mesmo quando filhos usam w-full */}
              <div className="mx-auto w-full max-w-[720px]">
                <Outlet />
              </div>
            </div>
          </div>
          {/* ===== FIM ===== */}
        </main>
      </div>

      {/* Footer nav REMOVIDO a pedido */}
    </div>
  );
}
