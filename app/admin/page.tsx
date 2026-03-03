'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Building2,
  UserPlus,
  Calendar,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [empresas, setEmpresas] = useState<any[]>([]);
  const supabase = createClient();

  const cargarEmpresas = async () => {
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setEmpresas(data);
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const plan = formData.get('plan') as string;
    const rif = formData.get('rif') as string; // Agregado RIF
    const vencimiento = `${formData.get('vencimiento')}T23:59:59Z`;

    try {
      // 1. Crear Empresa con RIF inicial
      const { data: nuevaEmpresa, error: errEmpresa } = await supabase
        .from('empresas')
        .insert([
          {
            nombre,
            plan_activo: plan,
            fecha_vencimiento: vencimiento,
            rif: rif.toUpperCase(),
          },
        ])
        .select()
        .single();

      if (errEmpresa) throw errEmpresa;

      // 2. Crear Auth User
      const { data: nuevoUsuario, error: errAuth } = await supabase.auth.signUp(
        {
          email,
          password,
        },
      );

      if (errAuth) throw errAuth;

      // 3. Vincular Perfil
      if (nuevoUsuario.user) {
        const { error: errPerfil } = await supabase.from('perfiles').upsert(
          {
            id: nuevoUsuario.user.id,
            email: email,
            rol: 'admin', // El primer usuario creado desde aquí es Admin de su empresa
            empresa_id: nuevaEmpresa.id,
          },
          { onConflict: 'id' },
        );

        if (errPerfil) throw errPerfil;
      }

      setMensaje({
        texto: '✅ Empresa y Usuario creados correctamente',
        tipo: 'success',
      });
      (e.target as HTMLFormElement).reset();
      await cargarEmpresas();
    } catch (error: any) {
      setMensaje({ texto: '❌ Error: ' + error.message, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">
              Ventiq Cloud
            </h1>
            <p className="text-slate-500 font-medium">
              Panel de Administración de Suscripciones
            </p>
          </div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl flex items-center gap-3 shadow-lg">
            <ShieldCheck size={20} />
            <span className="text-xs font-black uppercase tracking-widest">
              Súper Admin
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUMNA REGISTRO */}
          <section className="lg:col-span-1">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                  <UserPlus size={20} />
                </div>
                <h2 className="font-black text-slate-700 uppercase text-sm tracking-widest">
                  Alta de Negocio
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Nombre Empresa
                  </label>
                  <input
                    name="nombre"
                    required
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 font-bold text-sm"
                    placeholder="Ej: Inversiones Gómez"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    RIF / ID Fiscal
                  </label>
                  <input
                    name="rif"
                    required
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 font-bold text-sm"
                    placeholder="J-12345678-0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Email Dueño
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 font-bold text-sm"
                    placeholder="admin@empresa.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Password Temporal
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 font-bold text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                      Plan
                    </label>
                    <select
                      name="plan"
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 font-bold text-sm"
                    >
                      <option value="gratis">Gratis</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                      Vencimiento
                    </label>
                    <input
                      name="vencimiento"
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 font-bold text-sm"
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  className="w-full bg-[#1A1D23] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50 shadow-lg mt-4"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {loading ? 'Procesando...' : 'Activar Suscripción'}
                </button>

                {mensaje.texto && (
                  <div
                    className={`p-4 rounded-2xl text-[10px] font-black uppercase text-center ${mensaje.tipo === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                  >
                    {mensaje.texto}
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* COLUMNA LISTADO */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-700 uppercase text-sm tracking-widest">
                  Empresas en el Sistema
                </h3>
                <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500">
                  {empresas.length} TOTAL
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                        Negocio
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                        Plan
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                        Estado / Vencimiento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {empresas.map((emp) => {
                      const estaVencido =
                        new Date(emp.fecha_vencimiento) < new Date();
                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-slate-100 p-2 rounded-xl">
                                <Building2
                                  size={16}
                                  className="text-slate-400"
                                />
                              </div>
                              <div>
                                <p className="font-black text-slate-700 text-sm uppercase tracking-tight">
                                  {emp.nombre}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                  {emp.rif || 'SIN RIF'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                emp.plan_activo === 'premium'
                                  ? 'bg-purple-100 text-purple-600'
                                  : emp.plan_activo === 'pro'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {emp.plan_activo}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div
                                className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${estaVencido ? 'text-red-500' : 'text-emerald-500'}`}
                              >
                                {estaVencido ? (
                                  <AlertCircle size={12} />
                                ) : (
                                  <CheckCircle2 size={12} />
                                )}
                                {estaVencido ? 'Vencido' : 'Activo'}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                <Calendar size={12} />
                                {new Date(
                                  emp.fecha_vencimiento,
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
