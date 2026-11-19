/* ============================================================
   Emlak Yardımcısı — oturum çekirdeği
   Belge durumu, mesajlar, fotoğraflar, AI turu ve canlı senkron.
   Masaüstü ve telefon aynı modülü kullanır.
   ============================================================ */
(() => {
  const C = window.Contract;

  const cfg = window.EMLAK_CONFIG || {};
  const API = (cfg.api || '').replace(/\/$/, '');

  const SYSTEM_BASE = `Sen "Emlak Yardımcısı" adlı, Türkiye'de kira sözleşmesi hazırlamaya yardım eden bir asistansın.
Kullanıcı teknolojiyle çok ilgili değil; yaşı ilerlemiş, sabırlı ve sade bir dille konuşulması gereken biri.
Her zaman TÜRKÇE, kısa, sıcak ve net yaz. Teknik terim, JSON, kod bloğu gösterme. Gereksiz uzun açıklama yapma.

TEMEL ÇALIŞMA BİÇİMİ — ÖNCE İŞLE, SONRA SOR
- Kullanıcıdan minimum bilgi iste. Her soru gerçekten gerekli olmalı.
- Bir fotoğraf geldiğinde önce elinden geleni yap: belgeyi tanı, içindeki isim, T.C., telefon, adres, tarih, tutar, IBAN gibi bilgileri çıkar ve belgeye yerleştir.
- "Bu hangi belge?" diye ASLA sorma. Belge türünü içeriğinden kendin anla (kimlik, ehliyet, pasaport, tapu, kira sözleşmesi, banka/IBAN bilgisi, WhatsApp ekran görüntüsü, fatura, not).
- "Bilirsem daha iyi yerleştiririm" gibi ön sorular sorma. Önce yerleştir, sonra yalnızca gerçekten belirsiz kalanı sor.
- Fotoğraf okunamıyorsa, çok bulanıksa veya hiçbir bilgi çıkaramıyorsan yalnızca o zaman tek bir kısa soru sor: "Fotoğraf biraz bulanık çıkmış, tekrar çekebilir misiniz?" gibi.
- T.C. kimlik numarasını asla uydurma. 11 haneli değilse veya okunamıyorsa sor.
- Fotoğrafta olmayan hiçbir bilgiyi uydurma.

ÇOK ÖNEMLİ — FOTOĞRAFLARI BİRLİKTE DÜŞÜN
- Aynı mesajda birden fazla fotoğraf varsa HER FOTOĞRAF İÇİN AYRI SORU SORMA. Önce hepsini birlikte incele, içlerindeki isim, T.C., telefon, adres, tarih, tutar bilgilerini çıkar ve birbiriyle eşleştir.
- Örnek: bir WhatsApp ekran görüntüsünde "Ahmet Yılmaz" adı ve bir telefon numarası, ayrıca bir kimlik kartında "Ahmet Yılmaz" varsa; telefonun Ahmet Yılmaz'a ait olduğunu kendin anlarsın. Sadece "Ahmet Yılmaz kimdir?" diye sorarsın. Telefonu ayrıca sormazsın.
- İsimler tutuyorsa (büyük/küçük harf, Türkçe karakter farkı önemsiz) bunları aynı kişi kabul et.
- İsimler çelişiyorsa (ör. kimlikte "Ahmet Yılmaz", ekran görüntüsünde "Mehmet Yılmaz") tahmin etme; seçenekli tek bir soru sor.
- Aynı bilgi hem belgede hem fotoğrafta varsa ve farklıysa hangisinin kalacağını sor.
- Bir turda EN FAZLA 3 soru sor ve hepsini TEK bir soru kartında topla.
- Zaten belgede dolu olan bir alanı sorma. Sadece gerçekten belirsiz olanı sor.
- Telefon numarasını, isimle eşleştirebiliyorsan doğrudan ilgili kişinin alanına yaz.

SORU SORMA KURALLARI
- Önce set_fields ile bildiğin her şeyi yaz. Ancak ondan sonra, gerçekten belirsiz kalan kişi-rol eşleştirmelerini "ask" aracıyla sor.
- "Bu kimlik kimin?" gibi sorularda seçenekleri kişi rolleri olarak ver: "Kiraya Veren", "Kiracı", "Kefil", "İkinci Kiracı", "İkinci Kiraya Veren", "İkinci Kefil".
- Kullanıcı isterse kendi cevabını yazabilsin diye allowFreeText true olsun.
- Kullanıcı soruları atlayabilir. Atlamak isterse "Atla" / "Tüm soruları atla" seçeneğini kullanır; atlanan soruları hemen tekrar sorma. Kullanıcı daha sonra fotoğrafla veya kendi mesajıyla tamamlar.
- Soru metni çok kısa ve anlaşılır olsun. Örn. "Bu kimlik hangi tarafa ait?".
- Soruları sorduktan sonra turu bitir; cevap gelince devam et ve cevabı hemen alanlara uygula.
- Eksik zorunlu alanlar için de tek kartta, en fazla 3 soru sor. Adres gibi birden çok parçayı gereksiz yere tek tek sorma; mümkünse tek soruda topla.

ARAÇLAR
- set_fields: Belge alanlarını doldur. Sadece emin olduğun alanları yaz. Yeni bilgi geldiğinde toplu gönder.
- ask: Hazır seçenekli soru kartı göster. Cevap gelene kadar bekle.
- add_clause: Belgeye yeni bir madde ekle (24, 25... diye numaralanır).
- edit_clause: Numaralı bir maddenin metnini değiştir (no: 11-24).
- reset_clause: Maddeyi özgün metnine döndür.

ÜSLUP
- İşlem yaptıktan sonra tek cümleyle ne yaptığını söyle. Örn. "Kiracı bilgilerini yerleştirdim."
- Eksik alan varsa en sonda kibarca hatırlat: "3 alan eksik kaldı, istersen soralım."
- Kullanıcı ekstra istekte bulunursa önce ne yapacağını bir cümleyle söyle, sonra aracı çağır.
- Asla "veri tabanı", "API", "token" gibi kelimeler kullanma.`;

  const FIELD_TYPE = {
    province: 'text', district: 'text', neighborhood: 'text', street: 'text',
    buildingNo: 'text', buildingName: 'text', apartmentNo: 'text',
    landlordName: 'text', landlordTckn: 'tckn', landlordPhone: 'phone',
    landlord2Name: 'text', landlord2Tckn: 'tckn', landlord2Phone: 'phone',
    tenantName: 'text', tenantTckn: 'tckn', tenantPhone: 'phone',
    tenant2Name: 'text', tenant2Tckn: 'tckn', tenant2Phone: 'phone',
    tenantBusinessAddress: 'text',
    guarantorName: 'text', guarantorTckn: 'tckn', guarantorPhone: 'phone',
    guarantor2Name: 'text', guarantor2Tckn: 'tckn', guarantor2Phone: 'phone',
    leaseStart: 'date', commitmentDate: 'date',
    durationValue: 'int', durationUnit: 'enum:year|month',
    landlord2Enabled: 'bool', tenant2Enabled: 'bool', guarantor2Enabled: 'bool',
    monthlyRent: 'money', paymentMethod: 'enum:iban|cash', depositManual: 'money', depositOneRent: 'bool',
    daskPolicyNo: 'text', paymentDayFrom: 'int', paymentDayTo: 'int',
    iban: 'iban', demirbaslar: 'text', propertyType: 'text',
    durationText: 'text', propertyCondition: 'text'
  };

  const TOOLS = [
    {
      type: 'function',
      function: {
        name: 'set_fields',
        description: 'Sözleşmedeki alanları doldurur. Sadece emin olunan alanlar gönderilir. Birden fazla alan tek çağrıda gönderilebilir.',
        parameters: {
          type: 'object',
          properties: {
            fields: {
              type: 'object',
              description: 'Alan anahtarı -> değer. Örn. {"tenantName":"Ahmet Yılmaz","tenantTckn":"12345678901"}',
              additionalProperties: true
            }
          },
          required: ['fields']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'ask',
        description: 'Kullanıcıya hazır seçenekli, tek kart içinde sorular sorar. Cevap gelene kadar tur biter.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Kart başlığı, kısa. Örn. "Kimlik kime ait?"' },
            questions: {
              type: 'array',
              maxItems: 4,
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string', description: 'Kısa alan adı, ör. "Kimlikteki kişi"' },
                  question: { type: 'string', description: 'Sorunun kendisi' },
                  options: { type: 'array', items: { type: 'string' } },
                  allowFreeText: { type: 'boolean' },
                  field: { type: 'string', description: 'Varsa ilgili belge alanı anahtarı' }
                },
                required: ['id', 'label', 'question', 'options']
              }
            }
          },
          required: ['title', 'questions']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'add_clause',
        description: 'Belgeye yeni bir madde ekler.',
        parameters: {
          type: 'object',
          properties: { text: { type: 'string', description: 'Maddenin tam metni' } },
          required: ['text']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'edit_clause',
        description: 'Numaralı bir maddenin metnini değiştirir. Genel Koşullar 1-10 için section=general, sözleşme maddeleri 11-24 için section=contract kullan.',
        parameters: {
          type: 'object',
          properties: {
            no: { type: 'integer', description: 'Madde numarası (genel: 1-10, sözleşme: 11-24)' },
            section: { type: 'string', enum: ['contract', 'general'], description: 'Maddenin bulunduğu bölüm' },
            text: { type: 'string', description: 'Yeni metin' }
          },
          required: ['no', 'text']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'reset_clause',
        description: 'Değiştirilmiş bir maddeyi özgün metnine döndürür.',
        parameters: {
          type: 'object',
          properties: {
            no: { type: 'integer', description: 'Madde numarası' },
            section: { type: 'string', enum: ['contract', 'general'], description: 'Maddenin bulunduğu bölüm' }
          },
          required: ['no']
        }
      }
    }
  ];

  /* ------------------------------ yardımcılar ------------------------------ */

  const now = () => Date.now();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + now());

  function parseDateInput(v) {
    const s = String(v ?? '').trim();
    if (!s) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (m) {
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }
    return s;
  }

  function tcknValid(v) {
    const s = String(v || '');
    if (!/^\d{11}$/.test(s) || s[0] === '0') return false;
    const d = s.split('').map(Number);
    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    const tenth = ((odd * 7) - even) % 10;
    if (((tenth + 10) % 10) !== d[9]) return false;
    const total = d.slice(0, 10).reduce((a, b) => a + b, 0);
    return total % 10 === d[10];
  }

  function normalizeValue(key, value) {
    const type = FIELD_TYPE[key];
    if (value === null || value === undefined) return value;
    if (type === 'bool') return value === true || value === 'true' || value === 1 || value === '1';
    if (type === 'tckn') return C.onlyDigits(value).slice(0, 11);
    if (type === 'phone') return C.normalizePhoneDigits(value);
    if (type === 'date') return parseDateInput(value);
    if (type === 'money' || type === 'int') {
      const n = Number(String(value).replace(/[^\d]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    if (type === 'iban') return String(value).replace(/\s+/g, '').toUpperCase();
    if (key === 'paymentMethod') return /cash|elden|nakit/i.test(String(value)) ? 'cash' : 'iban';
    if (type === 'enum:year|month') return /month|ay/i.test(String(value)) ? 'month' : 'year';
    return String(value);
  }

  const dateStr = t => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  /* ------------------------------ oturum ------------------------------ */

  class Session {
    constructor({ sid, token, role = 'desktop', onChange }) {
      this.sid = sid;
      this.token = token;
      this.role = role;
      this.onChange = onChange || (() => {});
      this.doc = null;
      this.title = '';
      this.messages = [];
      this.photos = [];
      this.busy = false;
      this.remoteBusy = false;
      this.ownTurn = false;
      this.destroyed = false;
      this.ws = null;
      this.online = false;
      this.remote = new Set();
      this.dataCache = new Map();
      this.streamMsgId = null;
    }

    emit(ev) { try { this.onChange(ev); } catch (e) { console.warn(e); } }

    headers(extra) {
      return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token, ...(extra || {}) };
    }

    photoUrl(id) {
      return `${API}/api/doc/${this.sid}/photo/${id}?t=${encodeURIComponent(this.token)}`;
    }

    async load() {
      const res = await fetch(`${API}/api/doc/${this.sid}`, { headers: this.headers() });
      if (res.status === 401) throw new Error('auth');
      if (!res.ok) throw new Error('load');
      const data = await res.json();
      this.doc = data.doc || null;
      this.title = data.title || '';
      this.messages = data.messages || [];
      this.photos = data.photos || [];
      this.emit({ type: 'ready' });
      return this;
    }

    newDoc() {
      this.doc = {
        ...JSON.parse(JSON.stringify(C.defaults)),
        createdAt: now(),
        updatedAt: now()
      };
      this.title = 'Yeni kira sözleşmesi';
      this.messages = [];
      this.photos = [];
      this.emit({ type: 'ready' });
      return this.persistDoc();
    }

    get state() { return this.doc || C.defaults; }

    async persistDoc() {
      this.doc.updatedAt = now();
      this.title = C.fileNameBase(this.state);
      await this.post({ op: 'doc', doc: this.doc, title: this.title });
      this.emit({ type: 'doc', doc: this.doc, title: this.title });
    }

    async post(body) {
      const res = await fetch(`${API}/api/doc/${this.sid}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body)
      });
      if (res.status === 401) throw new Error('auth');
      if (!res.ok) throw new Error('save');
      return res.json().catch(() => ({}));
    }

    /* -------- canlı bağlantı -------- */

    destroy() {
      this.destroyed = true;
      clearInterval(this.heartbeat);
      try { if (this.ws) this.ws.close(); } catch (e) {}
      this.ws = null;
    }

    connect() {
      if (this.destroyed) return;
      if (this.ws) { try { this.ws.close(); } catch (e) {} }
      const base = API.replace(/^http/, 'ws');
      const ws = new WebSocket(`${base}/api/doc/${this.sid}/ws?t=${encodeURIComponent(this.token)}&role=${this.role}`);
      this.ws = ws;

      ws.onopen = () => {
        this.online = true;
        this.emit({ type: 'connection', online: true });
        this.heartbeat = setInterval(() => {
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
        }, 25000);
      };

      ws.onclose = () => {
        this.online = false;
        clearInterval(this.heartbeat);
        this.emit({ type: 'connection', online: false });
        if (!this.destroyed) setTimeout(() => this.connect(), 2200);
      };

      ws.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.sid && m.sid !== this.sid) return;
        this.handleEvent(m);
      };
    }

    handleEvent(m) {
      switch (m.type) {
        case 'hello':
          break;
        case 'presence':
          if (m.role === 'phone') {
            if (m.online) this.remote.add('phone'); else this.remote.delete('phone');
            this.emit({ type: 'presence', role: m.role, online: m.online });
          }
          break;
        case 'doc':
          this.doc = m.doc;
          this.title = m.title || this.title;
          this.emit({ type: 'doc', doc: m.doc, title: this.title });
          break;
        case 'message': {
          if (this.messages.some(x => x.id === m.message.id)) break;
          this.messages.push(m.message);
          this.emit({ type: 'message', message: m.message });
          break;
        }
        case 'patchMessage': {
          const msg = this.messages.find(x => x.id === m.id);
          if (msg) Object.assign(msg, m.patch);
          this.emit({ type: 'patch', id: m.id, patch: m.patch });
          break;
        }
        case 'deleteMessage':
          this.messages = this.messages.filter(x => x.id !== m.id);
          this.emit({ type: 'delete', id: m.id });
          break;
        case 'photo':
          if (!this.photos.some(p => p.id === m.photo.id)) {
            this.photos.push(m.photo);
            this.emit({ type: 'photo', photo: m.photo });
          }
          break;
        case 'photoStatus': {
          const p = this.photos.find(x => x.id === m.id);
          if (p) { p.status = m.status; if (m.meta) p.meta = m.meta; }
          this.emit({ type: 'photoStatus', id: m.id, status: m.status, meta: m.meta });
          break;
        }
        case 'deletePhoto':
          this.photos = this.photos.filter(x => x.id !== m.id);
          this.emit({ type: 'photoDeleted', id: m.id });
          break;
        case 'stream':
          if (this.ownTurn) break;
          if (m.id !== this.streamMsgId) {
            this.streamMsgId = m.id;
            if (!this.messages.some(x => x.id === m.id)) {
              const msg = { id: m.id, role: 'assistant', kind: 'text', text: '', at: now() };
              this.messages.push(msg);
              this.emit({ type: 'message', message: msg });
            }
          }
          {
            const msg = this.messages.find(x => x.id === m.id);
            if (msg) { msg.text = (msg.text || '') + m.delta; this.emit({ type: 'stream', id: m.id, delta: m.delta }); }
          }
          break;
        case 'activity':
          this.remoteBusy = !!m.activity;
          this.emit({ type: 'activity', activity: m.activity });
          break;
        case 'reset':
          this.doc = { ...JSON.parse(JSON.stringify(C.defaults)), createdAt: now(), updatedAt: now() };
          this.title = 'Kira Sözleşmesi';
          this.messages = [];
          this.photos = [];
          this.dataCache.clear();
          this.emit({ type: 'reset' });
          break;
        default:
          break;
      }
    }

    setActivity(activity) {
      this.remoteBusy = !!activity;
      this.emit({ type: 'activity', activity });
      this.post({ op: 'activity', activity }).catch(() => {});
    }

    /* -------- fotoğraflar -------- */

    async compress(file) {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });
      const max = 1500;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    }

    async addPhoto(file, origin) {
      const data = await this.compress(file);
      const mime = 'image/jpeg';
      const photo = {
        id: uid(),
        name: (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg',
        mime,
        data,
        status: 'new',
        origin: origin || 'desktop'
      };
      await this.post({ op: 'photo', photo });
      if (!this.photos.some(p => p.id === photo.id)) {
        this.photos.push({ id: photo.id, name: photo.name, status: 'new', origin: photo.origin, created: now() });
      }
      this.dataCache.set(photo.id, data);
      this.emit({ type: 'photo', photo: { id: photo.id, name: photo.name, status: 'new', origin: photo.origin, created: now() } });
      return photo.id;
    }

    async photoData(id) {
      if (this.dataCache.has(id)) return this.dataCache.get(id);
      const res = await fetch(this.photoUrl(id));
      if (!res.ok) return null;
      const blob = await res.blob();
      const url = await new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(blob);
      });
      this.dataCache.set(id, url);
      return url;
    }

    async setPhotoStatus(id, status) {
      const p = this.photos.find(x => x.id === id);
      if (p) p.status = status;
      await this.post({ op: 'photoStatus', id, status }).catch(() => {});
    }

    /* -------- mesajlar -------- */

    async reset() {
      if (this.busy || this.remoteBusy) throw new Error('busy');
      await this.post({ op: 'reset' });
      this.doc = { ...JSON.parse(JSON.stringify(C.defaults)), createdAt: now(), updatedAt: now() };
      this.title = 'Kira Sözleşmesi';
      this.messages = [];
      this.photos = [];
      this.dataCache.clear();
      this.streamMsgId = null;
      this.emit({ type: 'reset' });
      await this.persistDoc();
    }

    async addMessage(msg, persist = true) {
      if (!this.messages.some(x => x.id === msg.id)) this.messages.push(msg);
      await this.post({ op: 'message', message: msg });
      this.emit({ type: 'message', message: msg });
    }

    async patchMessage(id, patch) {
      const msg = this.messages.find(x => x.id === id);
      if (msg) Object.assign(msg, patch);
      await this.post({ op: 'patchMessage', id, patch });
      this.emit({ type: 'patch', id, patch });
    }

    /* -------- kullanıcı gönderimi -------- */

    async send({ text, refs = [], photoIds = [] }) {
      if (this.busy || this.remoteBusy) return;
      const openCards = this.messages.filter(m => m.kind === 'question' && !m.answered && !m.closed);
      for (const c of openCards) await this.patchMessage(c.id, { closed: true });
      const message = {
        id: uid(),
        role: 'user',
        kind: 'text',
        text: String(text || '').trim(),
        refs: refs.map(r => ({ key: r.key, label: r.label })),
        photos: photoIds.slice(),
        at: now()
      };
      if (!message.text && !photoIds.length) return;
      await this.addMessage(message);
      await this.runTurn(message, photoIds);
    }

    async submitAnswers(messageId, answers) {
      const card = this.messages.find(x => x.id === messageId);
      if (!card || card.kind !== 'question' || card.answered) return;

      if (!answers.length) return;
      const cash = answers.some(a => a.cash || (
        /elden|nakit/i.test(String(a.value)) &&
        (a.field === 'iban' || a.field === 'paymentMethod' || /iban|ödeme/i.test(String(a.value)))
      ));
      if (cash) {
        this.doc.paymentMethod = 'cash';
        await this.persistDoc();
      }

      const skipped = (card.questions || []).filter(q => !answers.some(a => a.id === q.id));
      let summary = answers.map(a => {
        const q = (card.questions || []).find(x => x.id === a.id);
        return `${q ? q.label : a.id}: ${a.value}`;
      }).join('\n');
      if (skipped.length) {
        summary += `\n(Atlanan sorular: ${skipped.map(q => q.label).join(', ')} — bunları şimdilik tekrar sorma; kullanıcı daha sonra fotoğrafla tamamlayabilir.)`;
      }

      const msg = {
        id: uid(),
        role: 'user',
        kind: 'answers',
        text: summary,
        answers: answers,
        at: now()
      };
      await this.addMessage(msg);
      await this.patchMessage(messageId, { answered: true, answers });

      // fotoğraf durumlarını "işlendi"ye çekme, AI turu bitince yapılacak
      await this.runTurn(msg, []);
    }

    /* -------- AI turu -------- */

    historyForAI(images) {
      const out = [];
      const list = this.messages.slice(-40);
      for (const m of list) {
        if (m.kind === 'question') {
          out.push({ role: 'assistant', content: 'Soru: ' + (m.questions || []).map(q => q.question).join(' / ') });
          continue;
        }
        if (m.kind === 'answers') {
          out.push({ role: 'user', content: m.text });
          continue;
        }
        if (m.kind === 'updates' || m.kind === 'notice') continue;
        if (m.role === 'assistant') {
          if (m.text) out.push({ role: 'assistant', content: m.text });
          continue;
        }
        if (m.role === 'user') {
          const parts = [];
          let content = m.text || '';
          const refs = (m.refs || []).map(r => `${r.label}${shouldShowValue(r.key) ? ' (şu an: ' + shortValue(r.key) + ')' : ''}`);
          if (refs.length) content += (content ? '\n' : '') + '[Başvurulan alanlar: ' + refs.join(', ') + ']';
          parts.push({ type: 'text', text: content || '(fotoğraf)' });

          let n = 0;
          for (const pid of (m.id === images.current ? images.ids : [])) {
            const data = images.map && images.map[pid];
            if (!data) continue;
            const p = this.photos.find(x => x.id === pid);
            n++;
            parts.push({ type: 'text', text: `Fotoğraf ${n}: ${p ? p.name : 'belge'}` });
            parts.push({ type: 'image_url', image_url: { url: data } });
          }
          out.push({ role: 'user', content: parts });
        }
      }
      return out;
    }

    buildSystemPrompt() {
      const s = this.state;
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const trDate = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const trTime = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul');
      const filled = [];
      const empty = [];
      for (const g of C.GROUPS) {
        for (const key of g.keys) {
          if (key === 'iban' && s.paymentMethod === 'cash') continue;
          if (['landlord2Name', 'landlord2Tckn', 'landlord2Phone', 'tenant2Name', 'tenant2Tckn', 'tenant2Phone', 'guarantor2Name', 'guarantor2Tckn', 'guarantor2Phone'].includes(key)) {
            if (!s[key.replace(/2/, '2Enabled')] && !s[key]) continue;
          }
          const v = s[key];
          if (C.isBlank(v) || v === false) empty.push(`${key} (${C.LABELS[key]})`);
          else filled.push(`${key} (${C.LABELS[key]}) = ${formatValue(key, v)}`);
        }
      }

      const missing = C.missingDetails(s).map(m => m.text);
      const photoList = this.photos.map((p, i) => `#${i + 1} ${p.name} [${p.status}]`).join(', ');

      return `${SYSTEM_BASE}

BUGÜNÜN TARİHİ
- Bugün ${trDate}. ISO tarihi: ${iso}. Saat: ${trTime} (${tz}).
- "Bugün", "yarın", "gelecek hafta", "bu ay" gibi ifadeleri bu tarihe göre hesapla.
- Bugünün tarihini kullanıcıya ASLA sorma; burada yazıyor.
- Kullanıcı "taahhüt tarihi bugün olsun", "başlangıç bugün" gibi bir şey derse ${iso} tarihini kullan.
- Tarih alanı boşsa ve kullanıcı bir tarih söylemediyse kendi kendine tarih uydurma; kısa bir onay sorusu sor (ör. "Taahhüt tarihi bugün, ${iso} olsun mu?").

BELGE DURUMU (canlı)
- Başlık: ${this.title || 'Yeni kira sözleşmesi'}
- Dolu alanlar:
${filled.length ? filled.map(x => '  • ' + x).join('\n') : '  • (henüz yok)'}
- Boş alanlar:
${empty.length ? empty.map(x => '  • ' + x).join('\n') : '  • (yok)'}
- Eksik zorunlu alanlar: ${missing.length ? missing.join('; ') : 'yok'}
- Oturumdaki fotoğraflar: ${photoList || 'yok'}
- Değiştirilmiş maddeler → sözleşme: ${Object.keys(s.clauseOverrides || {}).join(', ') || 'yok'}; genel koşullar: ${Object.keys(s.generalOverrides || {}).join(', ') || 'yok'}
- Ek maddeler: ${(s.customClauses || []).length}

ALAN LİSTESİ (set_fields için anahtarlar)
${C.GROUPS.map(g => `${g.title}: ` + g.keys.map(k => `${k}=${C.LABELS[k]}${FIELD_TYPE[k] ? ' [' + FIELD_TYPE[k] + ']' : ''}`).join(', ')).join('\n')}

Tarih alanları YYYY-AA-GG formatında, T.C. 11 rakam, telefon 10/11 rakam, IBAN TR ile 26 karakter, para alanları sadece rakam olarak gönderilsin.

ÖDEME ŞEKLİ
- Kira "elden" ödenebilir. Kullanıcı elden/nakit/IBAN'sız derse paymentMethod='cash' yap; IBAN sorma ve IBAN'ı zorunlu tutma.
- IBAN sorarken seçenek metni "Elden ödenecek" olsun (asla "Elden ödeyeceğim" yazma).
- IBAN verilirse paymentMethod='iban' yap.
- paymentMethod='cash' iken IBAN boş kalabilir; bu bir eksik değildir.
- Genel Koşullar 1-10 arası bir maddeyi değiştirmek için edit_clause'ta section='general', sözleşme maddeleri (11-24) için section='contract' kullan.`;
    }

    async runTurn(triggerMessage, photoIds) {
      if (this.busy) return;
      this.busy = true;
      this.emit({ type: 'busy', busy: true });
      this.ownTurn = true;

      const assistantId = uid();
      let assistantStarted = false;
      let pendingText = '';
      const images = { current: triggerMessage.id, ids: photoIds, map: {} };
      const attached = photoIds.slice();

      try {
        for (const pid of attached) {
          const d = await this.photoData(pid);
          if (d) images.map[pid] = d;
          await this.setPhotoStatus(pid, 'processing');
        }

        this.setActivity({ label: attached.length ? 'Fotoğrafları inceliyor' : 'Düşünüyor', at: now() });

        let convo = [
          { role: 'system', content: this.buildSystemPrompt() },
          ...this.historyForAI(images)
        ];

        let rounds = 0;
        let asked = false;
        let persistPromise = null;
        let liveMsg = null;

        while (rounds++ < 6) {
          if (rounds > 1 && assistantStarted && pendingText && !/\s$/.test(pendingText)) {
            pendingText += '\n\n';
            if (liveMsg) liveMsg.text = pendingText;
            this.emit({ type: 'stream', id: assistantId, delta: '\n\n' });
          }
          const result = await this.streamCompletion(convo, (delta) => {
            if (!assistantStarted) {
              assistantStarted = true;
              liveMsg = { id: assistantId, role: 'assistant', kind: 'text', text: '', at: now() };
              this.messages.push(liveMsg);
              this.emit({ type: 'message', message: liveMsg });
              persistPromise = this.post({ op: 'message', message: liveMsg }).catch(() => {});
            }
            pendingText += delta;
            if (liveMsg) liveMsg.text = pendingText;
            this.emit({ type: 'stream', id: assistantId, delta });
          });

          if (persistPromise) { await persistPromise; persistPromise = null; }

          if (result.aborted) break;

          if (!result.toolCalls.length) break;

          convo.push({
            role: 'assistant',
            content: result.text || null,
            tool_calls: result.toolCalls
          });

          for (const call of result.toolCalls) {
            const out = await this.applyTool(call);
            convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(out) });
            if (out && out.stop) asked = true;
          }

          if (asked) break;

          this.setActivity({ label: 'Belgeye yerleştiriyor', at: now() });
        }

        const finalText = (liveMsg && liveMsg.text) || pendingText || '';

        if (assistantStarted) {
          await this.patchMessage(assistantId, { text: finalText });
        } else if (finalText) {
          await this.addMessage({
            id: assistantId, role: 'assistant', kind: 'text', text: finalText, at: now()
          });
        }

        for (const pid of attached) {
          await this.setPhotoStatus(pid, asked ? 'question' : 'done');
        }

        await this.persistDoc();
        this.setActivity(null);
        this.emit({ type: 'turnEnd' });
      } catch (err) {
        console.error(err);
        this.emit({ type: 'error', message: String(err && err.message || err) });
        if (attached.length) for (const pid of attached) await this.setPhotoStatus(pid, 'error');
        this.setActivity(null);
      } finally {
        this.busy = false;
        this.ownTurn = false;
        this.emit({ type: 'busy', busy: false });
      }
    }

    async applyTool(call) {
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch (e) {}

      if (call.function.name === 'set_fields') {
        const updates = [];
        for (const [key, raw] of Object.entries(args.fields || {})) {
          if (!(key in C.defaults)) continue;
          if (key === 'customClauses' || key === 'clauseOverrides' || key === 'generalOverrides') continue;
          const value = normalizeValue(key, raw);
          if (value === '' || value === null) continue;
          this.doc[key] = value;
          updates.push({ key, label: C.LABELS[key] || key, value: formatValue(key, value) });

          const flag = key.match(/^(landlord2|tenant2|guarantor2)/);
          if (flag) this.doc[flag[1] + 'Enabled'] = true;
        }
        if (updates.length) {
          await this.persistDoc();
          const msg = { id: uid(), role: 'assistant', kind: 'updates', items: updates, at: now() };
          await this.addMessage(msg);
          updates.forEach(u => this.emit({ type: 'flash', key: u.key }));
        }
        return {
          ok: true,
          applied: updates.map(u => u.key),
          missing: C.missingDetails(this.doc).map(m => m.text)
        };
      }

      if (call.function.name === 'ask') {
        const card = {
          id: uid(),
          role: 'assistant',
          kind: 'question',
          title: args.title || 'Bir şeyi netleştirelim',
          questions: (args.questions || []).slice(0, 4).map((q, i) => ({
            id: String(q.id || 'q' + i),
            label: String(q.label || 'Soru'),
            question: String(q.question || ''),
            options: Array.isArray(q.options) ? q.options.map(String).slice(0, 8) : [],
            allowFreeText: q.allowFreeText !== false,
            field: q.field || null,
            answer: null
          })),
          answered: false,
          at: now()
        };
        await this.addMessage(card);
        return { ok: true, stop: true };
      }

      if (call.function.name === 'add_clause') {
        const text = String(args.text || '').trim();
        if (!text) return { ok: false, error: 'metin boş' };
        this.doc.customClauses = [...(this.doc.customClauses || []), text];
        await this.persistDoc();
        await this.addMessage({
          id: uid(), role: 'assistant', kind: 'updates',
          items: [{ key: 'customClauses', label: 'Ek madde', value: text.slice(0, 90) }], at: now()
        });
        return { ok: true };
      }

      if (call.function.name === 'edit_clause' || call.function.name === 'reset_clause') {
        const no = Number(args.no);
        if (!no) return { ok: false, error: 'madde numarası gerekli' };
        const section = args.section === 'general' ? 'general' : 'contract';
        if (section === 'general' && (no < 1 || no > 10)) return { ok: false, error: 'genel koşullar 1-10 arası' };
        const mapKey = section === 'general' ? 'generalOverrides' : 'clauseOverrides';
        this.doc[mapKey] = { ...(this.doc[mapKey] || {}) };
        if (call.function.name === 'reset_clause') delete this.doc[mapKey][String(no)];
        else this.doc[mapKey][String(no)] = String(args.text || '');
        await this.persistDoc();
        const label = section === 'general' ? `Genel Koşullar ${no}. madde` : `${no}. madde`;
        await this.addMessage({
          id: uid(), role: 'assistant', kind: 'updates',
          items: [{ key: mapKey, label, value: call.function.name === 'reset_clause' ? 'özgün haline döndürüldü' : String(args.text || '').slice(0, 90) }],
          at: now()
        });
        return { ok: true };
      }

      return { ok: false, error: 'bilinmeyen araç' };
    }

    async streamCompletion(convo, onDelta) {
      const res = await fetch(`${API}/api/ai`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          sessionId: this.sid,
          stream: true,
          temperature: 0.2,
          messages: convo,
          tools: TOOLS,
          tool_choice: 'auto'
        })
      });

      if (res.status === 401) throw new Error('auth');
      if (!res.ok) {
        let detail = '';
        try { detail = (await res.json()).detail || ''; } catch (e) {}
        throw new Error('AI bağlantı hatası' + (detail ? ': ' + detail.slice(0, 160) : ''));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let text = '';
      const calls = [];
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const data = t.slice(5).trim();
          if (data === '[DONE]') { finished = true; break; }
          let json;
          try { json = JSON.parse(data); } catch (e) { continue; }
          const choice = json.choices && json.choices[0];
          if (!choice) continue;
          const delta = choice.delta || {};

          if (delta.content) {
            text += delta.content;
            onDelta(delta.content);
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const i = tc.index ?? 0;
              if (!calls[i]) calls[i] = { id: tc.id || 'call_' + i, type: 'function', function: { name: '', arguments: '' } };
              if (tc.id) calls[i].id = tc.id;
              if (tc.function && tc.function.name) calls[i].function.name += tc.function.name;
              if (tc.function && tc.function.arguments) calls[i].function.arguments += tc.function.arguments;
            }
          }
        }
      }

      return { text, toolCalls: calls.filter(Boolean), aborted: false };
    }
  }

  function formatValue(key, v) {
    if (v === true) return 'Evet';
    if (v === false) return 'Hayır';
    if (key === 'leaseStart' || key === 'commitmentDate') return C.formatDate(v);
    if (key === 'monthlyRent' || key === 'depositManual') return C.money(v) + ' TL';
    if (key === 'durationUnit') return v === 'month' ? 'ay' : 'yıl';
    if (key === 'paymentMethod') return v === 'cash' ? 'Elden nakit' : 'IBAN';
    if (key === 'durationValue') return String(v);
    if (key === 'iban') return String(v);
    if (key === 'tenantBusinessAddress' || key === 'demirbaslar' || key === 'propertyCondition') return String(v).replace(/\s+/g, ' ').slice(0, 90);
    return String(v).slice(0, 90);
  }

  function shouldShowValue() { return false; }
  function shortValue() { return ''; }

  window.EmekSession = Session;
  window.EmekUtil = {
    uid, now, dateStr, tcknValid, normalizeValue, formatValue,
    api: API, FIELD_TYPE, TOOLS
  };
})();
