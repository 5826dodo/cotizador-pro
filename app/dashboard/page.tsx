export default function DashboardPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800">
        Panel de Control del Negocio
      </h1>
      <p className="text-gray-600 mt-2">
        Aquí verás tus ventas, stock y el bot de Telegram.
      </p>

      <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border">
        <p className="font-semibold text-blue-600">Estado: Activo</p>
        <p className="text-sm text-gray-500">
          Bienvenido a tu sistema de gestión.
        </p>
      </div>
    </div>
  );
}
