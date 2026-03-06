import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ScreensaverApp from './ScreensaverApp';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScreensaverApp />
  </StrictMode>
);
