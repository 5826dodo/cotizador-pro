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
  ChefHat,
  CreditCard,
  Zap,
  Banknote,
  Smartphone,
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
    modo_operacion: 'completo' as 'completo' | 'ticketera',
    modulo_recetas: false,
    modulo_gastos_fijos: true,
  });

  // ── Datos de métodos de pago ──────────────────────────────
  const [datosPago, setDatosPago] = useState({
    pago_movil_banco: '',
    pago_movil_telefono: '',
    pago_movil_cedula: '',
    zelle_cuenta: '',
    transferencia_banco: '',
    transferencia_cuenta: '',
    transferencia_titular: '',
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
          const db = Array.isArray(perfil.empresas)
            ? perfil.empresas[0]
            : perfil.empresas;
          if (db) {
            setEmpresa(db);
            setConfigGlobal({
              notificaciones_stock: db.notificaciones_stock ?? true,
              mostrar_bcv: db.mostrar_bcv ?? true,
              permitir_ventas_sin_stock: db.permitir_ventas_sin_stock ?? false,
              moneda_secundaria: db.moneda_secundaria || 'BS',
              modo_operacion: db.modo_operacion || 'completo',
              modulo_recetas: db.modulo_recetas ?? false,
              modulo_gastos_fijos: db.modulo_gastos_fijos ?? true,
            });
            // Cargar datos de pago guardados
            setDatosPago({
              pago_movil_banco: db.pago_movil_banco || '',
              pago_movil_telefono: db.pago_movil_telefono || '',
              pago_movil_cedula: db.pago_movil_cedula || '',
              zelle_cuenta: db.zelle_cuenta || '',
              transferencia_banco: db.transferencia_banco || '',
              transferencia_cuenta: db.transferencia_cuenta || '',
              transferencia_titular: db.transferencia_titular || '',
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
    const { error } = await supabase.storage
      .from('logos')
      .upload(fileName, file);
    if (error) throw error;
    return supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubiendo(true);
    try {
      let tel = empresa.telefono || '';
      if (tel.startsWith('0')) tel = tel.substring(1);
      if (!tel.startsWith('58')) tel = '58' + tel;

      let finalLogoUrl = empresa.logo_url;
      if (file) finalLogoUrl = await subirLogo(file, empresa.id);

      const { error } = await supabase
        .from('empresas')
        .update({
          nombre: empresa.nombre,
          rif: empresa.rif?.trim().toUpperCase() || '',
          telefono: tel,
          direccion: empresa.direccion,
          logo_url: finalLogoUrl,
          notificaciones_stock: configGlobal.notificaciones_stock,
          moneda_secundaria: configGlobal.moneda_secundaria,
          modo_operacion: configGlobal.modo_operacion,
          modulo_recetas: configGlobal.modulo_recetas,
          modulo_gastos_fijos: configGlobal.modulo_gastos_fijos,
          configuracion_inicial: true,
          // ── Métodos de pago ──
          pago_movil_banco: datosPago.pago_movil_banco.trim() || null,
          pago_movil_telefono: datosPago.pago_movil_telefono.trim() || null,
          pago_movil_cedula: datosPago.pago_movil_cedula.trim() || null,
          zelle_cuenta: datosPago.zelle_cuenta.trim() || null,
          transferencia_banco: datosPago.transferencia_banco.trim() || null,
          transferencia_cuenta: datosPago.transferencia_cuenta.trim() || null,
          transferencia_titular: datosPago.transferencia_titular.trim() || null,
        })
        .eq('id', empresa.id);

      if (error) throw error;
      setExito(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubiendo(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={onChange}
      className={`transition-all ${value ? 'text-orange-500' : 'text-slate-300'}`}
    >
      {value ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
    </button>
  );

  // Helper para inputs dentro de sección de pago
  const InputPago = ({
    label,
    placeholder,
    value,
    onChange,
    type = 'text',
  }: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
  }) => (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold text-xs transition-all"
      />
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

        {exito && (
          <div className="bg-emerald-500 text-white p-6 rounded-[2rem] mb-8 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <CheckCircle2 size={32} />
              <div>
                <h3 className="font-black uppercase text-sm">
                  ¡Configuración Guardada!
                </h3>
                <p className="text-xs opacity-90 font-bold">Redirigiendo...</p>
              </div>
            </div>
            <Loader2 className="animate-spin opacity-50" size={20} />
          </div>
        )}

        {!exito && !empresa?.nombre && (
          <div className="bg-orange-500 text-white p-6 rounded-[2rem] mb-8 flex items-center gap-4 shadow-lg">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-black uppercase text-sm tracking-tighter">
                Paso 1: Configura tu negocio
              </h3>
              <p className="text-xs opacity-90 font-bold">
                Completa el nombre y RIF para empezar.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleUpdate}
          className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl space-y-8"
        >
          {/* LOGO */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 bg-slate-50 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
              {file ? (
                <img
                  src={URL.createObjectURL(file)}
                  className="w-full h-full object-contain p-4"
                  alt="Preview"
                />
              ) : empresa?.logo_url ? (
                <img
                  src={empresa.logo_url}
                  className="w-full h-full object-contain p-4"
                  alt="Logo"
                />
              ) : (
                <Building2 size={32} className="text-slate-300" />
              )}
            </div>
            <label className="cursor-pointer bg-slate-100 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 text-slate-500">
              <Upload size={14} />
              {empresa?.logo_url || file ? 'Cambiar Logo' : 'Subir Logo'}
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
                  value={empresa?.nombre || ''}
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
                  value={empresa?.rif || ''}
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
                Teléfono WhatsApp
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

          {/* ══════════════════════════════════════════════
              MÉTODOS DE PAGO — sección nueva
          ══════════════════════════════════════════════ */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <CreditCard size={14} /> Métodos de Pago del Catálogo
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mb-5">
              Estos datos aparecerán en el mensaje de WhatsApp cuando el cliente
              seleccione ese método de pago.
            </p>

            <div className="space-y-4">
              {/* ── Pago Móvil ── */}
              <div className="p-5 rounded-[2rem] border-2 border-violet-100 bg-violet-50/30 space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-violet-500 text-white rounded-xl">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-700">
                      📱 Pago Móvil
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      Banco, teléfono y cédula/RIF del receptor
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <InputPago
                    label="Banco"
                    placeholder="Ej: Banesco"
                    value={datosPago.pago_movil_banco}
                    onChange={(v) =>
                      setDatosPago({ ...datosPago, pago_movil_banco: v })
                    }
                  />
                  <InputPago
                    label="Teléfono"
                    placeholder="Ej: 0412-1234567"
                    value={datosPago.pago_movil_telefono}
                    onChange={(v) =>
                      setDatosPago({ ...datosPago, pago_movil_telefono: v })
                    }
                    type="tel"
                  />
                  <InputPago
                    label="Cédula / RIF"
                    placeholder="Ej: V-12345678"
                    value={datosPago.pago_movil_cedula}
                    onChange={(v) =>
                      setDatosPago({ ...datosPago, pago_movil_cedula: v })
                    }
                  />
                </div>
              </div>

              {/* ── Zelle ── */}
              <div className="p-5 rounded-[2rem] border-2 border-purple-100 bg-purple-50/30 space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-purple-500 text-white rounded-xl">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-700">
                      ⚡ Zelle
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      Correo o teléfono vinculado a Zelle
                    </p>
                  </div>
                </div>
                <InputPago
                  label="Cuenta Zelle"
                  placeholder="Ej: pagos@empresa.com o +1 234 567 8901"
                  value={datosPago.zelle_cuenta}
                  onChange={(v) =>
                    setDatosPago({ ...datosPago, zelle_cuenta: v })
                  }
                />
              </div>

              {/* ── Transferencia bancaria ── */}
              <div className="p-5 rounded-[2rem] border-2 border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-slate-600 text-white rounded-xl">
                    <Banknote size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-700">
                      🏦 Transferencia Bancaria
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      Banco, número de cuenta y titular
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <InputPago
                    label="Banco"
                    placeholder="Ej: Mercantil"
                    value={datosPago.transferencia_banco}
                    onChange={(v) =>
                      setDatosPago({ ...datosPago, transferencia_banco: v })
                    }
                  />
                  <InputPago
                    label="Número de Cuenta"
                    placeholder="Ej: 0105-0001-..."
                    value={datosPago.transferencia_cuenta}
                    onChange={(v) =>
                      setDatosPago({ ...datosPago, transferencia_cuenta: v })
                    }
                  />
                  <InputPago
                    label="Titular"
                    placeholder="Nombre completo o razón social"
                    value={datosPago.transferencia_titular}
                    onChange={(v) =>
                      setDatosPago({ ...datosPago, transferencia_titular: v })
                    }
                  />
                </div>
              </div>

              <p className="text-[9px] text-slate-400 font-bold px-1">
                💡 Los campos vacíos simplemente no se mostrarán en el catálogo.
                Solo llena los métodos que aceptas.
              </p>
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
                  ¿Cómo quieres gestionar tus ventas?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      value: 'completo',
                      label: 'Modo Completo',
                      desc: 'Cotización + Venta Directa. Genera PDF y permite envío por WhatsApp.',
                      Icon: FileText,
                      color: 'blue',
                    },
                    {
                      value: 'ticketera',
                      label: 'Modo Ticketera',
                      desc: 'Solo Venta Directa. Genera recibo imprimible 80mm para puntos de venta rápidos.',
                      Icon: Printer,
                      color: 'orange',
                    },
                  ].map(({ value, label, desc, Icon, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setConfigGlobal({
                          ...configGlobal,
                          modo_operacion: value as any,
                        })
                      }
                      className={`p-4 rounded-[1.5rem] border-2 text-left transition-all ${
                        configGlobal.modo_operacion === value
                          ? color === 'blue'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                          configGlobal.modo_operacion === value
                            ? color === 'blue'
                              ? 'bg-blue-500'
                              : 'bg-orange-500'
                            : 'bg-slate-100'
                        }`}
                      >
                        <Icon
                          size={18}
                          className={
                            configGlobal.modo_operacion === value
                              ? 'text-white'
                              : 'text-slate-400'
                          }
                        />
                      </div>
                      <p
                        className={`text-[11px] font-black uppercase leading-none mb-1 ${
                          configGlobal.modo_operacion === value
                            ? color === 'blue'
                              ? 'text-blue-700'
                              : 'text-orange-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {label}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">
                        {desc}
                      </p>
                      {configGlobal.modo_operacion === value && (
                        <span
                          className={`mt-2 inline-block text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase ${color === 'blue' ? 'bg-blue-500' : 'bg-orange-500'}`}
                        >
                          ✓ Activo
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── MÓDULOS OPCIONALES ── */}
              <div className="p-5 rounded-[2rem] border-2 border-slate-100 bg-slate-50/50">
                <p className="text-[11px] font-black uppercase text-slate-700 leading-none mb-1">
                  Módulos del Inventario
                </p>
                <p className="text-[10px] text-slate-500 font-medium mb-4">
                  Activa solo las funciones que necesita tu tipo de negocio.
                </p>
                <div className="space-y-3">
                  {/* Módulo Gastos Fijos */}
                  <div
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                      configGlobal.modulo_gastos_fijos
                        ? 'border-blue-100 bg-blue-50/40'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${configGlobal.modulo_gastos_fijos ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                      >
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase text-slate-700">
                          Gastos Fijos
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium">
                          Sueldos, alquiler, servicios… distribuidos entre
                          productos.
                          <br />
                          <span className="text-blue-500 font-black">
                            Útil para cualquier tipo de negocio.
                          </span>
                        </p>
                      </div>
                    </div>
                    <Toggle
                      value={configGlobal.modulo_gastos_fijos}
                      onChange={() =>
                        setConfigGlobal({
                          ...configGlobal,
                          modulo_gastos_fijos:
                            !configGlobal.modulo_gastos_fijos,
                        })
                      }
                    />
                  </div>

                  {/* Módulo Recetas */}
                  <div
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                      configGlobal.modulo_recetas
                        ? 'border-emerald-100 bg-emerald-50/40'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${configGlobal.modulo_recetas ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                      >
                        <ChefHat size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase text-slate-700">
                          Recetas de Producción
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium">
                          Define ingredientes/insumos para fabricar productos.
                          <br />
                          <span className="text-emerald-600 font-black">
                            Para restaurantes, manufactura, costura, etc.
                          </span>
                        </p>
                      </div>
                    </div>
                    <Toggle
                      value={configGlobal.modulo_recetas}
                      onChange={() =>
                        setConfigGlobal({
                          ...configGlobal,
                          modulo_recetas: !configGlobal.modulo_recetas,
                        })
                      }
                    />
                  </div>

                  {!configGlobal.modulo_recetas && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <p className="text-[9px] text-slate-400 font-bold">
                        💡{' '}
                        <span className="font-black text-slate-600">
                          Sin recetas activas:
                        </span>{' '}
                        todos tus productos usarán el campo "Costo Unitario"
                        directamente.
                        {configGlobal.modulo_gastos_fijos &&
                          ' Los gastos fijos se seguirán distribuyendo sobre ese costo.'}
                      </p>
                    </div>
                  )}

                  {configGlobal.modulo_recetas && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <p className="text-[9px] text-emerald-700 font-bold">
                        🍳 <span className="font-black">Recetas activas:</span>{' '}
                        verás el tab "Insumos / Materias Primas" en el
                        inventario y el botón de receta en cada producto.
                      </p>
                    </div>
                  )}
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
                  {['BS', 'EUR'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setConfigGlobal({
                          ...configGlobal,
                          moneda_secundaria: m,
                        })
                      }
                      className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black transition-all ${
                        configGlobal.moneda_secundaria === m
                          ? m === 'BS'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-blue-600 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {m === 'BS' ? 'BOLÍVARES' : 'EUROS'}
                    </button>
                  ))}
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
                <Toggle
                  value={configGlobal.notificaciones_stock}
                  onChange={() =>
                    setConfigGlobal({
                      ...configGlobal,
                      notificaciones_stock: !configGlobal.notificaciones_stock,
                    })
                  }
                />
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
