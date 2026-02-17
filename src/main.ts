import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Suppress benign ResizeObserver error
const originalError = window.console.error;
window.console.error = (...args: any[]) => {
  const errorStr = args.map(a => (a && typeof a === 'object' && a.message) ? a.message : String(a)).join(' ');
  if (errorStr.includes('ResizeObserver loop completed with undelivered notifications')) {
    return;
  }
  originalError(...args);
};

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
