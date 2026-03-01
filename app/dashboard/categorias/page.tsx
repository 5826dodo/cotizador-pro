'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Tag, Plus, Trash2, LayoutGrid, Loader2 } from 'lucide-react';

export default function GestionCategorias() {
  const supabase = createClient();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

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
    if (!nombre || !empresaId) return;
    const { data, error } = await supabase
      .from('categorias')
      .insert([{ nombre, empresa_id: empresaId }])
      .select()
      .single();

    if (!error) {
      setCategorias([...categorias, data]);
      setNombre('');
    }
  };

  const eliminarCategoria = async (id: string) => {
    const confirmacion = confirm(
      '¿Estás seguro? Los productos en esta categoría quedarán sin categoría asignada.',
    );
    if (!confirmacion) return;

    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (!error) {
      setCategorias(categorias.filter((c) => c.id !== id));
    }
  };

  if (loading)
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
          Categorías
        </h1>
        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-2">
          Organiza tu catálogo para tus clientes
        </p>
      </div>

      {/* Formulario de Creación */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Tag
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
            size={20}
          />
          <input
            type="text"
            placeholder="Ej: Bebidas, Postres, Hamburguesas..."
            className="w-full bg-slate-50 py-5 pl-14 pr-6 rounded-3xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-100 transition-all"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <button
          onClick={crearCategoria}
          className="w-full sm:w-auto bg-slate-900 text-white px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 transition-all shadow-lg"
        >
          <Plus size={18} /> Crear
        </button>
      </div>

      {/* Lista de Categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categorias.map((cat) => (
          <div
            key={cat.id}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-orange-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                <LayoutGrid size={20} />
              </div>
              <span className="font-black text-slate-800 uppercase text-sm tracking-tight">
                {cat.nombre}
              </span>
            </div>
            <button
              onClick={() => eliminarCategoria(cat.id)}
              className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {categorias.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30">
            <Tag size={60} className="mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">
              No has creado categorías todavía
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
