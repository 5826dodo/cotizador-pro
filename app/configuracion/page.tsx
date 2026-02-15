'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Save, Upload, Hash, Phone, MapPin } from 'lucide-react';

export default function PerfilEmpresa() {
  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    const cargarDatosEmpresa = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Obtenemos el ID de la empresa desde el perfil del usuario
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id, empresas(*)')
          .eq('id', user.id)
          .single();

        if (perfil?.empresas) {
          setEmpresa(perfil.empresas);
        }
      }
      setLoading(false);
    };
    cargarDatosEmpresa();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('empresas')
      .update({
        nombre: empresa.nombre,
        rif: empresa.rif,
        telefono: empresa.telefono,
        direccion: empresa.direccion,
        logo_url: empresa.logo_url,
      })
      .eq('id', empresa.id);

    if (error) alert('Error al actualizar');
    else alert('✅ Datos de empresa actualizados');
  };

  if (loading) return <p>Cargando configuración...</p>;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">Mi Empresa</h1>
          <p className="text-slate-500 font-medium">
            Personaliza la información que aparece en tus PDFs
          </p>
        </header>

        <form
          onSubmit={handleUpdate}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-6"
        >
          {/* Logo Preview */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32 bg-slate-100 rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
              {empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 size={40} className="text-slate-300" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">
                Nombre Comercial
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
                  value={empresa.nombre || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, nombre: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">
                RIF / Identificación
              </label>
              <div className="relative">
                <Hash
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
                  value={empresa.rif || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, rif: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">
                Teléfono de Contacto
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
                  value={empresa.telefono || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, telefono: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">
                URL del Logo (Directo)
              </label>
              <div className="relative">
                <Upload
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  placeholder="https://tu-imagen.png"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
                  value={empresa.logo_url || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, logo_url: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">
                Dirección Física
              </label>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-4 text-slate-400"
                  size={20}
                />
                <textarea
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold h-24"
                  value={empresa.direccion || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, direccion: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <button className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-blue-700 transition-all">
            <Save /> GUARDAR CAMBIOS
          </button>
        </form>
      </div>
    </main>
  );
}
