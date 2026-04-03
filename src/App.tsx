function App() {
  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <h1 style={{ fontFamily: 'Lora, serif', fontSize: '2rem', marginBottom: '0.5rem' }}>
        Life OS
      </h1>
      <p style={{ color: 'var(--text-secondary)' }}>Setup erfolgreich — Schritt 1 abgeschlossen.</p>
    </div>
  )
}

export default App
