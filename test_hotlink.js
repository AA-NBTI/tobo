async function test() {
  const url = 'https://pixabay.com/get/g7656f3384a3ac8313b474503f9bf515576faaf9031fb020fa6997362d6a795b280234a39eb5e158a0f7a66793ba2ba14c00225855d5c297aac0fc919d50b392a_640.jpg';
  const res = await fetch(url, { headers: { referer: 'https://seotrump.vercel.app' } });
  console.log('With Referer:', res.status);
  
  const res2 = await fetch(url);
  console.log('No Referer:', res2.status);
}
test();
