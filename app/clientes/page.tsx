'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { Trash2, Edit3, X, UserPlus, Save } from 'lucide-react';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [idEditando, setIdEditando] = useState<string | null>(null);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState(''); // Nuevo campo
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [mensaje, setMensaje] = useState('');

  const obtenerClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });
    if (data) setClientes(data);
  };

  useEffect(() => {
    obtenerClientes();
  }, []);

  // Función para limpiar el teléfono (solo deja números)
  const limpiarTelefono = (t: string) => t.replace(/\D/g, '');

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si el usuario puso el teléfono, nos aseguramos de que el formato sea solo números
    const telLimpio = limpiarTelefono(telefono);

    const datosCliente = {
      nombre,
      cedula,
      telefono: telLimpio,
      email,
      empresa,
    };

    if (idEditando) {
      // MODO EDICIÓN
      const { error } = await supabase
        .from('clientes')
        .update(datosCliente)
        .eq('id', idEditando);

      if (!error) setMensaje('✅ Cliente actualizado');
    } else {
      // MODO CREACIÓN
      const { error } = await supabase.from('clientes').insert([datosCliente]);

      if (!error) setMensaje('✅ Cliente registrado');
    }

    resetearFormulario();
    obtenerClientes();
    setTimeout(() => setMensaje(''), 3000);
  };

  const prepararEdicion = (c: any) => {
    setIdEditando(c.id);
    setNombre(c.nombre);
    setCedula(c.cedula || '');
    setTelefono(c.telefono || '');
    setEmail(c.email || '');
    setEmpresa(c.empresa || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarCliente = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este cliente?')) {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (!error) {
        setMensaje('🗑️ Cliente eliminado');
        obtenerClientes();
        setTimeout(() => setMensaje(''), 3000);
      }
    }
  };

  const resetearFormulario = () => {
    setIdEditando(null);
    setNombre('');
    setCedula('');
    setTelefono('');
    setEmail('');
    setEmpresa('');
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
              <Edit3 className="text-blue-100" size={80} />
            ) : (
              <UserPlus className="text-blue-100" size={80} />
            )}
          </div>

          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
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
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none font-medium"
              required
            />
            <input
              placeholder="Cédula o RIF"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none font-medium"
            />
            <input
              placeholder="Teléfono (Ej: 58412...)"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none font-medium"
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none font-medium"
            />
            <input
              placeholder="Empresa (Opcional)"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 border-none font-medium md:col-span-2"
            />

            <div className="md:col-span-2 flex gap-3">
              <button
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
            <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-xl text-center font-bold animate-pulse">
              {mensaje}
            </div>
          )}
        </section>

        {/* LISTADO */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((c) => (
            <div
              key={c.id}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-xl text-slate-800 leading-tight">
                    {c.nombre}
                  </h3>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded-md uppercase">
                    ID: {c.cedula || 'N/A'}
                  </span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => prepararEdicion(c)}
                    className="p-2 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => eliminarCliente(c.id)}
                    className="p-2 text-red-500 bg-red-50 rounded-xl hover:bg-red-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">
                    🏢
                  </div>
                  <p className="text-sm font-bold">
                    {c.empresa || 'Particular'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">
                    📞
                  </div>
                  <p className="text-sm font-medium">
                    {c.telefono || 'Sin teléfono'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">
                    ✉️
                  </div>
                  <p className="text-sm font-medium truncate">
                    {c.email || 'Sin email'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
