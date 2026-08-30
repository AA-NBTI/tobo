const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testSearchAPI() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('--- Tool 1: 하단동 애견미용 검색 테스트 ---');
  
  // 실제 프론트엔드가 API 라우트를 호출하듯, 여기서는 직접 Supabase REST API를 쳐서 동일한 로직을 테스트합니다.
  const res = await fetch(url + "/rest/v1/businesses?category=eq.pet_grooming&region=eq.하단동&select=id,name,category,region,price_range,pet_size", {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  
  const data = await res.json();
  
  if (data.error) {
    console.error('검색 실패:', data.error);
    return;
  }
  
  console.log(`검색 성공! 총 ${data.length}개의 업체 발견:`);
  data.forEach(b => {
    console.log(`- [${b.name}] (가격: ${b.price_range}, 대상: ${b.pet_size})`);
  });
}

testSearchAPI();
