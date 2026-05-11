'use client';

export default function SentryTestPage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      gap: '20px',
      fontFamily: 'sans-serif'
    }}>
      <h1>Teste do Sentry</h1>
      <p>Clique no botão abaixo para disparar um erro e verificar se o Sentry está capturando.</p>
      <button
        onClick={() => {
          throw new Error("Sentry Test Error from Anime2cap");
        }}
        style={{
          padding: '12px 24px',
          backgroundColor: '#e0284f',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        Disparar Erro de Teste
      </button>
      <button
        onClick={() => {
          // @ts-expect-error: intentional error for Sentry testing
          myUndefinedFunction();
        }}
        style={{
          padding: '12px 24px',
          backgroundColor: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        Disparar Erro de Função Inexistente
      </button>
    </div>
  );
}
