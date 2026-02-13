'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
// Importa tus componentes de formulario o iconos aquí (Lucide, etc)

export default function DashboardPage() {
  const supabase = createClient();
  const [productos, setProductos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      // 1. Obtenemos el usuario y su empresa_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: p } = await supabase
        .from('perfiles')
        .select('*, empresas(*)')
        .eq('id', user?.id)
        .single();

      setPerfil(p);

      // 2. Cargamos los productos filtrados por su empresa
      if (p?.empresa_id) {
        const { data: prod } = await supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', p.empresa_id)
          .order('nombre', { ascending: true });

        setProductos(prod || []);
      }
      setCargando(false);
    };
    cargarDatos();
  }, []);

  // --- AQUÍ PEGA TUS FUNCIONES DE AGREGAR, EDITAR Y ELIMINAR ---
  // IMPORTANTE: En el 'insert', asegúrate de incluir: empresa_id: perfil.empresa_id

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 italic uppercase tracking-tighter">
          Inventario: {perfil?.empresas?.nombre}
        </h1>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
          Gestión de Stock y Precios
        </p>
      </header>

      {/* AQUÍ PEGA TU FORMULARIO DE "AGREGAR PRODUCTO" */}
      {/* Recuerda que al guardar debe ir con el empresa_id del perfil */}

      {/* AQUÍ PEGA TU TABLA/GRID DE PRODUCTOS (El CRUD que ya tenías) */}
      <div className="mt-8">
        {cargando ? (
          <p>Cargando inventario...</p>
        ) : (
          <div className="grid gap-4">
            {/* Tu mapeo de productos anterior aquí */}
            {productos.map((prod) => (
              <div
                key={prod.id}
                className="bg-white p-4 rounded-xl border flex justify-between"
              >
                <span>{prod.nombre}</span>
                <span className="font-bold">${prod.precio}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
