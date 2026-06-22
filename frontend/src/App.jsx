import Countries from './pages/Countries';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-8 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
          Education ERP — Countries
        </h1>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-8">
        <Countries />
      </main>
    </div>
  );
}
