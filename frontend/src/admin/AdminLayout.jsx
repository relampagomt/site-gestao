// src/admin/AdminLayout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Menu as MenuIcon,
  X as XIcon,
  Home as HomeIcon,
  Users as UsersIcon,
  Package as PackageIcon,
  Activity as ActivityIcon,
  Briefcase as BriefcaseIcon,
  UserCog as UserCogIcon,
  ChevronsLeft as ChevronsLeftIcon,
  ChevronsRight as ChevronsRightIcon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/**
 * Item da navegação lateral
 */
function SideItem({ to, icon: Icon, label, end = false, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-red-50 text-red-700 border border-red-100"
            : "text-slate-700 hover:bg-slate-50",
        ].join(" ")
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

/**
 * Sidebar (desktop) com modo retrátil
 */
function Sidebar({ user, collapsed }) {
  const navItems = useMemo(
    () => [
      { to: "/admin", label: "Dashboard", icon: HomeIcon, end: true },
      { to: "/admin/clients", label: "Clientes", icon: UsersIcon },
      { to: "/admin/materials", label: "Materiais", icon: PackageIcon },
      { to: "/admin/actions", label: "Ações", icon: ActivityIcon },
      { to: "/admin/vacancies", label: "Vagas", icon: BriefcaseIcon },
      ...(user?.role === "admin" ? [{ to: "/admin/users", label: "Usuários", icon: UserCogIcon }] : []),
    ],
    [user?.role]
  );

  return (
    <aside className={`h-full border-r bg-white transition-[width] duration-200 ${collapsed ? "w-20" : "w-72"}`}>
      <div className="px-5 py-4 border-b">
        <div className={`text-2xl font-extrabold text-red-600 ${collapsed ? "text-center" : ""}`}>Relâmpago</div>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map(({ to, label, icon, end }) => (
          <SideItem key={to} to={to} label={label} icon={icon} end={end} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}

/**
 * Drawer (mobile) aproveita o mesmo Sidebar, mas sempre expandido
 */
function MobileDrawer({ open, onClose, user }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/20 md:hidden z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-lg md:hidden animate-in slide-in-from-left z-50">
        <div className="flex items-center justify-between border-b px-4 h-14">
          <div className="text-lg font-bold text-red-600">Relâmpago</div>
          <button className="admin-btn-secondary p-1.5" onClick={onClose} aria-label="Fechar menu">
            <XIcon size={18} />
          </button>
        </div>
        <div className="h-[calc(100%-56px)] overflow-y-auto">
          <Sidebar user={user} collapsed={false} />
        </div>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Persistência do estado do sidebar
  useEffect(() => {
    const saved = localStorage.getItem("admin.sidebarCollapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("admin.sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-dvh bg-slate-50 admin-no-overflow">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="admin-container">
          <div className="h-14 flex items-center justify-between">
            {/* Botão menu mobile */}
            <button
              className="md:hidden admin-btn-secondary"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <MenuIcon size={18} />
              <span className="text-sm">Menu</span>
            </button>

            {/* Status do usuário */}
            <div className="hidden md:flex items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </span>
              <span className="max-w-[200px] truncate">{user?.name || "Administrador"}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {user?.role === "admin" ? "Admin" : "Supervisor"}
              </span>
            </div>

            {/* Ações topo */}
            <div className="flex items-center gap-2">
              {/* Toggle retrátil (desktop) */}
              <button
                className="hidden md:inline-flex admin-btn-secondary"
                onClick={() => setCollapsed((v) => !v)}
                aria-label="Alternar sidebar"
                title="Alternar menu lateral"
              >
                {collapsed ? <ChevronsRightIcon size={18} /> : <ChevronsLeftIcon size={18} />}
              </button>

              <button className="admin-btn-secondary" onClick={logout}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="admin-container">
        <div className={`admin-main-layout`}>
          {/* Sidebar desktop */}
          <div className="hidden md:block">
            <Sidebar user={user} collapsed={collapsed} />
          </div>

          {/* Conteúdo */}
          <main className={`admin-content ${collapsed ? "md:pl-0" : ""}`}>
            {/* Breadcrumb simples */}
            <div className="mb-3 text-sm text-slate-500">
              Administrador ·{" "}
              <span className="capitalize">
                {location.pathname.replace("/admin", "").split("/")[1] || "Dashboard"}
              </span>
            </div>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Drawer mobile */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} user={user} />
    </div>
  );
}
