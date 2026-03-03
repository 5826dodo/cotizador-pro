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
  Trash2,
  Mail,
  Lock,
  Ban,
  PlayCircle,
} from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaEditando, setEmpresaEditando] = useState<any>(null);
  const supabase = createClient();

  // 1. CARGAR EMPRESAS
  const cargarEmpresas = async () => {
    const { data } = await supabase
      .from('empresas')
      .select('*, perfiles(id, email)')
      .order('created_at', { ascending: false });
    if (data) setEmpresas(data);
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  // 2. CREAR NUEVA EMPRESA (handleSubmit)
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
    const rif = formData.get('rif') as string;
    const vencimiento = `${formData.get('vencimiento')}T23:59:59Z`;

    try {
      // Crear Empresa
      const { data: nuevaEmpresa, error: errEmpresa } = await supabase
        .from('empresas')
        .insert([
          {
            nombre,
            plan_activo: plan,
            fecha_vencimiento: vencimiento,
            rif: rif.toUpperCase(),
            suspendida: false,
          },
        ])
        .select()
        .single();

      if (errEmpresa) throw errEmpresa;

      // Crear Usuario en Auth
      const { data: nuevoUsuario, error: errAuth } = await supabase.auth.signUp(
        {
          email,
          password,
        },
      );

      if (errAuth) throw errAuth;

      // Vincular Perfil
      if (nuevoUsuario.user) {
        const { error: errPerfil } = await supabase.from('perfiles').upsert(
          {
            id: nuevoUsuario.user.id,
            email: email,
            rol: 'admin',
            empresa_id: nuevaEmpresa.id,
          },
          { onConflict: 'id' },
        );
        if (errPerfil) throw errPerfil;
      }

      setMensaje({
        texto: '✅ Registro completado con éxito',
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

  // 3. BANEAR / REACTIVAR
  const handleToggleSuspension = async (id: string, estadoActual: boolean) => {
    const accion = estadoActual ? 'reactivar' : 'suspender';
    if (!confirm(`¿Deseas ${accion} el acceso a esta empresa?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ suspendida: !estadoActual })
        .eq('id', id);

      if (error) throw error;
      await cargarEmpresas();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. ELIMINAR
  const handleEliminar = async (id: string) => {
    if (
      !confirm(
        '¿ESTÁS SEGURO? Se borrarán todos los datos. Esta acción es irreversible.',
      )
    )
      return;

    setLoading(true);
    try {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) throw error;
      await cargarEmpresas();
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. ACTUALIZAR DESDE MODAL
  const handleUpdateTotal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: errEmp } = await supabase
        .from('empresas')
        .update({
          nombre: empresaEditando.nombre,
          plan_activo: empresaEditando.plan_activo,
          fecha_vencimiento: empresaEditando.fecha_vencimiento.includes('T')
            ? empresaEditando.fecha_vencimiento
            : `${empresaEditando.fecha_vencimiento}T23:59:59Z`,
        })
        .eq('id', empresaEditando.id);

      if (errEmp) throw errEmp;

      setEmpresaEditando(null);
      await cargarEmpresas();
      alert('Configuración actualizada correctamente.');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
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
            <span className="text-[10px] font-black uppercase tracking-widest">
              Súper Admin
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SECCIÓN FORMULARIO */}
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
                  placeholder="Password Inicial"
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
                  {loading ? 'Procesando...' : 'Activar Negocio'}
                </button>
                {mensaje.texto && (
                  <p
                    className={`text-center text-[10px] font-black uppercase ${mensaje.tipo === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
                  >
                    {mensaje.texto}
                  </p>
                )}
              </form>
            </div>
          </section>

          {/* SECCIÓN LISTADO */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                      Negocio / Dueño
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {empresas.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-black text-sm uppercase ${emp.suspendida ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                          >
                            {emp.nombre}
                          </p>
                          {emp.suspendida && (
                            <span className="bg-red-100 text-red-600 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">
                              Baneado
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-blue-500 font-bold">
                          {emp.perfiles?.[0]?.email || 'Sin correo'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold uppercase">
                        {emp.plan_activo}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => setEmpresaEditando(emp)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() =>
                            handleToggleSuspension(emp.id, emp.suspendida)
                          }
                          className={`p-2 rounded-xl ${emp.suspendida ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                        >
                          {emp.suspendida ? (
                            <PlayCircle size={16} />
                          ) : (
                            <Ban size={16} />
                          )}
                        </button>

                        <button
                          onClick={() => handleEliminar(emp.id)}
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {empresaEditando && (
        <div className="fixed inset-0 bg-[#1A1D23]/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">
                Editar Empresa
              </h3>
              <button
                onClick={() => setEmpresaEditando(null)}
                className="text-slate-400 hover:rotate-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateTotal} className="space-y-5">
              <input
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs"
                value={empresaEditando.nombre}
                onChange={(e) =>
                  setEmpresaEditando({
                    ...empresaEditando,
                    nombre: e.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={empresaEditando.plan_activo}
                  onChange={(e) =>
                    setEmpresaEditando({
                      ...empresaEditando,
                      plan_activo: e.target.value,
                    })
                  }
                  className="px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs"
                >
                  <option value="gratis">Gratis</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
                <input
                  type="date"
                  value={empresaEditando.fecha_vencimiento?.split('T')[0]}
                  onChange={(e) =>
                    setEmpresaEditando({
                      ...empresaEditando,
                      fecha_vencimiento: e.target.value,
                    })
                  }
                  className="px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs"
                />
              </div>
              <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
