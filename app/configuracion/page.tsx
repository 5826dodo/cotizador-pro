'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  Save,
  Upload,
  Hash,
  Phone,
  MapPin,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Settings,
  Info,
  CheckCircle2,
} from 'lucide-react';

export default function PerfilEmpresa() {
  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [configGlobal, setConfigGlobal] = useState({
    notificaciones_stock: true,
    mostrar_bcv: true,
    permitir_ventas_sin_stock: false,
  });

  useEffect(() => {
    const cargarDatosEmpresa = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
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

  // Función para manejar la subida del logo a Storage
  const subirLogo = async (file: File, empresaId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${empresaId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubiendo(true);

    try {
      let finalLogoUrl = empresa.logo_url;

      // Si hay un nuevo archivo seleccionado, lo subimos primero
      if (file) {
        finalLogoUrl = await subirLogo(file, empresa.id);
      }

      const { error } = await supabase
        .from('empresas')
        .update({
          nombre: empresa.nombre,
          rif: empresa.rif,
          telefono: empresa.telefono,
          direccion: empresa.direccion,
          logo_url: finalLogoUrl,
        })
        .eq('id', empresa.id);

      if (error) throw error;

      setEmpresa({ ...empresa, logo_url: finalLogoUrl });
      setFile(null); // Limpiamos el archivo temporal
      alert('✅ Datos de empresa actualizados');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  if (loading)
    return (
      <p className="p-10 text-center font-bold">Cargando configuración...</p>
    );

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">Mi Empresa</h1>
          <p className="text-slate-500 font-medium">
            Personaliza la información que aparece en tus PDFs
          </p>
        </header>

        {!empresa?.nombre || !empresa?.rif ? (
          <div className="bg-orange-500 text-white p-6 rounded-[2rem] mb-8 flex items-center gap-4 shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-tighter text-white">
                Paso 1: Configura tu negocio
              </h3>
              <p className="text-xs opacity-90 font-bold text-white/90">
                Completa el nombre y RIF para que tus facturas salgan
                profesionales.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-[1.5rem] mb-8 flex items-center gap-3 border border-emerald-100">
            <CheckCircle2 size={20} />
            <span className="text-[10px] font-black uppercase">
              ¡Tu cuenta está configurada y lista para vender!
            </span>
          </div>
        )}

        <form
          onSubmit={handleUpdate}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-6"
        >
          {/* SECCIÓN LOGO MEJORADA */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-40 h-40 bg-slate-100 rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
              {file ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="w-full h-full object-contain p-2"
                />
              ) : empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Building2 size={40} className="text-slate-300" />
              )}
            </div>

            <label className="cursor-pointer bg-slate-100 px-6 py-2 rounded-full font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2 text-slate-600">
              <Upload size={16} />
              {empresa.logo_url || file ? 'Cambiar Logo' : 'Subir Logo'}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
              />
            </label>
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

            {/* Dirección a ancho completo */}
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
          <div className="md:col-span-2 mt-8">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={16} /> Preferencias del Sistema
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ejemplo de Switch para activar/desactivar función */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${configGlobal.notificaciones_stock ? 'border-orange-100 bg-orange-50/30' : 'border-slate-100 bg-white'}`}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-700">
                    Alertas de Inventario
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Notificar cuando el stock sea bajo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfigGlobal({
                      ...configGlobal,
                      notificaciones_stock: !configGlobal.notificaciones_stock,
                    })
                  }
                  className={`transition-colors ${configGlobal.notificaciones_stock ? 'text-orange-500' : 'text-slate-300'}`}
                >
                  {configGlobal.notificaciones_stock ? (
                    <ToggleRight size={32} />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </button>
              </div>

              <div
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${configGlobal.mostrar_bcv ? 'border-orange-100 bg-orange-50/30' : 'border-slate-100 bg-white'}`}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-700">
                    Tasa BCV Automática
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Mostrar conversión en el punto de venta
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfigGlobal({
                      ...configGlobal,
                      mostrar_bcv: !configGlobal.mostrar_bcv,
                    })
                  }
                  className={`transition-colors ${configGlobal.mostrar_bcv ? 'text-orange-500' : 'text-slate-300'}`}
                >
                  {configGlobal.mostrar_bcv ? (
                    <ToggleRight size={32} />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            disabled={subiendo}
            className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {subiendo ? <Loader2 className="animate-spin" /> : <Save />}
            {subiendo ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </form>
      </div>
    </main>
  );
}
