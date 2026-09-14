import { PERMISSIONS, useAuthorization } from '@/lib/permissions';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';

interface Props extends PropsWithChildren {
    title?: string;
}

type NavLink = {
    href: string;
    label: string;
    active: (url: string) => boolean;
    visible: boolean;
};

type AdminLink = Omit<NavLink, 'visible'> & { visible: boolean };

export default function DashboardLayout({ children, title }: Props) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const page = usePage();
    const { url } = page;
    const { auth, flash } = page.props as any;
    const { has } = useAuthorization();
    const roleId = Number(auth?.user?.role_id ?? 0);

    const canManageCatalogs = has(PERMISSIONS.adminCatalogsManage);
    const canManageUsers = has(PERMISSIONS.usersManage);
    const canViewDashboard = has(PERMISSIONS.financeDashboardView);
    const canViewMetrics = has(PERMISSIONS.financeMetricsView);
    const canViewMovements = has(PERMISSIONS.financeMovementsView);
    const canViewReports = has(PERMISSIONS.financeReportsView);
    const isTaller = roleId === 3;
    const ordersHref = isTaller ? '/taller/ots' : '/ordenes';

    const mainLinks = useMemo<NavLink[]>(
        () => [
            {
                href: '/admin',
                label: 'Panel de Control',
                active: (currentUrl) =>
                    currentUrl.startsWith('/admin') && !currentUrl.startsWith('/admin/users') && !currentUrl.startsWith('/admin/metrics'),
                visible: canViewDashboard,
            },
            {
                href: '/egresos',
                label: 'Egresos',
                active: (currentUrl) => currentUrl.startsWith('/egresos'),
                visible: canViewMovements,
            },
            {
                href: '/ingresos',
                label: 'Ingresos',
                active: (currentUrl) => currentUrl.startsWith('/ingresos'),
                visible: canViewMovements,
            },
            {
                href: '/resumen-del-dia',
                label: 'Resumen del día',
                active: (currentUrl) => currentUrl.startsWith('/resumen-del-dia'),
                visible: canViewReports && !isTaller,
            },
            {
                href: ordersHref,
                label: 'Órdenes de Trabajo',
                active: (currentUrl) =>
                    currentUrl.startsWith('/ordenes') || currentUrl.startsWith('/taller/ots') || currentUrl.startsWith('/taller/ordenes'),
                visible: true,
            },
        ],
        [canViewDashboard, canViewMovements, canViewReports, isTaller, ordersHref],
    );

    const adminLinks = useMemo<AdminLink[]>(
        () => [
            { href: '/clientes', label: 'Clientes', active: (currentUrl) => currentUrl.startsWith('/clientes'), visible: canManageCatalogs },
            {
                href: '/catalogo-vehiculos',
                label: 'Vehículos',
                active: (currentUrl) => currentUrl.startsWith('/catalogo-vehiculos'),
                visible: canManageCatalogs,
            },
            {
                href: '/companias-seguros',
                label: 'Seguros',
                active: (currentUrl) => currentUrl.startsWith('/companias-seguros'),
                visible: canManageCatalogs,
            },
            { href: '/articulos', label: 'Artículos', active: (currentUrl) => currentUrl.startsWith('/articulos'), visible: canManageCatalogs },
            {
                href: '/marcas-articulos',
                label: 'Marcas de Artículos',
                active: (currentUrl) => currentUrl.startsWith('/marcas-articulos'),
                visible: canManageCatalogs,
            },
            {
                href: '/medio-de-pago',
                label: 'Medios de pago',
                active: (currentUrl) => currentUrl.startsWith('/medio-de-pago'),
                visible: canManageCatalogs,
            },
            { href: '/conceptos', label: 'Conceptos', active: (currentUrl) => currentUrl.startsWith('/conceptos'), visible: canManageCatalogs },
            { href: '/admin/metrics', label: 'Métricas', active: (currentUrl) => currentUrl.startsWith('/admin/metrics'), visible: canViewMetrics },
            { href: '/admin/users', label: 'Usuarios', active: (currentUrl) => currentUrl.startsWith('/admin/users'), visible: canManageUsers },
        ],
        [canManageCatalogs, canManageUsers, canViewMetrics],
    );

    const visibleMainLinks = mainLinks.filter((link) => link.visible);
    const visibleAdminLinks = adminLinks.filter((link) => link.visible);
    const showAdminMenu = visibleAdminLinks.length > 0;
    const roleLabel = auth?.user?.role ?? 'Usuario';

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        if (!showAdminMenu) {
            setAdminDropdownOpen(false);
        }
    }, [showAdminMenu]);

    const linkClass = (active: boolean) =>
        `rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
            active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-700 hover:bg-gray-100'
        }`;

    const dropdownLinkClass = (active: boolean) =>
        `block px-4 py-2 text-sm hover:bg-gray-50 ${active ? 'font-medium text-orange-600' : 'text-gray-700'}`;

    const renderMainLinks = (compact = false) =>
        visibleMainLinks.map((link) => (
            <Link
                key={link.href}
                href={link.href}
                className={
                    compact
                        ? `rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                              link.active(url) ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                          }`
                        : linkClass(link.active(url))
                }
            >
                {compact && link.label === 'Panel de Control' ? 'Panel' : compact && link.label === 'Órdenes de Trabajo' ? 'Órdenes' : link.label}
            </Link>
        ));

    const renderAdminLinks = (onClick?: () => void, mobile = false) =>
        visibleAdminLinks.map((link) => (
            <Link
                key={link.href}
                href={link.href}
                onClick={onClick}
                className={
                    mobile
                        ? `block rounded-lg px-4 py-2 font-semibold ${link.active(url) ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-100'}`
                        : dropdownLinkClass(link.active(url))
                }
            >
                {link.label}
            </Link>
        ));

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 5000,
                    style: { background: '#1f2937', color: '#fff' },
                    success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />

            <nav className="relative z-50 border-b border-gray-200 bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </div>
                            <div className="hidden lg:block">
                                <h1 className="text-l font-bold text-gray-900">Sistema de Gestión Integral</h1>
                                <p className="text-xs text-gray-500">{roleLabel}</p>
                            </div>
                        </div>

                        <div className="hidden items-center gap-2 lg:flex">
                            <div className="flex items-center gap-2">{renderMainLinks()}</div>

                            {showAdminMenu && (
                                <div className="relative">
                                    <button
                                        onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                                        className="flex items-center gap-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-200"
                                    >
                                        Administración
                                    </button>

                                    {adminDropdownOpen && (
                                        <div className="absolute top-full right-0 z-50 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                            {renderAdminLinks()}
                                        </div>
                                    )}
                                </div>
                            )}

                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="ml-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                            >
                                Salir
                            </Link>
                        </div>

                        <div className="hidden items-center gap-2 md:flex lg:hidden">
                            <div className="flex items-center gap-2">{renderMainLinks(true)}</div>

                            {showAdminMenu && (
                                <div className="relative">
                                    <button
                                        onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-200"
                                    >
                                        Más
                                    </button>

                                    {moreMenuOpen && (
                                        <div className="absolute top-full right-0 z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                            <div className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Administración</div>
                                            {renderAdminLinks(() => setMoreMenuOpen(false))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                            >
                                Salir
                            </Link>
                        </div>

                        <div className="flex items-center md:hidden">
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2 text-gray-700 hover:bg-gray-100">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="border-t border-gray-200 bg-white md:hidden">
                        <div className="space-y-1 px-4 py-2">
                            {visibleMainLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`block rounded-lg px-4 py-2 font-semibold ${link.active(url) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {showAdminMenu && (
                                <>
                                    <div className="my-2 border-t border-gray-200"></div>
                                    <div className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Administración</div>
                                    {renderAdminLinks(undefined, true)}
                                </>
                            )}

                            <div className="my-2 border-t border-gray-200"></div>
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="block w-full rounded-lg px-4 py-2 text-left font-semibold text-red-600 hover:bg-red-50"
                            >
                                Salir
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            <main className="flex-1">
                <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
                    {title && <h2 className="mb-4 text-2xl font-bold text-gray-800">{title}</h2>}
                    {children}
                </div>
            </main>

            <footer className="mt-auto border-t border-gray-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">© 2025 Yets Solutions - Todos los derechos reservados</p>
                </div>
            </footer>
        </div>
    );
}
