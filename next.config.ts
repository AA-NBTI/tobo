import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // 서버 데이터 전송 용량 제한 상향 (기본 1MB -> 4MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default withNextIntl(nextConfig);