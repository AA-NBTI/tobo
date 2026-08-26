import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  

  return intlMiddleware(request);
}
 
export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
