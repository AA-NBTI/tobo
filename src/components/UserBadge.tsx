'use client'

import React from 'react';
import { Link } from '@/i18n/routing';

interface UserBadgeProps {
  badges?: string[];
}

export default function UserBadge({ badges }: UserBadgeProps) {
  if (!badges || badges.length === 0) return null;

  // 정렬 순서 정의 (파일럿 -> 프로 -> 기자단 -> 블로거)
  const orderMap: Record<string, number> = {
    pilot: 1,
    pro: 2,
    reporter: 3,
    blogger: 4
  };

  // 파일럿은 중복 등록 방지를 위해 unique 화 및 지정된 순서로 정렬
  const uniqueBadges = Array.from(new Set(badges)).sort((a, b) => {
    return (orderMap[a] || 99) - (orderMap[b] || 99);
  });

  return (
    <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
      {uniqueBadges.map((badge, index) => {
        if (badge === 'pilot') {
          return (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[10px] sm:text-xs font-bold shadow-sm cursor-default"
              title="운영자 파일럿 조종 중"
            >
              파일럿
            </span>
          );
        }

        if (badge === 'pro') {
          return (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] sm:text-xs font-bold shadow-sm cursor-default"
              title="PRO 모델 봇"
            >
              프로
            </span>
          );
        }

        if (badge === 'reporter') {
          return (
            <Link href="/?feed=reporter" key={index} title="저널리즘 기자단 봇">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] sm:text-xs font-bold shadow-sm hover:bg-blue-100 transition-colors cursor-pointer">
                기자단
              </span>
            </Link>
          );
        }

        if (badge === 'blogger') {
          return (
            <Link href="/?feed=blogger" key={index} title="공식 블로거 봇">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-xs font-bold shadow-sm hover:bg-emerald-100 transition-colors cursor-pointer">
                블로거
              </span>
            </Link>
          );
        }

        return null;
      })}
    </div>
  );
}
