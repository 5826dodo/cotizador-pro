'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client'; // Asegúrate de que esta ruta sea la correcta en tu proyecto
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
  ArrowRight,
} from 'lucide-react';

export default function PerfilEmpresa() {
  const router = useRouter();
  const supabase = createClient();

  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [exito, setExito] = useState(false);

  // Estado para las preferencias
  const [configGlobal, setConfigGlobal] = useState({
    notificaciones_stock: true,
    mostrar_bcv: true,
    permitir_ventas_sin_stock: false,
    moneda_secundaria: 'BS',
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
          // Sincronizamos los switches con lo que viene de la base de datos
          setConfigGlobal({
            notificaciones_stock: perfil.empresas.notificaciones_stock ?? true,
            mostrar_bcv: perfil.empresas.mostrar_bcv ?? true,
            permitir_ventas_sin_stock:
              perfil.empresas.permitir_ventas_sin_stock ?? false,
            moneda_secundaria: perfil.empresas.moneda_secundaria || 'BS',
          });
        }
      }
      setLoading(false);
    };
    cargarDatosEmpresa();
  }, [supabase]);

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
          notificaciones_stock: configGlobal.notificaciones_stock,
          moneda_secundaria: configGlobal.moneda_secundaria,
          configuracion_inicial: true,
        })
        .eq('id', empresa.id);

      if (error) throw error;

      setExito(true);

      // Pequeña pausa para que el usuario vea el éxito antes de redirigir
      setTimeout(() => {
        router.push('/'); // Redirige al Inventario (Stock)
        router.refresh();
      }, 2000);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
            Cargando Configuración...
          </p>
        </div>
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">
            Mi Empresa
          </h1>
          <p className="text-slate-500 font-medium">
            Configura los detalles de tu negocio y preferencias
          </p>
        </header>

        {/* MODO ONBOARDING / ÉXITO */}
        {exito ? (
          <div className="bg-emerald-500 text-white p-6 rounded-[2rem] mb-8 flex items-center justify-between shadow-lg animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4">
              <CheckCircle2 size={32} />
              <div>
                <h3 className="font-black uppercase text-sm leading-none">
                  ¡Configuración Guardada!
                </h3>
                <p className="text-xs opacity-90 font-bold">
                  Redirigiendo al inventario...
                </p>
              </div>
            </div>
            <Loader2 className="animate-spin opacity-50" size={20} />
          </div>
        ) : (
          (!empresa?.nombre || !empresa?.rif) && (
            <div className="bg-orange-500 text-white p-6 rounded-[2rem] mb-8 flex items-center gap-4 shadow-lg animate-in slide-in-from-top-4">
              <div className="bg-white/20 p-3 rounded-2xl">
                <Info size={24} />
              </div>
              <div>
                <h3 className="font-black uppercase text-sm tracking-tighter">
                  Paso 1: Configura tu negocio
                </h3>
                <p className="text-xs opacity-90 font-bold">
                  Completa el nombre y RIF para empezar a usar Ventiq.
                </p>
              </div>
            </div>
          )
        )}

        <form
          onSubmit={handleUpdate}
          className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl space-y-8"
        >
          {/* SECCIÓN LOGO */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 bg-slate-50 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 transition-all hover:border-blue-400">
              {file ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="w-full h-full object-contain p-4"
                />
              ) : empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <Building2 size={32} className="text-slate-300" />
              )}
            </div>
            <label className="cursor-pointer bg-slate-100 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 text-slate-500">
              <Upload size={14} />
              {empresa.logo_url || file ? 'Cambiar Logo' : 'Subir Logo'}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
              />
            </label>
          </div>

          {/* DATOS BÁSICOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Nombre del Negocio
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
                  value={empresa.nombre || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, nombre: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                RIF / ID Fiscal
              </label>
              <div className="relative">
                <Hash
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
                  value={empresa.rif || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, rif: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* PREFERENCIAS */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Settings size={14} /> Configuración del Sistema
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {/* Selector de Moneda */}
              <div
                className={`p-5 rounded-[2rem] border-2 transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${configGlobal.moneda_secundaria === 'EUR' ? 'border-blue-100 bg-blue-50/20' : 'border-emerald-100 bg-emerald-50/20'}`}
              >
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-700 leading-none">
                    Moneda Secundaria
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    ¿Qué tasa quieres ver en tus ventas?
                  </p>
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setConfigGlobal({
                        ...configGlobal,
                        moneda_secundaria: 'BS',
                      })
                    }
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black transition-all ${configGlobal.moneda_secundaria === 'BS' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                  >
                    BOLÍVARES
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfigGlobal({
                        ...configGlobal,
                        moneda_secundaria: 'EUR',
                      })
                    }
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black transition-all ${configGlobal.moneda_secundaria === 'EUR' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    EUROS
                  </button>
                </div>
              </div>

              {/* Switch Alertas */}
              <div
                className={`p-5 rounded-[2rem] border-2 transition-all flex items-center justify-between ${configGlobal.notificaciones_stock ? 'border-orange-100 bg-orange-50/20' : 'border-slate-100 bg-white'}`}
              >
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-700 leading-none">
                    Alertas de Stock
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    Resaltar productos con bajo inventario
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
                  className={`transition-all ${configGlobal.notificaciones_stock ? 'text-orange-500' : 'text-slate-300'}`}
                >
                  {configGlobal.notificaciones_stock ? (
                    <ToggleRight size={36} />
                  ) : (
                    <ToggleLeft size={36} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            disabled={subiendo || exito}
            className="w-full bg-[#1A1D23] text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all disabled:opacity-50"
          >
            {subiendo ? (
              <Loader2 className="animate-spin" />
            ) : exito ? (
              <CheckCircle2 />
            ) : (
              <Save size={18} />
            )}
            {subiendo
              ? 'Guardando...'
              : exito
                ? '¡Listo!'
                : 'Guardar Configuración'}
          </button>
        </form>
      </div>
    </main>
  );
}
