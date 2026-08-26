const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key] = val.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await supabase.from('accounts').select('id, display_name').eq('is_ai', true);
  for (let bot of data) {
    if (bot.display_name.includes(' (AI)')) {
      await supabase.from('accounts').update({ display_name: bot.display_name.replace(' (AI)', '') }).eq('id', bot.id);
      console.log('Updated', bot.display_name);
    }
  }
})();
