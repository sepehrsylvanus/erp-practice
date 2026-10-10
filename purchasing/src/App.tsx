// Exposed by the federation plugin as 'purchasing/App'.
// Consumers render it lazily via `lazyProvider('purchasing', 'App')`.
export function App() {
  return (
    <section data-testid="purchasing">
      <h1>Hello from purchasing</h1>
    </section>
  );
}

export default App;
