import React, { useEffect, useState } from "react";
import { Head, useForm, router } from "@inertiajs/react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Search, Plus, X, AlertTriangle, Bookmark } from "lucide-react";
import DeleteButton from "@/components/botones/boton-eliminar";
import EditButton from "@/components/botones/boton-editar";

type MarcaArticulo = {
  id: number;
  nombre: string;
  created_at?: string;
};

type PageProps = {
  marcas: {
    data: MarcaArticulo[];
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
  };
  filters: {
    search?: string;
  };
};

export default function MarcasArticulosIndex({ marcas, filters }: PageProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MarcaArticulo | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState<MarcaArticulo | null>(null);

  const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
    nombre: "",
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      router.get(
        "/marcas-articulos",
        { search: search || undefined },
        { preserveState: true, preserveScroll: true }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const openCreateModal = () => {
    reset();
    clearErrors();
    setEditing(null);
    setShowModal(true);
  };

  const openEditModal = (m: MarcaArticulo) => {
    clearErrors();
    setEditing(m);
    setData("nombre", m.nombre);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    reset();
    clearErrors();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      put(`/marcas-articulos/${editing.id}`, { onSuccess: closeModal });
    } else {
      post("/marcas-articulos", { onSuccess: closeModal });
    }
  };

  const openDeleteModal = (m: MarcaArticulo) => {
    setDeleting(m);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;

    router.delete(`/marcas-articulos/${deleting.id}`, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setDeleting(null);
      },
    });
  };

  return (
    <DashboardLayout>
      <Head title="Marcas de Artículos" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bookmark className="h-7 w-7 text-green-600" />
              <h1 className="text-2xl font-bold text-slate-800">Marcas de Artículos</h1>
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              Administrá el catálogo general de marcas para repuestos y artículos
            </p>
          </div>
        </div>

        {/* Barra de Búsqueda y Botón Agregar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>

          <div className="flex-1 hidden md:block" />

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition"
          >
            <Plus className="h-4 w-4" />
            Agregar Marca
          </button>
        </div>

        {/* Tabla de Listado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {marcas.data.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No se encontraron marcas de artículos.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nombre de la Marca
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marcas.data.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-slate-800 text-sm">
                      {m.nombre}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <EditButton onClick={() => openEditModal(m)} />
                        <DeleteButton onClick={() => openDeleteModal(m)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-center text-sm text-slate-400 mt-4">
          Total: {marcas.total} marca{marcas.total !== 1 ? "s" : ""} registrada{marcas.total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? "Editar Marca de Artículo" : "Nueva Marca de Artículo"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Nombre de la Marca *
                </label>
                <input
                  type="text"
                  value={data.nombre}
                  onChange={(e) => setData("nombre", e.target.value)}
                  placeholder="Ej: Pilkington, Sekurit, Fuyao..."
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition focus:ring-2 focus:ring-green-500 ${
                    errors.nombre ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                  autoFocus
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1 font-medium">{errors.nombre}</p>}
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-slate-300 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-100 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition shadow text-sm disabled:opacity-50"
                >
                  {processing ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteModal && deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="font-bold text-slate-800 text-lg">¿Eliminar marca?</h3>
            <p className="text-slate-600 text-sm">
              ¿Estás seguro de eliminar la marca <strong className="text-slate-900">"{deleting.nombre}"</strong>?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-slate-300 py-2.5 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition shadow text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
