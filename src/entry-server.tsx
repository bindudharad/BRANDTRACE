import { renderToString } from 'react-dom/server';
import { StrictMode } from 'react';
import App from './App';

export async function render() {
  const appHtml = renderToString(
    <StrictMode>
      <App />
    </StrictMode>
  );
  return { appHtml };
}
