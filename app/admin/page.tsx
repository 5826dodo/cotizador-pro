'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [empresas, setEmpresas] = useState<any[]>([]);
  const supabase = createClient();

  // Función para cargar la lista de empresas (Punto B)
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
    setLoading(true);
    setMensaje('');

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const plan = formData.get('plan') as string;
    // SOLUCIÓN FECHA:
    const vencimiento = `${formData.get('vencimiento')}T23:59:59Z`;

    try {
      const { data: nuevaEmpresa, error: errEmpresa } = await supabase
        .from('empresas')
        .insert([{ nombre, plan_activo: plan, fecha_vencimiento: vencimiento }])
        .select()
        .single();

      if (errEmpresa) throw errEmpresa;

      const { data: nuevoUsuario, error: errAuth } = await supabase.auth.signUp(
        {
          email,
          password,
        },
      );

      if (errAuth) throw errAuth;

      if (nuevoUsuario.user) {
        await supabase.from('perfiles').insert([
          {
            id: nuevoUsuario.user.id,
            email,
            rol: 'cliente',
            empresa_id: nuevaEmpresa.id,
          },
        ]);
      }

      // SOLUCIÓN REFRESCO:
      setTimeout(async () => {
        await cargarEmpresas();
        setMensaje('✅ Todo listo: Empresa y Admin creados');
        (e.target as HTMLFormElement).reset();
      }, 800);
    } catch (error: any) {
      // Si es error de límite de email, damos un mensaje amigable
      if (error.message.includes('rate limit')) {
        setMensaje(
          '❌ Límite de registros alcanzado. Espera unos minutos o cambia el límite en Supabase.',
        );
      } else {
        setMensaje('❌ Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* SECCIÓN A: FORMULARIO */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Nueva Suscripción</h2>
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-4"
        >
          <div>
            <label className="text-sm font-bold text-slate-600">
              Nombre de la Empresa
            </label>
            <input
              name="nombre"
              required
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-600">
                Email del Dueño
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600">
                Password Inicial
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-600">Plan</label>
              <select name="plan" className="w-full p-2 border rounded-md">
                <option value="gratis">Gratis</option>
                <option value="pro">Pro Mensual</option>
                <option value="premium">Premium Anual</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600">
                Vencimiento
              </label>
              <input
                name="vencimiento"
                type="date"
                required
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <button
            disabled={loading}
            className="bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700"
          >
            {loading ? 'Procesando...' : 'Dar de Alta'}
          </button>
          {mensaje && (
            <p className="text-center text-sm font-bold">{mensaje}</p>
          )}
        </form>
      </section>

      {/* SECCIÓN B: LISTADO */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Empresas Registradas</h2>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-sm">Empresa</th>
                <th className="p-3 text-sm">Plan</th>
                <th className="p-3 text-sm">Vence</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => (
                // Dentro de tu tabla en el map de empresas
                <tr key={emp.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{emp.nombre}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs uppercase">
                      {emp.plan_activo}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {/* Fecha de creación */}
                    Registro: {new Date(emp.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-sm font-bold text-red-600">
                    {/* Fecha de vencimiento */}
                    Vence:{' '}
                    {new Date(emp.fecha_vencimiento).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
