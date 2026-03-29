'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
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
  FileText,
  Printer,
} from 'lucide-react';

export default function PerfilEmpresa() {
  const router = useRouter();
  const supabase = createClient();

  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [exito, setExito] = useState(false);

  const [configGlobal, setConfigGlobal] = useState({
    notificaciones_stock: true,
    mostrar_bcv: true,
    permitir_ventas_sin_stock: false,
    moneda_secundaria: 'BS',
    // NUEVO: modo de operación del negocio
    modo_operacion: 'completo' as 'completo' | 'ticketera',
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
          const datosDB = Array.isArray(perfil.empresas)
            ? perfil.empresas[0]
            : perfil.empresas;

          if (datosDB) {
            setEmpresa(datosDB);
            setConfigGlobal({
              notificaciones_stock: datosDB.notificaciones_stock ?? true,
              mostrar_bcv: datosDB.mostrar_bcv ?? true,
              permitir_ventas_sin_stock:
                datosDB.permitir_ventas_sin_stock ?? false,
              moneda_secundaria: datosDB.moneda_secundaria || 'BS',
              modo_operacion: datosDB.modo_operacion || 'completo',
            });
          }
        }
      }
      setLoading(false);
    };
    cargarDatosEmpresa();
  }, [supabase]);

  const subirLogo = async (file: File, empresaId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${empresaId}-${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubiendo(true);

    try {
      let telefonoFormateado = empresa.telefono || '';
      if (telefonoFormateado) {
        if (telefonoFormateado.startsWith('0'))
          telefonoFormateado = telefonoFormateado.substring(1);
        if (!telefonoFormateado.startsWith('58'))
          telefonoFormateado = '58' + telefonoFormateado;
      }

      const rifLimpio = empresa.rif?.trim().toUpperCase() || '';
      let finalLogoUrl = empresa.logo_url;
      if (file) finalLogoUrl = await subirLogo(file, empresa.id);

      const { error } = await supabase
        .from('empresas')
        .update({
          nombre: empresa.nombre,
          rif: rifLimpio,
          telefono: telefonoFormateado,
          direccion: empresa.direccion,
          logo_url: finalLogoUrl,
          notificaciones_stock: configGlobal.notificaciones_stock,
          moneda_secundaria: configGlobal.moneda_secundaria,
          // NUEVO: guardamos el modo de operación
          modo_operacion: configGlobal.modo_operacion,
          configuracion_inicial: true,
        })
        .eq('id', empresa.id);

      if (error) throw error;

      setExito(true);
      setTimeout(() => {
        router.push('/');
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
          {/* LOGO */}
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
                  placeholder="Ej: J-12345678-9"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
                  value={empresa.rif || ''}
                  onChange={(e) =>
                    setEmpresa({
                      ...empresa,
                      rif: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  placeholder="Ej: 0412 123 4567"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
                  value={empresa?.telefono || ''}
                  onChange={(e) =>
                    setEmpresa({
                      ...empresa,
                      telefono: e.target.value.replace(/\D/g, ''),
                    })
                  }
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Dirección Física
              </label>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-4 text-slate-400"
                  size={18}
                />
                <textarea
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold h-24"
                  value={empresa?.direccion || ''}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, direccion: e.target.value })
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
              {/* ── MODO DE OPERACIÓN ── */}
              <div className="p-5 rounded-[2rem] border-2 border-slate-100 bg-slate-50/50">
                <p className="text-[11px] font-black uppercase text-slate-700 leading-none mb-1">
                  Modo de Operación
                </p>
                <p className="text-[10px] text-slate-500 font-medium mb-4">
                  ¿Cómo quieres gestionar tus ventas día a día?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Modo Completo */}
                  <button
                    type="button"
                    onClick={() =>
                      setConfigGlobal({
                        ...configGlobal,
                        modo_operacion: 'completo',
                      })
                    }
                    className={`p-4 rounded-[1.5rem] border-2 text-left transition-all ${
                      configGlobal.modo_operacion === 'completo'
                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                        configGlobal.modo_operacion === 'completo'
                          ? 'bg-blue-500'
                          : 'bg-slate-100'
                      }`}
                    >
                      <FileText
                        size={18}
                        className={
                          configGlobal.modo_operacion === 'completo'
                            ? 'text-white'
                            : 'text-slate-400'
                        }
                      />
                    </div>
                    <p
                      className={`text-[11px] font-black uppercase leading-none mb-1 ${
                        configGlobal.modo_operacion === 'completo'
                          ? 'text-blue-700'
                          : 'text-slate-600'
                      }`}
                    >
                      Modo Completo
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium leading-tight">
                      Cotización + Venta Directa. Genera PDF y permite envío por
                      WhatsApp. Ideal para negocios con clientes frecuentes.
                    </p>
                    {configGlobal.modo_operacion === 'completo' && (
                      <span className="mt-2 inline-block text-[8px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase">
                        ✓ Activo
                      </span>
                    )}
                  </button>

                  {/* Modo Ticketera */}
                  <button
                    type="button"
                    onClick={() =>
                      setConfigGlobal({
                        ...configGlobal,
                        modo_operacion: 'ticketera',
                      })
                    }
                    className={`p-4 rounded-[1.5rem] border-2 text-left transition-all ${
                      configGlobal.modo_operacion === 'ticketera'
                        ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                        configGlobal.modo_operacion === 'ticketera'
                          ? 'bg-orange-500'
                          : 'bg-slate-100'
                      }`}
                    >
                      <Printer
                        size={18}
                        className={
                          configGlobal.modo_operacion === 'ticketera'
                            ? 'text-white'
                            : 'text-slate-400'
                        }
                      />
                    </div>
                    <p
                      className={`text-[11px] font-black uppercase leading-none mb-1 ${
                        configGlobal.modo_operacion === 'ticketera'
                          ? 'text-orange-700'
                          : 'text-slate-600'
                      }`}
                    >
                      Modo Ticketera
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium leading-tight">
                      Solo Venta Directa. Genera recibo imprimible para
                      ticketera 80mm. Ideal para tiendas y puntos de venta
                      rápidos.
                    </p>
                    {configGlobal.modo_operacion === 'ticketera' && (
                      <span className="mt-2 inline-block text-[8px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase">
                        ✓ Activo
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Moneda Secundaria */}
              <div
                className={`p-5 rounded-[2rem] border-2 transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${
                  configGlobal.moneda_secundaria === 'EUR'
                    ? 'border-blue-100 bg-blue-50/20'
                    : 'border-emerald-100 bg-emerald-50/20'
                }`}
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
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black transition-all ${
                      configGlobal.moneda_secundaria === 'BS'
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400'
                    }`}
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
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black transition-all ${
                      configGlobal.moneda_secundaria === 'EUR'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    EUROS
                  </button>
                </div>
              </div>

              {/* Alertas de Stock */}
              <div
                className={`p-5 rounded-[2rem] border-2 transition-all flex items-center justify-between ${
                  configGlobal.notificaciones_stock
                    ? 'border-orange-100 bg-orange-50/20'
                    : 'border-slate-100 bg-white'
                }`}
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
