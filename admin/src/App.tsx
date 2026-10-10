// Exposed by the federation plugin as 'admin/App'.
// Consumers render it lazily via `lazyProvider('admin', 'App')`.
export function App() {
  return (
    <section data-testid="admin">
      <h1>Hello from admin</h1>
    </section>
  );
}

export default App;
