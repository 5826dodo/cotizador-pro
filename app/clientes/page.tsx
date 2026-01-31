'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function ClientesPage() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
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

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('clientes')
      .insert([{ nombre, telefono, email, empresa }]);

    if (!error) {
      setMensaje('✅ Cliente registrado');
      setNombre('');
      setTelefono('');
      setEmail('');
      setEmpresa('');
      obtenerClientes();
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-blue-700">
              GESTIÓN DE CLIENTES
            </h1>
            <Link href="/" className="text-sm text-blue-500 hover:underline">
              ← Volver al Inventario
            </Link>
          </div>
        </header>

        <section className="bg-white p-6 rounded-3xl shadow-lg border border-white">
          <form
            onSubmit={guardarCliente}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <input
              placeholder="Nombre Completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-slate-50 p-3 rounded-2xl outline-none focus:border-blue-500 border-2 border-transparent"
              required
            />
            <input
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="bg-slate-50 p-3 rounded-2xl outline-none"
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-50 p-3 rounded-2xl outline-none"
            />
            <input
              placeholder="Empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="bg-slate-50 p-3 rounded-2xl outline-none"
            />
            <button className="md:col-span-2 lg:col-span-4 bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
              Registrar Cliente
            </button>
          </form>
          {mensaje && (
            <p className="mt-4 text-center text-green-600 font-bold">
              {mensaje}
            </p>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200"
            >
              <h3 className="font-black text-lg text-slate-800">{c.nombre}</h3>
              <p className="text-sm text-slate-500">
                {c.empresa || 'Particular'}
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-sm">📞 {c.telefono || 'Sin teléfono'}</p>
                <p className="text-sm">✉️ {c.email || 'Sin email'}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
