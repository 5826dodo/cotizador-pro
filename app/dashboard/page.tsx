'use client';
import imageCompression from 'browser-image-compression';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Package, Camera, X } from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Categoria {
  id: string;
  nombre: string;
  empresa_id: string;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  unidad_medida: string;
  empresa_id: string;
  imagen_url?: string | null;
  categoria_id?: string | null;
  activo: boolean;
  created_at: string;
  categorias?: { nombre: string } | null;
}

// ── Constantes ─────────────────────────────────────────────────────────────
const UNIDADES_MEDIDA = [
  'UNIDADES',
  'LITROS',
  'KILOS',
  'METROS',
  'PAQUETES',
] as const;
const ITEMS_POR_PAGINA = 12;

// ── Componente ─────────────────────────────────────────────────────────────
export default function InventarioPage() {
  const supabase = createClient();

  // — Sesión / empresa
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [cargando, setCargando] = useState(true);

  // — Formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [unidad, setUnidad] = useState<string>('UNIDADES');
  const [categoriaId, setCategoriaId] = useState('');
  const [editando, setEditando] = useState<Producto | null>(null);

  // — Imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [imagenError, setImagenError] = useState<string | null>(null);
  const [imagenInfo, setImagenInfo] = useState<{
    original: string;
    comprimido: string;
  } | null>(null);
  // Guardamos la objectURL activa para poder revocarla
  const objectUrlRef = useRef<string | null>(null);

  // — Catálogo
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [mensaje, setMensaje] = useState('');

  // — Paginación  (usamos ref para evitar closures stale)
  const paginaRef = useRef(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /** Revoca la objectURL anterior y asigna una nueva */
  const asignarPreview = (url: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (url && url.startsWith('blob:')) {
      objectUrlRef.current = url;
    }
    setPreviewUrl(url);
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // ── Datos ────────────────────────────────────────────────────────────────

  /**
   * FIX #5 — pagina se pasa como parámetro para evitar closures stale.
   * FIX #1 — una sola llamada al inicializar (reiniciar=true).
   */
  const obtenerProductos = useCallback(
    async (idEmpresa: string, reiniciar = false) => {
      const paginaActual = reiniciar ? 0 : paginaRef.current;
      if (!reiniciar) setCargandoMas(true);

      const desde = paginaActual * ITEMS_POR_PAGINA;
      const hasta = desde + ITEMS_POR_PAGINA - 1;

      const { data, error } = await supabase
        .from('productos')
        .select(`*, categorias ( nombre )`)
        .eq('empresa_id', idEmpresa)
        .order('activo', { ascending: false })
        .order('created_at', { ascending: false })
        .range(desde, hasta);

      if (error) {
        console.error(error);
      } else {
        const nuevos = (data as Producto[]) ?? [];
        if (reiniciar) {
          setProductos(nuevos);
          paginaRef.current = 1;
        } else {
          setProductos((prev) => [...prev, ...nuevos]);
          paginaRef.current = paginaActual + 1;
        }
        setTieneMas(nuevos.length === ITEMS_POR_PAGINA);
      }

      setCargandoMas(false);
    },
    [supabase],
  );

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

          // FIX #1 — una sola llamada, con reiniciar=true
          await obtenerProductos(perfil.empresa_id, true);

          const { data: cats } = await supabase
            .from('categorias')
            .select('*')
            .eq('empresa_id', perfil.empresa_id)
            .order('nombre');
          setCategorias((cats as Categoria[]) || []);
        }
      }
      setCargando(false);
    };

    inicializarDatos();
  }, [obtenerProductos, supabase]);

  // ── Imagen ───────────────────────────────────────────────────────────────

  /**
   * FIX #4 — eliminamos optimizarImagen (canvas manual).
   * Solo usamos imageCompression aquí; subirImagen sube directamente el File.
   */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limpiar estados anteriores
    setImagenError(null);
    setImagenInfo(null);

    if (file.size > 15 * 1024 * 1024) {
      setImagenError(
        `La imagen pesa ${formatBytes(file.size)} y supera el límite de 15 MB. Usa una foto más liviana.`,
      );
      return;
    }

    setComprimiendo(true);

    try {
      const archivoOptimizado = await imageCompression(file, {
        maxSizeMB: 0.7,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      });

      const archivoFinal = new File(
        [archivoOptimizado],
        `${file.name.split('.')[0]}.webp`,
        { type: 'image/webp' },
      );

      setImagenFile(archivoFinal);
      setImagenInfo({
        original: formatBytes(file.size),
        comprimido: formatBytes(archivoFinal.size),
      });
      // FIX #7 — gestionamos la objectURL con asignarPreview
      asignarPreview(URL.createObjectURL(archivoFinal));
    } catch (error) {
      console.error('Error al optimizar imagen:', error);
      setImagenError(
        'No se pudo procesar la imagen. Intenta con otro archivo.',
      );
      setImagenFile(file);
      asignarPreview(URL.createObjectURL(file));
    } finally {
      setComprimiendo(false);
    }
  };

  /**
   * FIX #4 — ya no comprime aquí; sube directamente el archivo ya optimizado.
   */
  const subirImagen = async (file: File): Promise<string> => {
    const fileName = `${empresaId}/${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(fileName, file, { contentType: 'image/webp', upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('productos').getPublicUrl(fileName);

    return publicUrl;
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return alert('Error de sesión');
    setSubiendoImg(true);

    try {
      let finalImageUrl: string | null = editando?.imagen_url ?? null;

      if (imagenFile) {
        finalImageUrl = await subirImagen(imagenFile);
      }

      const payload = {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseFloat(stock),
        unidad_medida: unidad,
        empresa_id: empresaId,
        imagen_url: finalImageUrl,
        categoria_id: categoriaId === '' ? null : categoriaId,
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
        mostrarMensaje(editando ? '✅ Actualizado' : '🚀 Producto Registrado');
        cancelarEdicion();
        obtenerProductos(empresaId, true);
      }
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSubiendoImg(false);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (
      !confirm(
        '¿Deseas retirar este producto del catálogo? No se borrará del historial de ventas.',
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;
      if (empresaId) obtenerProductos(empresaId, true);
      mostrarMensaje('📦 Producto archivado');
    } catch (err: any) {
      alert('Error al desactivar: ' + err.message);
    }
  };

  const reactivarProducto = async (id: string) => {
    if (!confirm('¿Deseas activar este producto nuevamente en tu catálogo?'))
      return;

    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: true })
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;
      if (empresaId) obtenerProductos(empresaId, true);
      mostrarMensaje('✅ Producto reactivado');
    } catch (err: any) {
      alert('Error al reactivar: ' + err.message);
    }
  };

  const prepararEdicion = (prod: Producto) => {
    setEditando(prod);
    setNombre(prod.nombre);
    setDescripcion(prod.descripcion || '');
    setPrecio(prod.precio.toString());
    setStock(prod.stock.toString());
    setUnidad(prod.unidad_medida || 'UNIDADES');
    setCategoriaId(prod.categoria_id || '');
    // La URL de Supabase no es una objectURL, no hay que revocarla
    setPreviewUrl(prod.imagen_url ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setStock('');
    setUnidad('UNIDADES');
    setCategoriaId('');
    setImagenFile(null);
    setImagenError(null);
    setImagenInfo(null);
    // FIX #7 — revocamos la objectURL al cancelar
    asignarPreview(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────

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
                <div
                  className={`w-24 h-24 rounded-2xl flex items-center justify-center transition-all ${imagenError ? 'bg-red-50 text-red-300' : 'bg-slate-100 text-slate-300'}`}
                >
                  <Camera size={32} />
                </div>
              )}

              <label
                className={`cursor-pointer text-[10px] font-black uppercase transition-all ${comprimiendo ? 'text-orange-400' : imagenError ? 'text-red-400' : 'text-slate-400 group-hover:text-orange-500'}`}
              >
                {comprimiendo
                  ? 'Optimizando...'
                  : previewUrl
                    ? 'Cambiar Foto'
                    : 'Subir Foto'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={comprimiendo}
                />
              </label>

              {/* ERROR de tamaño */}
              {imagenError && (
                <p className="text-[9px] font-bold text-red-500 text-center leading-tight px-1">
                  ⚠️ {imagenError}
                </p>
              )}

              {/* INFO de compresión: original → comprimido */}
              {imagenInfo && !imagenError && (
                <div className="flex items-center gap-1 text-[9px] font-black">
                  <span className="text-slate-400 line-through">
                    {imagenInfo.original}
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="text-emerald-500">
                    {imagenInfo.comprimido}
                  </span>
                </div>
              )}
            </div>

            {/* CAMPOS PRINCIPALES */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                  Nombre del Producto
                </label>
                <input
                  placeholder="Ej: Hamburguesa con Queso o Cambio de Aceite"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold placeholder:text-slate-300 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                  Descripción / Detalles (Tallas, Colores, Notas)
                </label>
                <textarea
                  placeholder="Ej: Talla L, Color Azul, o especificaciones del servicio..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold placeholder:text-slate-300 transition-all resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                    Categoría
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold appearance-none text-slate-700 cursor-pointer border-2 border-transparent focus:border-orange-500 transition-all"
                  >
                    <option value="">GENERAL / SIN CAT.</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    required
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold placeholder:text-slate-300 focus:ring-2 ring-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* STOCK + BOTONES */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-orange-500 focus:ring-2 ring-orange-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                    Medida
                  </label>
                  <select
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold appearance-none text-slate-700 cursor-pointer border-2 border-transparent focus:border-orange-500 transition-all"
                  >
                    {UNIDADES_MEDIDA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FIX #2 — Botón con clases CSS reales */}
              <button
                type="submit"
                disabled={subiendoImg || comprimiendo}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200"
              >
                {subiendoImg ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Guardando...
                  </>
                ) : comprimiendo ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Optimizando...
                  </>
                ) : editando ? (
                  '✏️ Actualizar Producto'
                ) : (
                  '🚀 Registrar Producto'
                )}
              </button>

              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                >
                  <X size={14} /> Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* VITRINA ONLINE */}
        <div className="mb-8 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2.5rem] text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                Tu Vitrina Online
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                Comparte este enlace con tus clientes
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/catalogo/${empresaId}`;
                  navigator.clipboard.writeText(url);
                  mostrarMensaje('¡Enlace copiado! 📋');
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
              >
                Copiar Link
              </button>

              <button
                onClick={() => window.open(`/catalogo/${empresaId}`, '_blank')}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20"
              >
                Abrir Mi Catálogo 🚀
              </button>
            </div>
          </div>
        </div>

        {/* LISTADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((prod) => {
            const precioSeguro = prod.precio ? Number(prod.precio) : 0;
            const stockSeguro = prod.stock ? Number(prod.stock) : 0;
            const unidadSegura = prod.unidad_medida || 'UNIDADES';
            const esStockCritico = stockSeguro <= 5;
            const esActivo = prod.activo !== false;

            return (
              <div
                key={prod.id}
                className={`bg-white p-4 rounded-[2.5rem] shadow-sm border-2 flex flex-col gap-4
                  ${
                    !esActivo
                      ? 'opacity-50 grayscale bg-slate-50 border-dashed'
                      : esStockCritico
                        ? 'border-red-100'
                        : 'border-white'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 animate-pulse">
                    {prod.imagen_url ? (
                      <img
                        src={`${prod.imagen_url}?width=150&quality=50`}
                        onLoad={(e) =>
                          e.currentTarget.parentElement!.classList.remove(
                            'animate-pulse',
                          )
                        }
                        className="w-full h-full object-cover"
                        loading="lazy"
                        alt={prod.nombre}
                      />
                    ) : (
                      <Package
                        size={24}
                        className="m-auto mt-8 text-slate-200"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {!esActivo && (
                      <span className="text-[8px] font-black bg-slate-800 text-white px-2 py-0.5 rounded-md uppercase mb-2 inline-block">
                        Fuera de Catálogo
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          prod.categorias?.nombre
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {prod.categorias?.nombre || 'General'}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-800 text-sm uppercase truncate">
                      {prod.nombre || 'Sin nombre'}
                    </h3>

                    {prod.descripcion && (
                      <p className="text-[10px] text-slate-400 italic truncate mb-1">
                        {prod.descripcion}
                      </p>
                    )}

                    <p className="text-orange-500 font-black text-lg">
                      ${precioSeguro.toFixed(2)}
                    </p>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        esStockCritico
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      Stock: {stockSeguro} {unidadSegura.slice(0, 3)}
                    </span>
                  </div>

                  {/* FIX #3 — Botones con clases CSS reales */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => prepararEdicion(prod)}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-500 hover:bg-orange-50 transition-all"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        esActivo
                          ? eliminarProducto(prod.id)
                          : reactivarProducto(prod.id)
                      }
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                      title={esActivo ? 'Archivar' : 'Reactivar'}
                    >
                      {esActivo ? '🗑️' : '🔄'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CARGAR MÁS */}
        {tieneMas && (
          <div className="flex justify-center mt-12 mb-20">
            <button
              onClick={() => empresaId && obtenerProductos(empresaId)}
              disabled={cargandoMas}
              className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-[2rem] font-black uppercase text-xs hover:border-orange-500 hover:text-orange-500 transition-all flex items-center gap-3 shadow-sm disabled:opacity-50"
            >
              {cargandoMas ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Cargando...
                </>
              ) : (
                'Ver más productos'
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
