'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
} from 'lucide-react';

export default function ClientesPage() {
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

  // 1. Cargar el perfil del usuario para obtener su empresa_id
  useEffect(() => {
    const obtenerPerfilYClientes = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: perfil, error: errorPerfil } = await supabase
            .from('perfiles')
            .select('empresa_id')
            .eq('id', session.user.id)
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

  // 2. Función para cargar clientes filtrados por empresa
  const cargarClientes = async (idEmpresa: string) => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', idEmpresa)
      .order('nombre', { ascending: true });

    if (error) console.error('Error al obtener clientes:', error);
    if (data) setClientes(data);
  };

  // 3. Guardar o Actualizar Cliente
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
      empresa_id: empresaId, // Vínculo obligatorio
    };

    try {
      if (idEditando) {
        const { error } = await supabase
          .from('clientes')
          .update(datosCliente)
          .eq('id', idEditando);
        if (error) throw error;
        setMensaje('✅ Cliente actualizado con éxito');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([datosCliente]);
        if (error) throw error;
        setMensaje('✅ Cliente registrado con éxito');
      }

      resetearFormulario();
      await cargarClientes(empresaId);

      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // 4. Eliminar Cliente
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

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-blue-600">
        CARGANDO DATOS...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-black text-blue-700 tracking-tighter">
              CLIENTES
            </h1>
            <Link
              href="/cotizar"
              className="text-sm font-bold text-blue-400 hover:text-blue-600 transition-colors"
            >
              ← Regresar a Cotización
            </Link>
          </div>
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 font-black">
            Total: {clientes.length}
          </div>
        </header>

        {/* FORMULARIO */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            {idEditando ? (
              <Edit3 className="text-blue-50" size={100} />
            ) : (
              <UserPlus className="text-blue-50" size={100} />
            )}
          </div>

          <h2 className="text-xl font-black mb-6 flex items-center gap-2 relative z-10">
            {idEditando ? 'Editando Cliente' : 'Nuevo Registro'}
          </h2>

          <form
            onSubmit={guardarCliente}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10"
          >
            <input
              placeholder="Nombre Completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-medium"
              required
            />
            <input
              placeholder="Cédula o RIF"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-medium"
            />
            <input
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-medium"
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-medium"
            />
            <input
              placeholder="Empresa del cliente (Opcional)"
              value={nombreEmpresaCliente}
              onChange={(e) => setNombreEmpresaCliente(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-medium md:col-span-2"
            />

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className={`flex-1 ${idEditando ? 'bg-green-600' : 'bg-blue-600'} text-white py-4 rounded-2xl font-black shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2`}
              >
                {idEditando ? <Save size={20} /> : <UserPlus size={20} />}
                {idEditando ? 'ACTUALIZAR DATOS' : 'REGISTRAR CLIENTE'}
              </button>

              {idEditando && (
                <button
                  type="button"
                  onClick={resetearFormulario}
                  className="bg-slate-200 text-slate-600 px-6 rounded-2xl font-black"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </form>

          {mensaje && (
            <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-xl text-center font-bold animate-fade-in">
              {mensaje}
            </div>
          )}
        </section>

        {/* LISTADO DE CLIENTES */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((c) => (
            <div
              key={c.id}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="mb-4">
                  <h3 className="font-black text-xl text-slate-800 leading-tight mb-1">
                    {c.nombre}
                  </h3>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase flex items-center gap-1 w-fit">
                    <Fingerprint size={12} /> {c.cedula || 'S/N'}
                  </span>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Building2 size={16} className="text-blue-400" />
                    <p className="text-sm font-bold">
                      {c.empresa || 'Particular'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={16} className="text-blue-400" />
                    <p className="text-sm font-medium">
                      {c.telefono || 'Sin teléfono'}
                    </p>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail size={16} className="text-blue-400" />
                      <p className="text-sm font-medium truncate">{c.email}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => prepararEdicion(c)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold active:scale-95 transition-all"
                >
                  <Edit3 size={18} /> Editar
                </button>
                <button
                  onClick={() => eliminarCliente(c.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-2xl font-bold active:scale-95 transition-all"
                >
                  <Trash2 size={18} /> Borrar
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
