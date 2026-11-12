const COURSE_API = 'https://hq.mega.dev/challenges/show-me-when/api';
const BOARD_ORIGIN = 'https://kinggarlock.github.io';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/^\/api(?=\/)/, '');
    const origin = request.headers.get('Origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
    if (origin === BOARD_ORIGIN) headers['Access-Control-Allow-Origin'] = origin;
    const respond = (body, status = 200) => new Response(JSON.stringify(body), {status,headers});
    if (origin && origin !== BOARD_ORIGIN) return respond({error:'Origin not allowed'},403);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
    if (request.method !== 'GET') return respond({error:'Method not allowed'},405);
    if (url.pathname === '/health') return respond({ready:Boolean(env.COURSE_SESSION)});
    if (!['/incidents','/ack'].includes(url.pathname)) return respond({error:'Not found'},404);
    if (!env.COURSE_SESSION) return respond({error:'Course session is not configured'},503);
    const upstream = new URL(COURSE_API + url.pathname);
    upstream.searchParams.set('t',env.COURSE_SESSION);
    for (const key of url.pathname === '/ack' ? ['id','cursor'] : ['since']) {
      const value = url.searchParams.get(key);
      if (value && value.length <= 4096) upstream.searchParams.set(key,value);
    }
    if (url.pathname === '/ack' && !upstream.searchParams.has('id')) return respond({error:'Incident ID required'},400);
    try {
      const response = await fetch(upstream,{redirect:'manual',headers:{Accept:'application/json'}});
      if (!response.ok) return respond({error:'Course API request failed'},response.status);
      const body = await response.json();
      // Return only the documented response fields; never forward credentials or headers.
      const publicBody = url.pathname === '/ack'
        ? {id:body.id,ackedAt:body.ackedAt,receipt:body.receipt}
        : {updatedAt:body.updatedAt,cursor:body.cursor,incidents:body.incidents?.map(i=>({id:i.id,service:i.service,region:i.region,summary:i.summary,severity:i.severity,openedAt:i.openedAt}))};
      return respond(publicBody);
    } catch {
      return respond({error:'Course API is unavailable'},502);
    }
  }
};
