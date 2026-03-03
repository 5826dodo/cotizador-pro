'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Building2,
  UserPlus,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  X,
} from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaEditando, setEmpresaEditando] = useState<any>(null); // Estado para el Modal
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
    const formData = new FormData(e.currentTarget);

    try {
      const { data: nuevaEmpresa, error: errEmpresa } = await supabase
        .from('empresas')
        .insert([
          {
            nombre: formData.get('nombre'),
            plan_activo: formData.get('plan'),
            fecha_vencimiento: `${formData.get('vencimiento')}T23:59:59Z`,
            rif: (formData.get('rif') as string).toUpperCase(),
          },
        ])
        .select()
        .single();

      if (errEmpresa) throw errEmpresa;

      const { error: errAuth } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      });

      setMensaje({ texto: '✅ Empresa creada correctamente', tipo: 'success' });
      (e.target as HTMLFormElement).reset();
      await cargarEmpresas();
    } catch (error: any) {
      setMensaje({ texto: '❌ Error: ' + error.message, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // FUNCIÓN PARA GUARDAR EDICIÓN
  const handleUpdateSuscripcion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          plan_activo: empresaEditando.plan_activo,
          fecha_vencimiento: empresaEditando.fecha_vencimiento.includes('T')
            ? empresaEditando.fecha_vencimiento
            : `${empresaEditando.fecha_vencimiento}T23:59:59Z`,
        })
        .eq('id', empresaEditando.id);

      if (error) throw error;
      setEmpresaEditando(null);
      await cargarEmpresas();
    } catch (error: any) {
      alert('Error al actualizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">
              Ventiq Cloud
            </h1>
            <p className="text-slate-500 font-medium">Panel de Suscripciones</p>
          </div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg">
            <ShieldCheck size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
              Súper Admin
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FORMULARIO DE ALTA */}
          <section className="lg:col-span-1">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-[0.2em] mb-6">
                Nueva Suscripción
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="nombre"
                  required
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                  placeholder="Nombre Empresa"
                />
                <input
                  name="rif"
                  required
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                  placeholder="RIF (J-12345678-0)"
                />
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                  placeholder="Email Dueño"
                />
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                  placeholder="Password"
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    name="plan"
                    className="px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                  >
                    <option value="gratis">Gratis</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                  <input
                    name="vencimiento"
                    type="date"
                    required
                    className="px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                  />
                </div>
                <button
                  disabled={loading}
                  className="w-full bg-[#1A1D23] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                >
                  {loading ? 'Cargando...' : 'Activar Negocio'}
                </button>
              </form>
            </div>
          </section>

          {/* LISTADO DE EMPRESAS */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
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
                      Estado
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                      Acción
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
                          <p className="font-black text-slate-700 text-sm uppercase">
                            {emp.nombre}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {emp.rif}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase">
                            {emp.plan_activo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={`text-[10px] font-black uppercase flex items-center gap-1 ${estaVencido ? 'text-red-500' : 'text-emerald-500'}`}
                          >
                            {estaVencido ? (
                              <AlertCircle size={12} />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            {new Date(
                              emp.fecha_vencimiento,
                            ).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setEmpresaEditando(emp)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all"
                          >
                            <Edit3 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {empresaEditando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">
                Editar Suscripción
              </h3>
              <button
                onClick={() => setEmpresaEditando(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleUpdateSuscripcion} className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">
                  Empresa Seleccionada
                </p>
                <div className="bg-slate-50 p-4 rounded-2xl font-bold text-slate-700">
                  {empresaEditando.nombre}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 block">
                  Cambiar Plan
                </label>
                <select
                  value={empresaEditando.plan_activo}
                  onChange={(e) =>
                    setEmpresaEditando({
                      ...empresaEditando,
                      plan_activo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                >
                  <option value="gratis">Gratis</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 block">
                  Nueva Fecha Vencimiento
                </label>
                <input
                  type="date"
                  value={empresaEditando.fecha_vencimiento.split('T')[0]}
                  onChange={(e) =>
                    setEmpresaEditando({
                      ...empresaEditando,
                      fecha_vencimiento: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                />
              </div>

              <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
