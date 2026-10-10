// Exposed by the federation plugin as 'dashboard/App'.
// Consumers render it lazily via `lazyProvider('dashboard', 'App')`.
export function App() {
  return (
    <section data-testid="dashboard">
      <h1>Hello from dashboard</h1>
    </section>
  );
}

export default App;
