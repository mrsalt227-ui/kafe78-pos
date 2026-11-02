import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Halaman order customer kini berjalan di domain/project terpisah
// (lihat VITE_CUSTOMER_APP_URL di .env). App ini hanya menyajikan dashboard POS.

createRoot(document.getElementById('root')!).render(<App />);
