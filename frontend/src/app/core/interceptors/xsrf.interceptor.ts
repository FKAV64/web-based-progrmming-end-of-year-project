import { HttpInterceptorFn } from '@angular/common/http';

function readCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(';');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

export const xsrfInterceptor: HttpInterceptorFn = (req, next) => {
  const method = req.method.toUpperCase();
  const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  if (!isMutating) {
    return next(req);
  }

  if (req.headers.has('X-XSRF-TOKEN')) {
    return next(req);
  }

  // Angular's built-in XSRF support only attaches headers for same-origin requests.
  // Our API base URL is absolute (`http://localhost:3000/api`), so we attach the token manually.
  const token = readCookie('XSRF-TOKEN');
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      headers: req.headers.set('X-XSRF-TOKEN', token),
    }),
  );
};

