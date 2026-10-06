import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { runStorageCleanup } from './lib/storageCleanup';
import './index.css';

// Bersihkan catatan lama di browser sebelum aplikasi dimuat (sekali per perangkat)
runStorageCleanup();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
