const fs = require('fs');

async function testTTS() {
  const text = '안녕하세요. 테스트입니다.';
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko-KR&client=tw-ob&q=${encodeURIComponent(text)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    console.log('Status:', res.status);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('Buffer length:', buffer.length);
      fs.writeFileSync('test.mp3', buffer);
    }
  } catch (err) {
    console.error(err);
  }
}

testTTS();
