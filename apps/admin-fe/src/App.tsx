// Exposed by the federation plugin as 'admin-fe/App'.
// Consumers render it lazily via `lazyProvider('admin-fe', 'App')`.
export function App() {
  return (
    <section data-testid="admin-fe">
      <h1>Hello from admin-fe</h1>
    </section>
  );
}

export default App;
