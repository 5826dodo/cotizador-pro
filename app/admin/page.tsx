'use client'; // Agregamos esto para evitar problemas de renderizado inicial

export default function AdminPage() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1 style={{ color: '#2563eb', fontSize: '32px' }}>
        Panel Maestro Activado
      </h1>
      <p>Si ves esto, la redirección funcionó correctamente.</p>
    </div>
  );
}
