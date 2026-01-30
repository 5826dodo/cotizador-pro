'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function InventarioPage() {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');

  const obtenerProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setProductos(data);
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Guardar en la base de datos
    const { error } = await supabase
      .from('productos')
      .insert([{ nombre, precio: parseFloat(precio), stock: parseInt(stock) }]);

    if (!error) {
      setMensaje('¡Guardado exitosamente!');

      // 2. ENVIAR NOTIFICACIÓN A TELEGRAM 🚀
      try {
        const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
        const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
        const texto = `📦 *Nuevo Producto Añadido*\n\n🔹 *Nombre:* ${nombre}\n💰 *Precio:* $${precio}\n🔢 *Stock:* ${stock}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: texto,
            parse_mode: 'Markdown',
          }),
        });
      } catch (err) {
        console.error('Error enviando a Telegram:', err);
      }

      // Limpiar campos y refrescar
      setNombre('');
      setPrecio('');
      setStock('');
      obtenerProductos();
    } else {
      setMensaje('Error al guardar: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* FORMULARIO */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4">Agregar Producto</h2>
          <form onSubmit={guardarProducto} className="space-y-4">
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <input
              placeholder="Precio"
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <input
              placeholder="Stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <button className="w-full bg-blue-600 text-white py-2 rounded font-bold">
              Guardar
            </button>
          </form>
          {mensaje && (
            <p className="mt-2 text-green-600 text-center font-medium">
              {mensaje}
            </p>
          )}
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Inventario Actual</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Precio</th>
                  <th className="py-2 text-center">Stock</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr
                    key={prod.id}
                    className="border-b hover:bg-gray-50 text-sm"
                  >
                    <td className="py-2">{prod.nombre}</td>
                    <td className="py-2">${prod.precio}</td>
                    <td className="py-2 text-center">{prod.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
