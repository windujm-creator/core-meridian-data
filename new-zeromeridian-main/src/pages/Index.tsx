// ZERØ MERIDIAN — Index.tsx
// push25: wrap with memo() per ZM rules

import { memo } from 'react';

const Index = memo(() => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--zm-bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '2.25rem', fontWeight: 700, color: 'var(--zm-text-primary)' }}>
          ZERØ MERIDIAN
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--zm-text-secondary)' }}>
          Institutional-Grade Crypto Intelligence Terminal
        </p>
      </div>
    </div>
  );
});

Index.displayName = 'Index';
export default Index;
