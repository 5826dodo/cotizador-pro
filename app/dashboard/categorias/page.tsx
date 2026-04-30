'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Tag,
  Plus,
  Trash2,
  Loader2,
  Edit2,
  Check,
  X,
  Search,
  ArrowRight,
} from 'lucide-react';

export default function GestionCategorias() {
  const supabase = createClient();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id')
          .eq('id', user.id)
          .single();
        setEmpresaId(perfil?.empresa_id);

        if (perfil?.empresa_id) {
          const { data } = await supabase
            .from('categorias')
            .select('*')
            .eq('empresa_id', perfil.empresa_id)
            .order('nombre', { ascending: true });
          setCategorias(data || []);
        }
      }
      setLoading(false);
    };
    cargarDatos();
  }, []);

  const crearCategoria = async () => {
    if (!nombre.trim() || !empresaId) return;
    const { data, error } = await supabase
      .from('categorias')
      .insert([{ nombre: nombre.trim(), empresa_id: empresaId }])
      .select()
      .single();

    if (!error) {
      setCategorias(
        [...categorias, data].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setNombre('');
    }
  };

  const actualizarCategoria = async (id: string) => {
    if (!nombreEditado.trim()) return;

    const { error } = await supabase
      .from('categorias')
      .update({ nombre: nombreEditado.trim() })
      .eq('id', id);

    if (!error) {
      setCategorias(
        categorias.map((c) =>
          c.id === id ? { ...c, nombre: nombreEditado.trim() } : c,
        ),
      );
      setEditandoId(null);
    }
  };

  const eliminarCategoria = async (id: string) => {
    const { count, error: countError } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria_id', id);

    if (count && count > 0) {
      alert(
        `No puedes eliminar esta categoría porque tiene ${count} productos asociados. Cámbialos de categoría antes de borrarla.`,
      );
      return;
    }

    const confirmacion = confirm(
      '¿Estás seguro de eliminar esta categoría vacía?',
    );
    if (confirmacion) {
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (!error) setCategorias(categorias.filter((c) => c.id !== id));
    }
  };

  const categoriasFiltradas = categorias.filter((cat) =>
    cat.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  if (loading)
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Tag size={20} className="text-orange-600" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Categorías
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-[52px]">
            Organiza y gestiona las categorías de tu catálogo
          </p>
        </div>

        {/* Formulario de Creación */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Tag
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Nombre de la categoría"
                className="w-full bg-slate-50 py-3 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 focus:border-orange-400 transition-colors"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && crearCategoria()}
              />
            </div>
            <button
              onClick={crearCategoria}
              disabled={!nombre.trim()}
              className="sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        {categorias.length > 0 && (
          <div className="relative mb-5">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar categoría..."
              className="w-full bg-white py-3 pl-12 pr-4 rounded-xl text-sm text-slate-700 border border-slate-200 focus:border-orange-400 transition-colors"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        )}

        {/* Lista de Categorías */}
        <div className="space-y-2">
          {categoriasFiltradas.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between group hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                  <Tag size={16} />
                </div>

                {editandoId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-orange-400"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && actualizarCategoria(cat.id)
                      }
                    />
                    <button
                      onClick={() => actualizarCategoria(cat.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <span className="font-medium text-slate-800 text-sm truncate">
                    {cat.nombre}
                  </span>
                )}
              </div>

              {editandoId !== cat.id && (
                <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditandoId(cat.id);
                      setNombreEditado(cat.nombre);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => eliminarCategoria(cat.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {categoriasFiltradas.length === 0 && categorias.length > 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              No se encontraron categorías con ese nombre
            </div>
          )}

          {categorias.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Tag size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">
                No hay categorías aún
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Crea tu primera categoría arriba
              </p>
            </div>
          )}
        </div>

        {/* Footer con conteo */}
        {categorias.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <span>
              {categorias.length}{' '}
              {categorias.length === 1 ? 'categoría' : 'categorías'}
            </span>
            <span className="flex items-center gap-1">
              Presiona Enter para crear rápido
              <ArrowRight size={12} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
