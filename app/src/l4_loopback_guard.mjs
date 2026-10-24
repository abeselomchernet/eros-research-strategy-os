// L4 local-only HTTP boundary. Defense in depth; caller MUST also bind to 127.0.0.1.
const mutation = new Set(['POST','PUT','PATCH','DELETE']);
export function assertLocalRequest(req, port) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid port');
  const expected = '127.0.0.1:' + port;
  const host = req.headers?.host;
  if (host !== expected) throw Error('Rejected Host');
  const method = String(req.method || '').toUpperCase();
  if (!['GET','HEAD','POST','PUT','PATCH','DELETE'].includes(method)) throw Error('Rejected method');
  const origin = req.headers?.origin;
  if (origin && origin !== 'http://' + expected) throw Error('Rejected Origin');
  if (mutation.has(method) && origin !== 'http://' + expected) throw Error('Missing same-origin proof');
  const fetchSite = req.headers?.['sec-fetch-site'];
  if (fetchSite && !['same-origin','none'].includes(fetchSite)) throw Error('Rejected fetch site');
  return true;
}
