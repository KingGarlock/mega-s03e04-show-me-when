const root = new URL('./app/', import.meta.url).pathname;
const server = Bun.serve({ port: 4314, fetch(request) {
  const path = decodeURIComponent(new URL(request.url).pathname);
  if (path.includes('..')) return new Response('Forbidden', { status: 403 });
  const file = Bun.file(root + (path === '/' ? 'index.html' : path.slice(1)));
  return new Response(file);
}});
console.log(server.url.href);
