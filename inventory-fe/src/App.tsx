// Exposed by the federation plugin as 'inventory-fe/App'.
// Consumers render it lazily via `lazyProvider('inventory-fe', 'App')`.
export function App() {
  return (
    <section data-testid="inventory-fe">
      <h1>Hello from inventory-fe</h1>
    </section>
  );
}

export default App;
