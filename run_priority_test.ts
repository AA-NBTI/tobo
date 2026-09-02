import { rankRealBusinesses, RealBusiness } from './src/modules/tobo/engine/matching-scorer';

const mockBusinesses: RealBusiness[] = [
  { id: '1', name: '가성비 최강 동물병원', category: 'clinic', address: '', region: '사하구', pet_size: '소형견', price_range: '$', is_active: true, slug: '', rating: 3.5 },
  { id: '2', name: '가까운 동네 병원', category: 'clinic', address: '', region: '하단동', pet_size: '소형견', price_range: '$$', is_active: true, slug: '', rating: 4.0 },
  { id: '3', name: '동아대 최고 전문 동물병원', category: 'clinic', address: '', region: '사하구', pet_size: '소형견', price_range: '$$$', is_active: true, slug: '', rating: 5.0 },
  { id: '4', name: '24시 스피드 동물병원', category: 'clinic', address: '', region: '사하구', pet_size: '소형견', price_range: '$$', is_active: true, slug: '', rating: 4.2 },
];

const priorities = ['가격', '거리', '전문성', '빠른진료'];

console.log("=== 동적 가중치 우선순위(Priority) 테스트 ===\n");

for (const priority of priorities) {
  const pref = { target_category: 'clinic', preferred_region: '하단동', pet_size: '소형견', budget_level: '$', priority_select: priority };
  const ranked = rankRealBusinesses(mockBusinesses, pref);
  
  console.log(`[우선순위 선택: ${priority}]`);
  ranked.slice(0, 4).forEach((b, i) => {
    console.log(`  ${i+1}위: ${b.name} (총점: ${b.match_score}점)`);
    const s = b.score_breakdown;
    console.log(`       [Category:${s?.category_score.toFixed(1)} / Region:${s?.region_score.toFixed(1)} / PetSize:${s?.pet_size_score.toFixed(1)} / Price:${s?.price_score.toFixed(1)} / Expertise:${s?.expertise_score?.toFixed(1) || '0.0'} / Speed:${s?.speed_score?.toFixed(1) || '0.0'}]`);
  });
  console.log("");
}
