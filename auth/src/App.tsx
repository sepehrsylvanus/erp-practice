// Exposed by the federation plugin as 'auth/App'.
// Consumers render it lazily via `lazyProvider('auth', 'App')`.
export function App() {
  return (
    <section data-testid="auth">
      <h1>Hello from auth</h1>
    </section>
  );
}

export default App;
