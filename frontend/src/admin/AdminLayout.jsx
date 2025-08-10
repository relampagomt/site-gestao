import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  Briefcase,
  Settings,
  Menu,
  X,
  LogOut,
  Package,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/clients', label: 'Clientes', icon: Users },
  { to: '/admin/materials', label: 'Materiais', icon: Package },
  { to: '/admin/actions', label: 'Ações', icon: Target },
  { to: '/admin/vacancies', label: 'Vagas', icon: Briefcase },
  { to: '/admin/settings', label: 'Configurações', icon: Settings },
];

const AdminLayout = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (to, exact = false) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    navigate('/login');
  };

  // trava/destrava o scroll do body quando o menu está aberto no mobile
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.classList.add('overflow-hidden');
    else root.classList.remove('overflow-hidden');
    return () => root.classList.remove('overflow-hidden');
  }, [open]);

  return (
    <div className="min-h-dvh bg-muted/20 text-foreground">
      {/* Overlay claro (não preto) no mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/admin" className="inline-flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="h-8 w-8 rounded-xl bg-primary/90 text-primary-foreground grid place-content-center font-semibold">
              R
            </div>
            <span className="font-semibold tracking-tight">Relâmpago</span>
          </Link>
          <button
            className="md:hidden rounded-lg p-2 hover:bg-muted"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`group mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition
                ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <Icon className={`h-4 w-4 ${active ? '' : 'text-muted-foreground'}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t p-3">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-8 w-8 place-content-center rounded-full bg-primary/10 text-primary">A</div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">Administrador</p>
                <p className="text-xs text-muted-foreground leading-tight truncate">Admin</p>
              </div>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-background"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Topbar (sem título duplicado) */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-3 px-4 md:pl-72">
          <button
            className="md:hidden rounded-lg p-2 hover:bg-muted"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <div className="rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              Administrador
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="md:pl-64">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
