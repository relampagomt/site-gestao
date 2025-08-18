// frontend/src/admin/AdminLayout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Users, Package, ClipboardList, Wallet, Briefcase,
  LogOut, ChevronsLeft, ChevronsRight, Menu as MenuIcon, UserCog,
} from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";
import HealthBanner from "../components/HealthBanner";

function SideItem({ to, icon: Icon, label, end = false, collapsed = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
          "text-sm font-medium",
          isActive
            ? "bg-red-100 text-red-700"
            : "text-foreground/80 hover:text-foreground hover:bg-muted"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("admin.sidebarCollapsed") === "1"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mantém o estado no <html data-sidebar="..."> para o CSS calcular o padding
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-sidebar",
      collapsed ? "collapsed" : "expanded"
    );
    localStorage.setItem("admin.sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const menu = useMemo(() => {
    const base = [
      { to: "/admin", label: "Dashboard", icon: Home, end: true },
      { to: "/admin/materials", label: "Materiais", icon: Package },
      { to: "/admin/actions", label: "Ações", icon: ClipboardList },
      { to: "/admin/vacancies", label: "Vagas", icon: Briefcase },
    ];
    const adminOnly = [
      { to: "/admin/clients", label: "Clientes", icon: Users },
      { to: "/admin/finance", label: "Finanças", icon: Wallet },
      { to: "/admin/users", label: "Usuários", icon: UserCog },
    ];
    if (user?.role === "admin") {
      return [
        ...base.slice(0, 1),
        ...adminOnly.slice(0, 1),
        ...base.slice(1),
        ...adminOnly.slice(1),
      ];
    }
    return base;
  }, [user?.role]);

  const onLogout = async () => {
    try { if (typeof signOut === "function") await signOut(); }
    finally { navigate("/login", { replace: true }); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===== Sidebar Desktop (FIXA) ===== */}
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 border-r bg-card/50 flex-col",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64" // <- bate com --sidebar-w (64/256)
        )}
        aria-label="Menu lateral"
      >
        {/* Cabeçalho da Sidebar */}
        <div className={cn("h-16 flex items-center justify-between", collapsed ? "px-2" : "px-4")}>
          {collapsed ? (
            <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-red-600 rounded-md">
              <span className="text-lg font-bold text-red-600">R</span>
            </div>
          ) : (
            <div className="inline-flex items-center bg-white border-2 border-red-600 rounded-md px-3 py-1">
              <span className="font-bold text-red-600 text-xl tracking-wide">Relâmpago</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
          </Button>
        </div>

        {/* Navegação */}
        <nav className={cn("py-2 space-y-1 flex-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {menu.map((item) => (
            <SideItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      {/* ===== Backdrop + Sidebar Mobile (drawer) ===== */}
      <div
        className={cn("fixed inset-0 z-40 bg-black/60 md:hidden", mobileMenuOpen ? "block" : "hidden")}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-6 flex items-center">
          <div className="inline-flex items-center bg-white border-2 border-red-600 rounded-md px-3 py-1">
            <span className="font-bold text-red-600 text-lg tracking-wide">Relâmpago</span>
          </div>
        </div>
        <nav className="py-2 px-3 space-y-1 flex-1 overflow-y-auto">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                  isActive ? "bg-red-100 text-red-700" : "text-foreground/80 hover:text-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4">
          <Button variant="outline" className="w-full justify-center gap-2" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* ===== Conteúdo ===== */}
      <main className="app-main">
        {/* Header (fica alinhado com o conteúdo) */}
        <header className="h-16 border-b flex items-center justify-between px-4 sm:px-6 bg-background/60 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <MenuIcon className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-semibold hidden sm:block">
              {menu.find((m) => location.pathname.startsWith(m.to))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm bg-muted px-3 py-1 rounded-full">
              {user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Admin"}
            </div>
            <Button variant="outline" size="sm" onClick={onLogout} className="gap-2 hidden md:inline-flex" title="Sair">
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Sair</span>
            </Button>
          </div>
        </header>

        {/* Container centralizado e protegido contra overflow */}
        <div className="w-full min-w-0 max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
          <HealthBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
