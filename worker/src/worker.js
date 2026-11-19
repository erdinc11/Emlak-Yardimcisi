/**
 * Emlak Yardımcısı — API katmanı
 *
 * - AI anahtarı yalnızca burada (wrangler secret) durur, istemciye asla gitmez.
 * - Şifre girişi + imzalı token (1 yıl hatırlanır).
 * - Belge, mesaj, fotoğraf ve geçmiş kayıtları Durable Object içinde SQLite'ta.
 * - Masaüstü <-> telefon canlı senkron: WebSocket.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    try {
      if (url.pathname === '/api/login' && request.method === 'POST') {
        return await login(request, env, origin);
      }

      if (url.pathname === '/api/health') {
        return json({ ok: true, model: env.AI_MODEL || 'deepseek-v4.1-flash' }, 200, origin);
      }

      const auth = await verifyToken(bearer(request) || url.searchParams.get('t'), env);
      if (!auth) return json({ error: 'unauthorized' }, 401, origin);

      // AI proxy (SSE)
      if (url.pathname === '/api/ai' && request.method === 'POST') {
        return await aiProxy(request, env, auth, origin);
      }

      // Kısa/uzun ömürlü eşleştirme token'ı (telefon QR'ı için)
      if (url.pathname === '/api/pair' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        if (!body.sid) return json({ error: 'sid gerekli' }, 400, origin);
        const token = await signToken({ scope: 'pair', sid: body.sid, exp: now() + 30 * 86400 }, env);
        return json({ token }, 200, origin);
      }

      if (url.pathname.startsWith('/api/doc/')) {
        // pair token yalnızca kendi belgesine erişebilir
        const sid = url.pathname.split('/')[3];
        if (auth.scope === 'pair' && auth.sid !== sid) {
          return json({ error: 'forbidden' }, 403, origin);
        }
        return await env.STORE.get(env.STORE.idFromName('main')).fetch(request);
      }

      if (url.pathname.startsWith('/api/history') || url.pathname.startsWith('/api/version/')) {
        if (auth.scope === 'pair') return json({ error: 'forbidden' }, 403, origin);
        return await env.STORE.get(env.STORE.idFromName('main')).fetch(request);
      }

      return json({ error: 'not found' }, 404, origin);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500, origin);
    }
  }
};

/* ----------------------------- auth ----------------------------- */

function now() { return Math.floor(Date.now() / 1000); }

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-opencode-session',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function bearer(request) {
  const h = request.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

function b64url(bytesOrString) {
  const bytes = typeof bytesOrString === 'string' ? enc.encode(bytesOrString) : bytesOrString;
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str) {
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return dec.decode(bytes);
}

async function hmac(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

async function signToken(payload, env) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(await hmac(body, env.TOKEN_SECRET || 'emlak-yardimcisi'));
  return body + '.' + sig;
}

async function verifyToken(token, env) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = b64url(await hmac(body, env.TOKEN_SECRET || 'emlak-yardimcisi'));
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(unb64url(body));
    if (!payload.exp || payload.exp < now()) return null;
    return payload;
  } catch { return null; }
}

async function login(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || '');
  const expected = String(env.PASSWORD || 'Erdinc1998');

  // sabit zamanlı karşılaştırma
  const a = enc.encode(password);
  const b = enc.encode(expected);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] || 0) ^ (b[i] || 0);

  if (diff !== 0) {
    await new Promise(r => setTimeout(r, 350));
    return json({ error: 'Şifre hatalı' }, 401, origin);
  }

  const token = await signToken({ scope: 'full', exp: now() + 365 * 86400 }, env);
  return json({ token }, 200, origin);
}

/* ----------------------------- AI proxy ----------------------------- */

async function aiProxy(request, env, auth, origin) {
  const body = await request.json();
  const sid = body.sessionId || request.headers.get('x-opencode-session') || 'emlak';
  delete body.sessionId;

  const base = (env.AI_BASE || 'https://opencode.ai/inference/go/openai/v1').replace(/\/$/, '');
  const upstream = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.AI_KEY}`,
      'Content-Type': 'application/json',
      'x-opencode-session': 'ses_' + sid
    },
    body: JSON.stringify({ ...body, model: body.model || env.AI_MODEL || 'deepseek-v4.1-flash' })
  });

  const headers = new Headers(cors(origin));
  headers.set('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('X-Accel-Buffering', 'no');

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(JSON.stringify({ error: 'AI hatası', detail: text.slice(0, 500) }), {
      status: upstream.status, headers: { ...cors(origin), 'Content-Type': 'application/json' }
    });
  }

  return new Response(upstream.body, { status: 200, headers });
}

/* ----------------------------- store ----------------------------- */

export class Store {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, title TEXT, doc TEXT, updated INTEGER);
      CREATE TABLE IF NOT EXISTS msgs (id TEXT PRIMARY KEY, doc_id TEXT, seq INTEGER, payload TEXT, created INTEGER);
      CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, doc_id TEXT, name TEXT, mime TEXT, status TEXT, data TEXT, origin TEXT, created INTEGER);
      CREATE TABLE IF NOT EXISTS versions (id TEXT PRIMARY KEY, doc_id TEXT, title TEXT, state TEXT, thumb TEXT, created INTEGER);
      CREATE INDEX IF NOT EXISTS idx_msgs_doc ON msgs(doc_id, seq);
      CREATE INDEX IF NOT EXISTS idx_photos_doc ON photos(doc_id, created);
      CREATE INDEX IF NOT EXISTS idx_versions_doc ON versions(created);
    `);
    try { this.sql.exec('ALTER TABLE versions ADD COLUMN thumb TEXT'); } catch (e) {}
    try { this.sql.exec('ALTER TABLE photos ADD COLUMN origin TEXT'); } catch (e) {}
  }

  async fetch(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // api doc :sid ...
    const isDoc = parts[1] === 'doc';
    const sid = isDoc ? parts[2] : null;
    const origin = request.headers.get('Origin') || '*';

    if (isDoc && request.method === 'GET' && parts[3] === 'ws') {
      return this.handleWs(request, sid);
    }

    if (isDoc && request.method === 'GET' && parts[3] === 'photo') {
      const row = this.sql.exec('SELECT mime, data FROM photos WHERE id=? AND doc_id=?', parts[4], sid).toArray()[0] || null;
      if (!row) return new Response('not found', { status: 404 });
      const raw = String(row.data || '');
      const b64 = raw.includes(',') ? raw.split(',').pop() : raw;
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      return new Response(bin, {
        headers: { 'Content-Type': row.mime || 'image/jpeg', 'Cache-Control': 'private, max-age=31536000' }
      });
    }

    if (isDoc && request.method === 'GET') {
      return json(await this.getDoc(sid), 200, origin);
    }

    if (isDoc && request.method === 'POST') {
      const body = await request.json();
      const result = await this.mutate(sid, body);
      return json(result, 200, origin);
    }

    if (isDoc && request.method === 'DELETE') {
      this.sql.exec('DELETE FROM msgs WHERE doc_id=?', sid);
      this.sql.exec('DELETE FROM photos WHERE doc_id=?', sid);
      this.sql.exec('DELETE FROM docs WHERE id=?', sid);
      this.broadcast(sid, { type: 'reset' });
      return json({ ok: true }, 200, origin);
    }

    if (parts[1] === 'history') {
      if (request.method === 'GET') {
        const rows = this.sql.exec(
          'SELECT id, doc_id, title, thumb, created FROM versions ORDER BY created DESC LIMIT 200'
        ).toArray();
        return json({ items: rows }, 200, origin);
      }
      if (request.method === 'POST') {
        const body = await request.json();
        const id = body.id || crypto.randomUUID();
        this.sql.exec(
          'INSERT OR REPLACE INTO versions (id, doc_id, title, state, thumb, created) VALUES (?,?,?,?,?,?)',
          id, body.docId || '', body.title || 'Belge', JSON.stringify(body.state || {}), body.thumb || '', Date.now()
        );
        return json({ id }, 200, origin);
      }
      if (request.method === 'DELETE' && parts[2]) {
        this.sql.exec('DELETE FROM versions WHERE id=?', parts[2]);
        return json({ ok: true }, 200, origin);
      }
      return json({ error: 'bad request' }, 400, origin);
    }

    if (parts[1] === 'version' && parts[2]) {
      const row = this.sql.exec('SELECT * FROM versions WHERE id=?', parts[2]).toArray()[0] || null;
      if (!row) return json({ error: 'not found' }, 404, origin);
      return json(row, 200, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  }

  getDoc(sid) {
    const doc = this.sql.exec('SELECT * FROM docs WHERE id=?', sid).toArray()[0] || null;
    const msgs = this.sql.exec('SELECT payload FROM msgs WHERE doc_id=? ORDER BY seq ASC LIMIT 400', sid).toArray();
    const photos = this.sql.exec(
      'SELECT id, name, status, origin, created FROM photos WHERE doc_id=? ORDER BY created ASC', sid
    ).toArray();
    return {
      sid,
      doc: doc ? JSON.parse(doc.doc) : null,
      title: doc ? doc.title : '',
      updated: doc ? doc.updated : 0,
      messages: msgs.map(m => JSON.parse(m.payload)),
      photos
    };
  }

  async mutate(sid, body) {
    const op = body.op;
    const t = Date.now();

    if (op === 'doc') {
      this.sql.exec(
        'INSERT INTO docs (id, title, doc, updated) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, doc=excluded.doc, updated=excluded.updated',
        sid, body.title || '', JSON.stringify(body.doc || {}), t
      );
      this.broadcast(sid, { type: 'doc', doc: body.doc, title: body.title });
      return { ok: true };
    }

    if (op === 'message') {
      const m = body.message;
      const seq = this.nextSeq(sid);
      this.sql.exec('INSERT INTO msgs (id, doc_id, seq, payload, created) VALUES (?,?,?,?,?)',
        m.id, sid, seq, JSON.stringify(m), t);
      this.broadcast(sid, { type: 'message', message: m });
      return { ok: true, seq };
    }

    if (op === 'patchMessage') {
      const row = this.sql.exec('SELECT payload FROM msgs WHERE id=? AND doc_id=?', body.id, sid).toArray()[0] || null;
      if (!row) return { ok: false };
      const m = { ...JSON.parse(row.payload), ...body.patch };
      this.sql.exec('UPDATE msgs SET payload=? WHERE id=?', JSON.stringify(m), body.id);
      this.broadcast(sid, { type: 'patchMessage', id: body.id, patch: body.patch });
      return { ok: true };
    }

    if (op === 'deleteMessage') {
      this.sql.exec('DELETE FROM msgs WHERE id=? AND doc_id=?', body.id, sid);
      this.broadcast(sid, { type: 'deleteMessage', id: body.id });
      return { ok: true };
    }

    if (op === 'photo') {
      const p = body.photo;
      this.sql.exec(
        'INSERT OR REPLACE INTO photos (id, doc_id, name, mime, status, data, origin, created) VALUES (?,?,?,?,?,?,?,?)',
        p.id, sid, p.name || 'foto.jpg', p.mime || 'image/jpeg', p.status || 'processing',
        String(p.data || '').includes(',') ? String(p.data).split(',').pop() : (p.data || ''),
        p.origin || '', t
      );
      this.broadcast(sid, { type: 'photo', photo: { id: p.id, name: p.name, status: p.status, origin: p.origin || '', created: t } });
      return { ok: true };
    }

    if (op === 'photoStatus') {
      const row = this.sql.exec('SELECT status FROM photos WHERE id=? AND doc_id=?', body.id, sid).toArray()[0] || null;
      if (!row) return { ok: false };
      this.sql.exec('UPDATE photos SET status=? WHERE id=?', body.status, body.id);
      this.broadcast(sid, { type: 'photoStatus', id: body.id, status: body.status, meta: body.meta || null });
      return { ok: true };
    }

    if (op === 'deletePhoto') {
      this.sql.exec('DELETE FROM photos WHERE id=? AND doc_id=?', body.id, sid);
      this.broadcast(sid, { type: 'deletePhoto', id: body.id });
      return { ok: true };
    }

    if (op === 'activity') {
      this.broadcast(sid, { type: 'activity', activity: body.activity });
      return { ok: true };
    }

    if (op === 'stream') {
      this.broadcast(sid, { type: 'stream', id: body.id, delta: body.delta });
      return { ok: true };
    }

    if (op === 'reset') {
      this.sql.exec('DELETE FROM msgs WHERE doc_id=?', sid);
      this.sql.exec('DELETE FROM photos WHERE doc_id=?', sid);
      this.sql.exec('DELETE FROM docs WHERE id=?', sid);
      this.broadcast(sid, { type: 'reset' });
      return { ok: true };
    }

    return { ok: false };
  }

  nextSeq(sid) {
    const r = this.sql.exec('SELECT COALESCE(MAX(seq),0)+1 AS n FROM msgs WHERE doc_id=?', sid).toArray()[0] || { n: 1 };
    return r.n;
  }

  handleWs(request, sid) {
    const url = new URL(request.url);
    const role = url.searchParams.get('role') || 'desktop';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ sid, role });
    server.send(JSON.stringify({ type: 'hello', sid }));
    this.broadcast(sid, { type: 'presence', role, online: true });
    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(sid, payload) {
    const data = JSON.stringify({ ...payload, sid });
    for (const ws of this.state.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment();
        if (att && att.sid && att.sid !== sid) continue;
        ws.send(data);
      } catch (e) { /* kapalı soket */ }
    }
  }

  async webSocketMessage(ws, message) {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      if (msg.type === 'typing') {
        const att = ws.deserializeAttachment() || {};
        this.broadcast(att.sid || msg.sid, { type: 'typing', from: msg.from, value: !!msg.value });
      }
    } catch (e) { /* yoksay */ }
  }

  async webSocketClose(ws) {
    try { ws.close(); } catch (e) {}
  }
}
