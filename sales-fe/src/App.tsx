// Exposed by the federation plugin as 'sales-fe/App'.
// Consumers render it lazily via `lazyProvider('sales-fe', 'App')`.
export function App() {
  return (
    <section data-testid="sales-fe">
      <h1>Hello from sales-fe</h1>
    </section>
  );
}

export default App;
