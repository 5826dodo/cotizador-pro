'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Loader2,
  Package,
  Store,
  Hash,
  Tag,
  Trash2,
  Edit3,
  X,
  Upload,
  Camera,
} from 'lucide-react';

export default function InventarioPage() {
  const supabase = createClient();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [unidad, setUnidad] = useState('UNIDADES');
  const [productos, setProductos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [editando, setEditando] = useState<any>(null);

  // Estados para la imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [cargando, setCargando] = useState(true);

  const unidadesMedida = ['UNIDADES', 'LITROS', 'KILOS', 'METROS', 'PAQUETES'];

  const obtenerProductos = async (idEmpresa: string) => {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('empresa_id', idEmpresa)
      .order('created_at', { ascending: false });
    if (data) setProductos(data);
  };

  useEffect(() => {
    const inicializarDatos = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id, empresas(nombre)')
          .eq('id', user.id)
          .single();

        if (perfil) {
          setEmpresaId(perfil.empresa_id);
          setNombreEmpresa((perfil.empresas as any)?.nombre || 'Mi Empresa');
          await obtenerProductos(perfil.empresa_id);
        }
      }
      setCargando(false);
    };
    inicializarDatos();
  }, []);

  // Función para subir la imagen al Storage
  const subirImagen = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${empresaId}/${Math.random()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('productos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('productos').getPublicUrl(fileName);

    return publicUrl;
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return alert('Error de sesión');
    setSubiendoImg(true);

    try {
      let finalImageUrl = editando?.imagen_url || null;

      // Si hay una nueva imagen seleccionada, la subimos
      if (imagenFile) {
        finalImageUrl = await subirImagen(imagenFile);
      }

      const payload = {
        nombre,
        precio: parseFloat(precio),
        stock: parseFloat(stock),
        unidad_medida: unidad,
        empresa_id: empresaId,
        imagen_url: finalImageUrl,
      };

      let error;
      if (editando) {
        const { error: err } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', editando.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('productos')
          .insert([payload]);
        error = err;
      }

      if (!error) {
        setMensaje(editando ? '✅ Actualizado' : '🚀 Producto Registrado');
        setTimeout(() => setMensaje(''), 3000);
        cancelarEdicion();
        obtenerProductos(empresaId);
      }
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSubiendoImg(false);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        const { error } = await supabase
          .from('productos')
          .delete()
          .eq('id', id)
          .eq('empresa_id', empresaId);

        if (error) throw error;

        // Refrescamos la lista después de eliminar
        if (empresaId) obtenerProductos(empresaId);
        setMensaje('🗑️ Producto eliminado');
        setTimeout(() => setMensaje(''), 3000);
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const prepararEdicion = (prod: any) => {
    setEditando(prod);
    setNombre(prod.nombre);
    setPrecio(prod.precio.toString());
    setStock(prod.stock.toString());
    setUnidad(prod.unidad_medida || 'UNIDADES');
    setPreviewUrl(prod.imagen_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNombre('');
    setPrecio('');
    setStock('');
    setUnidad('UNIDADES');
    setImagenFile(null);
    setPreviewUrl(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagenFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  if (cargando)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="mt-4 font-black text-xs uppercase tracking-widest text-slate-400">
          Sincronizando Almacén...
        </p>
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* HEADER */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">
              Sesión: {nombreEmpresa}
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              Panel de <span className="text-orange-500">Inventario</span>
            </h1>
          </div>
          {mensaje && (
            <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-xs font-black animate-bounce">
              {mensaje}
            </div>
          )}
        </div>

        {/* FORMULARIO */}
        <section className="bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border border-white">
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* SUBIDA DE FOTO */}
            <div className="flex flex-col items-center justify-center space-y-2 border-2 border-dashed border-slate-100 rounded-[2rem] p-4 hover:bg-slate-50 transition-all group relative overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  className="w-24 h-24 object-cover rounded-2xl shadow-md"
                  alt="Preview"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                  <Camera size={32} />
                </div>
              )}
              <label className="cursor-pointer text-[10px] font-black uppercase text-slate-400 group-hover:text-orange-500">
                {previewUrl ? 'Cambiar Foto' : 'Subir Foto'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                  Nombre del Producto
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    required
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                    Unidad
                  </label>
                  <select
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold appearance-none"
                  >
                    {unidadesMedida.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                  Stock Actual
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-orange-500"
                />
              </div>
              <button
                disabled={subiendoImg}
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                {subiendoImg ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : editando ? (
                  'Actualizar'
                ) : (
                  'Registrar'
                )}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"
                >
                  <X size={14} /> Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* LISTADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((prod) => (
            <div
              key={prod.id}
              className={`bg-white p-4 rounded-[2.5rem] shadow-sm border-2 flex flex-col gap-4 ${prod.stock <= 5 ? 'border-red-100' : 'border-white'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                  {prod.imagen_url ? (
                    <img
                      src={prod.imagen_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <Package size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-sm uppercase truncate">
                    {prod.nombre}
                  </h3>
                  <p className="text-orange-500 font-black text-lg">
                    ${prod.precio.toFixed(2)}
                  </p>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${prod.stock <= 5 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                  >
                    Stock: {prod.stock} {prod.unidad_medida.slice(0, 3)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => prepararEdicion(prod)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-500 transition-all"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminarProducto(prod.id)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
