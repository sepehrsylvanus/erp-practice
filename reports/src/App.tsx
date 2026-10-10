// Exposed by the federation plugin as 'reports/App'.
// Consumers render it lazily via `lazyProvider('reports', 'App')`.
export function App() {
  return (
    <section data-testid="reports">
      <h1>Hello from reports</h1>
    </section>
  );
}

export default App;
