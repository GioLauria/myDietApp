import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError, timer } from 'rxjs';
import { retry, mergeMap } from 'rxjs/operators';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // If it's a 429 (Too Many Requests), wait and retry
        if (error.status === 429) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, retryCount - 1) * 1000;
          console.warn(`Rate limit hit. Retrying in ${delayMs}ms... (Attempt ${retryCount})`);
          return timer(delayMs);
        }
        // For other errors, propagate immediately
        return throwError(() => error);
      }
    })
  );
};
