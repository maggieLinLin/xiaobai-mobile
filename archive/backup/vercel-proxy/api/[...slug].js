// Vercel Serverless function: parallel-proxy + race-first-success
const DEFAULT_TIMEOUT = 3500;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function joinUrl(base, path, qs) {
  if (!base.endsWith('/')) base = base + '/';
  return base + path.replace(/^\/+/, '') + (qs ? `?${qs}` : '');
}

export default async function handler(req, res) {
  try {
    const raw = process.env.UPSTREAMS || '';
    const upstreams = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (upstreams.length === 0) {
      res.status(500).json({ error: 'No upstream configured. Set UPSTREAMS env var.'});
      return;
    }

    const slugParts = req.query.slug || [];
    const path = Array.isArray(slugParts) ? slugParts.join('/') : String(slugParts);

    const urlSearchParams = new URLSearchParams();
    for (const k of Object.keys(req.query)) {
      if (k === 'slug') continue;
      const v = req.query[k];
      if (Array.isArray(v)) v.forEach(x => urlSearchParams.append(k, x));
      else urlSearchParams.append(k, String(v));
    }
    const qs = urlSearchParams.toString();

    const controllers = [];
    const fetchers = upstreams.map(u => {
      const target = joinUrl(u, path, qs);
      const ac = new AbortController();
      controllers.push(ac);
      const headers = {
        'User-Agent': req.headers['user-agent'] || 'Vercel-Proxy',
        'Accept': req.headers['accept'] || '*/*',
      };
      if (req.headers.cookie) headers['Cookie'] = req.headers.cookie;

      const opts = { method: req.method, headers, signal: ac.signal };
      const timeout = DEFAULT_TIMEOUT;
      const p = new Promise(async (resolve, reject) => {
        const to = setTimeout(() => {
          ac.abort();
          reject(new Error('timeout'));
        }, timeout);

        try {
          const r = await fetch(target, opts);
          clearTimeout(to);
          if (r.ok) resolve({ resp: r, source: u });
          else reject(new Error('bad-status-' + r.status));
        } catch (err) {
          clearTimeout(to);
          reject(err);
        }
      });
      return p;
    });

    let winner;
    try {
      winner = await Promise.any(fetchers);
    } catch (errAny) {
      res.status(502).json({ error: 'All upstreams failed', detail: String(errAny) });
      return;
    } finally {
      controllers.forEach(c => {
        try { c.abort(); } catch(e) {}
      });
    }

    const upstreamResp = winner.resp;
    const contentType = upstreamResp.headers.get('content-type') || 'application/octet-stream';
    const contentLengthHeader = upstreamResp.headers.get('content-length');
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;

    if (!isNaN(contentLength) && contentLength > MAX_BYTES) {
      res.status(413).json({
        error: 'Upstream response too large',
        contentLength
      });
      return;
    }

    const buffer = await upstreamResp.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      res.status(413).json({
        error: 'Response too large',
        size: buffer.byteLength
      });
      return;
    }

    res.setHeader('Content-Type', contentType);
    const cacheControl = upstreamResp.headers.get('cache-control') || 'public, max-age=60';
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.status(upstreamResp.status).send(Buffer.from(buffer));
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'proxy-error', detail: String(err) });
  }
}
