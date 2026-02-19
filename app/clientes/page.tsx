'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // Asegúrate de que esta ruta sea la correcta en tu proyecto
import Link from 'next/link';
import {
  Trash2,
  Edit3,
  X,
  UserPlus,
  Save,
  Building2,
  Phone,
  Mail,
  Fingerprint,
  Loader2,
  Users,
  ArrowLeft,
} from 'lucide-react';

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<any[]>([]);
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [nombreEmpresaCliente, setNombreEmpresaCliente] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const obtenerPerfilYClientes = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: perfil, error: errorPerfil } = await supabase
            .from('perfiles')
            .select('empresa_id')
            .eq('id', user.id)
            .single();

          if (errorPerfil) throw errorPerfil;

          if (perfil?.empresa_id) {
            setEmpresaId(perfil.empresa_id);
            await cargarClientes(perfil.empresa_id);
          }
        }
      } catch (error: any) {
        console.error('Error inicializando:', error.message);
      } finally {
        setCargando(false);
      }
    };

    obtenerPerfilYClientes();
  }, []);

  const cargarClientes = async (idEmpresa: string) => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', idEmpresa)
      .order('nombre', { ascending: true });

    if (error) console.error('Error al obtener clientes:', error);
    if (data) setClientes(data);
  };

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return alert('No se pudo identificar tu empresa.');

    const telLimpio = telefono.replace(/\D/g, '');
    const datosCliente = {
      nombre,
      cedula,
      telefono: telLimpio,
      email,
      empresa: nombreEmpresaCliente,
      empresa_id: empresaId,
    };

    try {
      if (idEditando) {
        const { error } = await supabase
          .from('clientes')
          .update(datosCliente)
          .eq('id', idEditando);
        if (error) throw error;
        setMensaje('✅ Actualizado con éxito');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([datosCliente]);
        if (error) throw error;
        setMensaje('🚀 Cliente registrado');
      }

      resetearFormulario();
      await cargarClientes(empresaId);
      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const eliminarCliente = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
      setMensaje('🗑️ Cliente eliminado');
      if (empresaId) cargarClientes(empresaId);
    } catch (error: any) {
      alert('Error al eliminar el cliente');
    }
  };

  const prepararEdicion = (c: any) => {
    setIdEditando(c.id);
    setNombre(c.nombre);
    setCedula(c.cedula || '');
    setTelefono(c.telefono || '');
    setEmail(c.email || '');
    setNombreEmpresaCliente(c.empresa || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetearFormulario = () => {
    setIdEditando(null);
    setNombre('');
    setCedula('');
    setTelefono('');
    setEmail('');
    setNombreEmpresaCliente('');
  };

  // PANTALLA DE CARGA VENTIQ
  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 border-4 border-ventiq-orange/10 rounded-full"></div>
          <Loader2 className="w-20 h-20 text-ventiq-orange animate-spin stroke-[1.5]" />
          <Users className="absolute w-8 h-8 text-ventiq-black" />
        </div>
        <div className="mt-8 text-center">
          <h3 className="text-ventiq-black font-black uppercase tracking-tighter text-2xl">
            Ventiq <span className="text-ventiq-orange">Clientes</span>
          </h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse mt-2">
            Cargando Cartera...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-ventiq-black">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="text-ventiq-orange" size={24} />
              <h1 className="text-3xl font-black uppercase tracking-tighter">
                Clientes
              </h1>
            </div>
            <Link
              href="/cotizar"
              className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-ventiq-orange transition-colors"
            >
              <ArrowLeft
                size={14}
                className="group-hover:-translate-x-1 transition-transform"
              />
              REGRESAR A COTIZACIÓN
            </Link>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="text-right border-r pr-4 border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Total Clientes
              </p>
              <p className="text-xl font-black text-ventiq-orange">
                {clientes.length}
              </p>
            </div>
            <Users size={20} className="text-slate-300" />
          </div>
        </header>

        {/* FORMULARIO */}
        <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 opacity-[0.03] text-ventiq-black rotate-12">
            {idEditando ? <Edit3 size={180} /> : <UserPlus size={180} />}
          </div>

          <h2 className="text-lg font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
            {idEditando ? '✏️ Editando Cliente' : '➕ Registrar Nuevo Cliente'}
          </h2>

          <form
            onSubmit={guardarCliente}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10"
          >
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">
                Nombre Completo
              </label>
              <input
                placeholder="Ej: Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-ventiq-orange focus:bg-white transition-all font-bold"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">
                Cédula / RIF
              </label>
              <input
                placeholder="V-12345678"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-ventiq-orange focus:bg-white transition-all font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">
                Teléfono
              </label>
              <input
                placeholder="0412..."
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-ventiq-orange focus:bg-white transition-all font-bold"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">
                Correo Electrónico
              </label>
              <input
                placeholder="cliente@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-ventiq-orange focus:bg-white transition-all font-bold"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">
                Empresa / Razón Social
              </label>
              <input
                placeholder="Nombre de la empresa (Si aplica)"
                value={nombreEmpresaCliente}
                onChange={(e) => setNombreEmpresaCliente(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-ventiq-orange focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="md:col-span-4 flex gap-3 pt-2">
              <button
                type="submit"
                className={`flex-1 ${idEditando ? 'bg-ventiq-orange' : 'bg-ventiq-black'} text-white py-4 rounded-2xl font-black shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest`}
              >
                {idEditando ? <Save size={18} /> : <UserPlus size={18} />}
                {idEditando ? 'Guardar Cambios' : 'Registrar en Sistema'}
              </button>

              {idEditando && (
                <button
                  type="button"
                  onClick={resetearFormulario}
                  className="bg-slate-100 text-slate-500 px-8 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </form>

          {mensaje && (
            <div className="mt-4 p-3 bg-orange-50 text-ventiq-orange rounded-xl text-center font-bold text-sm border border-orange-100 animate-pulse">
              {mensaje}
            </div>
          )}
        </section>

        {/* LISTADO DE CLIENTES */}
        <div className="flex items-center gap-2 px-2">
          <div className="h-[2px] w-8 bg-ventiq-orange rounded-full"></div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
            Cartera de Clientes
          </h2>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((c) => (
            <div
              key={c.id}
              className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-orange-50 transition-colors">
                    <Users
                      className="text-slate-300 group-hover:text-ventiq-orange"
                      size={24}
                    />
                  </div>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-sm">
                    <Fingerprint size={10} /> {c.cedula || 'SIN ID'}
                  </span>
                </div>

                <h3 className="font-black text-xl text-ventiq-black leading-tight mb-4 uppercase tracking-tight">
                  {c.nombre}
                </h3>

                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Building2 size={16} className="text-ventiq-orange/50" />
                    <p className="text-xs font-bold uppercase truncate">
                      {c.empresa || 'Particular'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <Phone size={16} className="text-ventiq-orange/50" />
                    <p className="text-xs font-bold">
                      {c.telefono || 'Sin teléfono'}
                    </p>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-3 text-slate-500">
                      <Mail size={16} className="text-ventiq-orange/50" />
                      <p className="text-xs font-medium truncate italic">
                        {c.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-8">
                <button
                  onClick={() => prepararEdicion(c)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase hover:bg-orange-50 hover:text-ventiq-orange transition-all"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  onClick={() => eliminarCliente(c.id)}
                  className="w-12 flex items-center justify-center py-3 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>

        {clientes.length === 0 && !cargando && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <Users size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
              Aún no tienes clientes registrados
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
