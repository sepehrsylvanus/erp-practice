// Exposed by the federation plugin as 'finance/App'.
// Consumers render it lazily via `lazyProvider('finance', 'App')`.
export function App() {
  return (
    <section data-testid="finance">
      <h1>Hello from finance</h1>
    </section>
  );
}

export default App;
