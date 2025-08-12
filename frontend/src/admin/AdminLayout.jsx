// frontend/src/admin/AdminLayout.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, Home, Users, Package, Activity, Briefcase, UserCog, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = ({
  onNavigate,
  onLogout,
  user,
  collapsed = false,
  hideBrand = false,
  showLogout = false, // ← habilita o botão Sair no rodapé (usado no mobile)
}) => {
  const navItems = [
    { to: "/admin", label: "Dashboard", icon: Home, end: true },
    { to: "/admin/clients", label: "Clientes", icon: Users },
    { to: "/admin/materials", label: "Materiais", icon: Package },
    { to: "/admin/actions", label: "Ações", icon: Activity },
    { to: "/admin/vacancies", label: "Vagas", icon: Briefcase },
    ...(String(user?.role).toLowerCase() === "admin"
      ? [{ to: "/admin/usuarios", label: "Usuários", icon: UserCog }]
      : []),
  ];

  return (
    <aside
      className={[
        "h-full border-r bg-white transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[4.5rem]" : "w-72",
      ].join(" ")}
    >
      {!hideBrand && (
        <div className="px-3 py-4 border-b">
          {collapsed ? (
            <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-600 text-white font-extrabold">
              R
            </div>
          ) : (
            <div className="text-2xl font-extrabold text-red-600">Relâmpago</div>
          )}
        </div>
      )}

      {/* Conteúdo do menu com rodapé fixo opcional */}
      <div className="h-[calc(100%-3.5rem)] md:h-auto flex flex-col">
        <nav className="p-3 space-y-1 flex-1 overflow-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              title={label}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")
              }
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Botão Sair fixo no rodapé do menu lateral quando showLogout = true (usado no mobile) */}
        {showLogout && (
          <div className="p-3 border-t">
            <button
              type="button"
              onClick={onLogout}
              className="w-full inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={18} />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default function AdminLayout() {
  // estado PERSISTENTE (funciona no dashboard e em todas as páginas)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("relampago.sidebarCollapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("relampago.sidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const { user } = useAuth();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // width da sidebar controlada por CSS var (garante que o Dashboard respeite o recolhimento)
  const asideWidth = sidebarCollapsed ? "4.5rem" : "18rem";

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-[1400px] px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile abre drawer */}
            <button
              type="button"
              className="md:hidden inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={18} />
              <span className="text-sm">Menu</span>
            </button>

            {/* Desktop recolhe/expande (AGORA GLOBAL) */}
            <button
              type="button"
              className="hidden md:inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-pressed={sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              title={sidebarCollapsed ? "Expandir" : "Recolher"}
            >
              <Menu size={18} />
              <span className="text-sm">{sidebarCollapsed ? "Expandir" : "Menu"}</span>
            </button>
          </div>

          {/* Ações desktop (inclui Sair) */}
          <div className="hidden md:flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </span>
            <span>{user?.name || "Administrador"}</span>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={logout}
              aria-label="Sair"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Corpo */}
      <div className="mx-auto max-w-[1400px] px-4">
        {/* Grid com largura da sidebar controlada por var (funciona em qualquer página, inclusive Dashboard) */}
        <div
          className="grid grid-cols-1 gap-6 py-6 md:[grid-template-columns:var(--aside-w)_1fr]"
          style={{ ["--aside-w"]: asideWidth }}
        >
          {/* Sidebar desktop */}
          <div className="hidden md:block">
            <Sidebar user={user} collapsed={sidebarCollapsed} />
          </div>

          {/* Conteúdo */}
          <main className="min-h-[70dvh]">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-lg md:hidden animate-in slide-in-from-left flex flex-col">
            <div className="flex items-center justify-between border-b px-4 h-14">
              <div className="text-lg font-bold text-red-600">Relâmpago</div>
              <button
                type="button"
                className="rounded-md border p-1.5"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sidebar mobile com botão Sair no rodapé */}
            <div className="flex-1 overflow-hidden">
              <Sidebar
                user={user}
                onNavigate={() => setMobileOpen(false)}
                onLogout={logout}
                hideBrand
                showLogout
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
