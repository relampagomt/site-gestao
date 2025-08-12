// src/admin/AdminLayout.jsx
import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, Home, Users, Package, Activity, Briefcase, Settings, UserCog } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = ({ onNavigate, user }) => {
  const navItems = [
    { to: "/admin", label: "Dashboard", icon: Home, end: true },
    { to: "/admin/clients", label: "Clientes", icon: Users },
    { to: "/admin/materials", label: "Materiais", icon: Package },
    { to: "/admin/actions", label: "Ações", icon: Activity },
    { to: "/admin/vacancies", label: "Vagas", icon: Briefcase },
    { to: "/admin/settings", label: "Configurações", icon: Settings },
    // Só mostra "Usuários" para admin
    ...(user?.role === "admin" ? [{ to: "/admin/usuarios", label: "Usuários", icon: UserCog }] : []),
  ];

  return (
    <aside className="h-full w-72 border-r bg-white">
      <div className="px-5 py-4 border-b">
        <div className="text-2xl font-extrabold text-red-600">Relâmpago</div>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                isActive ? "bg-red-50 text-red-700 border border-red-100" : "text-slate-700 hover:bg-slate-50",
              ].join(" ")
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Topbar (sem título de página!) */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-[1400px] px-4 h-14 flex items-center justify-between">
          <button
            className="md:hidden inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
            <span className="text-sm">Menu</span>
          </button>

          <div className="hidden md:flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </span>
            <span>{user?.name || "Administrador"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {user?.role === "admin" ? "Admin" : "Supervisor"}
            </span>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            onClick={logout}
            aria-label="Sair"
          >
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-6 py-6">
          {/* Sidebar desktop */}
          <div className="hidden md:block">
            <Sidebar user={user} />
          </div>

          {/* Conteúdo */}
          <main className="min-h-[70dvh]">
            {/* >>> Os títulos ficam DENTRO de cada página (Dashboard, Clientes, etc.) <<< */}
            <Outlet />
          </main>
        </div>
      </div>

      {/* Drawer mobile (sem fundo preto) */}
      {mobileOpen && (
        <>
          {/* overlay TRANSPARENTE – troque para bg-black/10 se quiser um leve véu */}
          <div
            className="fixed inset-0 bg-transparent md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-lg md:hidden animate-in slide-in-from-left">
            <div className="flex items-center justify-between border-b px-4 h-14">
              <div className="text-lg font-bold text-red-600">Relâmpago</div>
              <button
                className="rounded-md border p-1.5"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>
            <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
