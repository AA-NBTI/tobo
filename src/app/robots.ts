import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/settings/'], // 관리자 및 설정 페이지는 검색 엔진 노출 방지
    },
    sitemap: 'https://nogoodnews.com/sitemap.xml',
  }
}
