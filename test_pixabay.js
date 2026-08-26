const url1280 = 'https://pixabay.com/get/g9bd725bca5fe1efb02b41604407a7dc80fb05869ebdf52997f3c66db03c70f19dd1474cbfc81c47a44f74215cba25449d67b34d83b799a306dbf7ee77c5642db_1280.jpg';
const url640 = url1280.replace('_1280.jpg', '_640.jpg');

async function test() {
  const r = await fetch(url640);
  console.log(r.status, r.headers.get('content-type'));
}
test();
