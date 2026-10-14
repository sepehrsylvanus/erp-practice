// Exposed by the federation plugin as 'reports-fe/App'.
// Consumers render it lazily via `lazyProvider('reports-fe', 'App')`.
export function App() {
  return (
    <section data-testid="reports-fe">
      <h1>Hello from reports-fe</h1>
    </section>
  );
}

export default App;
