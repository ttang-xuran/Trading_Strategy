import React from 'react'

function App() {
  return (
    <div style={{ 
      padding: '2rem', 
      backgroundColor: '#fff', 
      color: '#000',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>BTC Trading Strategy - Test</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => alert('Button works!')}>
        Test Button
      </button>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0' }}>
        <h2>Live Bitcoin Price Test</h2>
        <p>This is a minimal test to verify the app loads properly.</p>
        <p>Time: {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}

export default App