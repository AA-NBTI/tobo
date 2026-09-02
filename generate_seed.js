const fs = require('fs');
const crypto = require('crypto');

const categories = [
  { id: 'dining', name: '맛집/식당', prefixes: ['하단', '동아대', '사하'], suffixes: ['고기집', '국밥', '파스타', '초밥', '횟집', '마라탕', '피자', '버거', '분식', '백반'] },
  { id: 'cafe', name: '카페', prefixes: ['하단역', '아트몰링', '동아대입구'], suffixes: ['로스터리', '디저트', '베이커리', '커피숍', '에스프레소바', '마카롱', '크로플', '빙수', '브런치', '티하우스'] },
  { id: 'bar', name: '술집', prefixes: ['하단', '동아대', '사하'], suffixes: ['이자카야', '포차', '호프', '펍', '와인바', '칵테일', '야시장', '맥주', '전집', '오뎅바'] },
  { id: 'hair_salon', name: '미용실', prefixes: ['하단역', '동아대', '아트몰링'], suffixes: ['헤어살롱', '바버샵', '미장원', '헤어스튜디오', '헤어룸', '머리잘하는곳', '헤어부띠끄', '헤어디자인', '맨즈헤어', '헤어샵'] },
  { id: 'pet_service', name: '반려동물', prefixes: ['하단', '동아대', '사하구'], suffixes: ['동물병원', '애견미용', '펫호텔', '펫택시', '강아지유치원', '애견카페', '펫용품점', '수제간식', '동물약국', '펫스튜디오'] },
  { id: 'nail_beauty', name: '네일/뷰티', prefixes: ['하단', '동아대', '사하'], suffixes: ['네일아트', '속눈썹', '왁싱', '에스테틱', '피부관리', '태닝', '스웨디시', '뷰티라운지', '메이크업', '스파'] },
  { id: 'fitness', name: '헬스/피트니스', prefixes: ['하단역', '아트몰링', '동아대'], suffixes: ['피트니스', '필라테스', '요가', '크로스핏', '복싱', '주짓수', 'PT샵', '기구필라테스', '체형교정', '바디핏'] },
  { id: 'studio', name: '사진관', prefixes: ['하단', '동아대', '사하'], suffixes: ['스튜디오', '사진관', '네컷사진', '프로필', '증명사진', '셀프스튜디오', '가족사진', '바디프로필', '흑백사진', '렌탈스튜디오'] },
  { id: 'accommodation', name: '숙박', prefixes: ['하단', '동아대', '사하구'], suffixes: ['모텔', '호텔', '게스트하우스', '스테이', '레지던스', '부띠끄호텔', '비즈니스호텔', '여관', '민박', '풀빌라'] },
  { id: 'clinic_human', name: '병원(사람)', prefixes: ['하단역', '아트몰링', '사하'], suffixes: ['내과', '치과', '피부과', '안과', '이비인후과', '정형외과', '한의원', '산부인과', '소아과', '통증의학과'] }
];

const regions = ['하단동', '하단1동', '하단2동', '당리동', '신평동'];
const priceRanges = ['$', '$$', '$$$', '$$$$'];

let sql = `-- ================================================================\n`;
sql += `-- 하단 상권 10개 업종 총 100개 더미 데이터 삽입\n`;
sql += `-- ================================================================\n\n`;
sql += `INSERT INTO public.businesses (id, name, description, category, region, price_range, address)\nVALUES\n`;

const values = [];
categories.forEach(cat => {
  for(let i=0; i<10; i++) {
    const id = crypto.randomUUID();
    const prefix = cat.prefixes[Math.floor(Math.random() * cat.prefixes.length)];
    const suffix = cat.suffixes[i];
    const name = `${prefix} ${suffix}`;
    const desc = `부산 하단 최고 인기 ${cat.name} 매장입니다.`;
    const region = regions[Math.floor(Math.random() * regions.length)];
    const price = priceRanges[Math.floor(Math.random() * priceRanges.length)];
    const address = `부산광역시 사하구 ${region} ${Math.floor(Math.random() * 999) + 1}-${Math.floor(Math.random() * 99) + 1}`;
    
    values.push(`  ('${id}', '${name}', '${desc}', '${cat.id}', '${region}', '${price}', '${address}')`);
  }
});

sql += values.join(',\n') + `\nON CONFLICT (id) DO NOTHING;\n`;

fs.writeFileSync('supabase/seed_hyperlocal_100.sql', sql);
console.log('Done generating seed_hyperlocal_100.sql');
