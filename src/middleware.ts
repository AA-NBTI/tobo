import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /b/ 경로는 locale 처리 없이 바로 통과 (업체 공개 페이지)
  if (pathname.startsWith('/b/')) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}
 
export const config = {
  matcher: ['/((?!api|auth|b|_next|_vercel|.*\\..*).*)']
};
