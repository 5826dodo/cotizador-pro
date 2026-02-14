'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { Trash2, Edit3, X, UserPlus, Save } from 'lucide-react';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null); // Guardar el ID de la empresa logueada

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [nombreEmpresaCliente, setNombreEmpresaCliente] = useState(''); // El nombre de la empresa del cliente
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const inicializar = async () => {
      // 1. Obtener la sesión del usuario actual
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Asumiendo que guardas el empresa_id en la metadata del usuario o tienes una tabla de perfiles
        // Si lo tienes en la tabla 'usuarios' o 'perfiles', búscalo aquí:
        const { data: perfil } = await supabase
          .from('usuarios') // Ajusta el nombre de tu tabla de perfiles/usuarios
          .select('empresa_id')
          .eq('id', session.user.id)
          .single();

        if (perfil?.empresa_id) {
          setEmpresaId(perfil.empresa_id);
          obtenerClientes(perfil.empresa_id);
        }
      }
    };

    inicializar();
  }, []);

  const obtenerClientes = async (id: string) => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', id) // FILTRO CRÍTICO
      .order('nombre', { ascending: true });

    if (error) console.error('Error cargando clientes:', error);
    if (data) setClientes(data);
  };

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return alert('No se detectó el ID de tu empresa.');

    const telLimpio = telefono.replace(/\D/g, '');
    const datosCliente = {
      nombre,
      cedula,
      telefono: telLimpio,
      email,
      empresa: nombreEmpresaCliente, // Nombre visual de la empresa del cliente
      empresa_id: empresaId, // VINCULACIÓN CON TU EMPRESA LOGUEADA
    };

    try {
      if (idEditando) {
        const { error } = await supabase
          .from('clientes')
          .update(datosCliente)
          .eq('id', idEditando);
        if (error) throw error;
        setMensaje('✅ Cliente actualizado');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([datosCliente]);
        if (error) throw error;
        setMensaje('✅ Cliente registrado');
      }
      resetearFormulario();
      obtenerClientes(empresaId);
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
      if (empresaId) obtenerClientes(empresaId);
    } catch (error: any) {
      alert('Error al eliminar.');
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-black text-blue-700 tracking-tighter">
              CLIENTES
            </h1>
            <Link
              href="/cotizar"
              className="text-sm font-bold text-blue-400 hover:text-blue-600"
            >
              ← Regresar a Cotización
            </Link>
          </div>
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 font-black">
            Total: {clientes.length}
          </div>
        </header>

        <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-50 relative">
          <h2 className="text-xl font-black mb-6">
            {idEditando ? 'Editando Cliente' : 'Nuevo Registro'}
          </h2>
          <form
            onSubmit={guardarCliente}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <input
              placeholder="Nombre Completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl border-none"
              required
            />
            <input
              placeholder="Cédula o RIF"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl border-none"
            />
            <input
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl border-none"
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl border-none"
            />
            <input
              placeholder="Empresa del cliente (Opcional)"
              value={nombreEmpresaCliente}
              onChange={(e) => setNombreEmpresaCliente(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl border-none md:col-span-2"
            />
            <button
              className={`md:col-span-2 py-4 rounded-2xl font-black text-white ${idEditando ? 'bg-green-600' : 'bg-blue-600'}`}
            >
              {idEditando ? 'ACTUALIZAR' : 'REGISTRAR'}
            </button>
          </form>
        </section>

        {/* LISTADO FILTRADO */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((c) => (
            <div
              key={c.id}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100"
            >
              <h3 className="font-black text-xl text-slate-800">{c.nombre}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {c.empresa || 'Particular'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => prepararEdicion(c)}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl font-bold"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarCliente(c.id)}
                  className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
