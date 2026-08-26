import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /shop/ 경로는 locale 처리 없이 바로 통과 (업체 공개 페이지)
  if (pathname.startsWith('/shop/')) {
    const res = NextResponse.next();
    res.headers.set('x-pathname', pathname);
    return res;
  }

  const response = intlMiddleware(request);
  response.headers.set('x-pathname', pathname);
  return response;
}
 
export const config = {
  matcher: ['/((?!api|auth|shop|_next|_vercel|.*\\..*).*)']
};
