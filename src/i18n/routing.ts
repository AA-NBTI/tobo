import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ko'],
 
  // Used when no locale matches
  defaultLocale: 'en',
  
  // Hide the prefix for the default locale (en)
  localePrefix: 'as-needed',

  // 모바일 쿠키 저장을 위해 자동 언어 감지 활성화 (NEXT_LOCALE 쿠키 우선 적용)
  localeDetection: true
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
