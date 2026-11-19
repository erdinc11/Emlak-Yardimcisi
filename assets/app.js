/* ============================================================
   Emlak Yardımcısı — masaüstü arayüzü
   ============================================================ */
(() => {
  const C = window.Contract;
  const Chat = window.ChatUI;
  const U = window.EmekUtil;
  const cfg = window.EMLAK_CONFIG || {};
  const API = (cfg.api || '').replace(/\/$/, '');

  const $ = id => document.getElementById(id);
  const esc = Chat.esc;

  let session = null;
  let sid = '';
  let token = '';
  let refs = [];
  let attachments = [];
  let activityEl = null;
  let activityTimer = null;
  let lastActivity = null;
  let phoneTimer = null;
  let pendingPhotos = [];
  let historyOpen = false;
  let qrBuilt = false;
  const localPhotoIds = new Set();
  let uploadingLocal = false;

  const msgEls = new Map();

  /* ------------------------------ giriş ------------------------------ */

  function showGate(message) {
    $('gate').classList.remove('hidden');
    $('app').classList.add('hidden');
    if (message) {
      $('gateError').querySelector('span').textContent = message;
      $('gateError').classList.add('on');
    }
    setTimeout(() => $('gatePassword').focus(), 120);
  }

  function hideGate() {
    $('gate').classList.add('hidden');
    $('app').classList.remove('hidden');
  }

  async function login() {
    if (!API) {
      $('gateError').querySelector('span').textContent = 'Sunucu adresi ayarlanmamış (assets/config.js).';
      $('gateError').classList.add('on');
      return;
    }
    const btn = $('gateSubmit');
    const pw = $('gatePassword').value;
    if (!pw) return;
    btn.disabled = true;
    btn.textContent = 'Kontrol ediliyor…';
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı');
      token = data.token;
      localStorage.setItem('emlak.token', token);
      $('gateError').classList.remove('on');
      hideGate();
      await boot();
    } catch (err) {
      $('gate').classList.add('shake');
      setTimeout(() => $('gate').classList.remove('shake'), 500);
      $('gatePassword').value = '';
      $('gatePassword').focus();
      $('gateError').querySelector('span').textContent = err.message === 'Failed to fetch'
        ? 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.'
        : (err.message || 'Şifre hatalı');
      $('gateError').classList.add('on');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Giriş yap';
    }
  }

  function logout() {
    localStorage.removeItem('emlak.token');
    localStorage.removeItem('emlak.sid');
    location.reload();
  }

  /* ------------------------------ başlatma ------------------------------ */

  function newSid() {
    return (crypto.randomUUID ? crypto.randomUUID() : 's-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

  async function boot() {
    token = token || localStorage.getItem('emlak.token') || '';
    if (!token) { showGate(); return; }

    sid = new URLSearchParams(location.search).get('s') || localStorage.getItem('emlak.sid') || newSid();
    localStorage.setItem('emlak.sid', sid);
    setUrlSid(sid);

    session = new window.EmekSession({ sid, token, role: 'desktop', onChange: handleEvent });

    try {
      await session.load();
    } catch (err) {
      if (String(err.message) === 'auth') {
        localStorage.removeItem('emlak.token');
        token = '';
        showGate('Oturum süresi dolmuş. Tekrar giriş yapın.');
        return;
      }
      $('gateError').querySelector('span').textContent = 'Sunucuya ulaşılamıyor.';
      showGate();
      return;
    }

    hideGate();

    if (!session.doc) await session.newDoc();
    session.connect();

    renderDoc();
    renderMessages();
    updateComposer();
    updateTop();
  }

  function setUrlSid(id) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('s', id);
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  async function openSessionWith(snapshot) {
    if (session) session.destroy();
    sid = newSid();
    localStorage.setItem('emlak.sid', sid);
    setUrlSid(sid);
    session = new window.EmekSession({ sid, token, role: 'desktop', onChange: handleEvent });
    await session.load().catch(() => {});
    await session.newDoc();
    session.doc = { ...session.doc, ...snapshot };
    await session.persistDoc();
    session.connect();
    renderDoc(); renderMessages(); updateComposer(); updateTop();
    closeSheets();
    toast('Belge açıldı');
  }

  /* ------------------------------ olaylar ------------------------------ */

  function handleEvent(ev) {
    switch (ev.type) {
      case 'ready':
        break;
      case 'doc':
        renderDoc(); updateTop();
        break;
      case 'message':
        appendMessage(ev.message);
        break;
      case 'patch': {
        const m = session.messages.find(x => x.id === ev.id);
        if (m) replaceMessage(m);
        if (m && m.kind === 'question' && m.answered) syncPhotoThumbs();
        break;
      }
      case 'stream': {
        const m = session.messages.find(x => x.id === ev.id);
        const el = msgEls.get(ev.id);
        if (m && el) {
          const body = el.querySelector('.md');
          if (body) body.innerHTML = Chat.md(m.text);
          autoScroll();
        }
        break;
      }
      case 'photo': {
        syncPhotoThumbs();
        if (ev.photo && ev.photo.status === 'new' && session.role === 'desktop' && ev.photo.origin === 'phone') {
          schedulePhoneTurn(ev.photo.id);
        }
        break;
      }
      case 'photoStatus':
        syncPhotoThumbs();
        break;
      case 'activity':
        lastActivity = ev.activity;
        renderActivity(ev.activity);
        updateLive();
        break;
      case 'presence':
        if (ev.role === 'phone') updateQrStatus(ev.online);
        break;
      case 'connection':
        $('connBadge').textContent = ev.online ? 'Canlı' : 'Bağlanıyor…';
        $('connBadge').style.color = ev.online ? 'var(--green)' : 'var(--faint)';
        break;
      case 'busy':
        updateLive();
        updateComposer();
        break;
      case 'error':
        toast(errText(ev.message), true);
        updateLive();
        break;
      case 'turnEnd':
        updateLive(); updateTop(); renderDoc();
        break;
      default:
        break;
    }
  }

  function errText(raw) {
    if (/auth/i.test(raw)) return 'Oturum sona erdi, sayfayı yenileyin.';
    if (/AI bağlantı/i.test(raw)) return 'Yapay zekâya ulaşılamadı. Birazdan tekrar deneyin.';
    return 'Bir şeyler ters gitti. Tekrar deneyin.';
  }

  function updateLive() {
    const pill = $('livePill');
    const busy = session && (session.busy || lastActivity);
    pill.classList.toggle('working', !!busy);
    pill.querySelector('span').textContent = busy
      ? (lastActivity ? lastActivity.label : 'Çalışıyor')
      : (session && session.online ? 'Hazır' : 'Bağlanıyor');
  }

  /* ------------------------------ belge ------------------------------ */

  function state() { return session ? session.state : C.defaults; }

  function renderDoc() {
    const s = state();
    const preview = $('preview');
    if (!preview) return;

    const atTop = preview.scrollTop;
    preview.innerHTML = C.renderPages(s);
    preview.scrollTop = atTop;

    fitPreview();
    updateProgress();
    flashPending.forEach(k => flashField(k));
    flashPending.clear();

    $('docName').textContent = C.fileNameBase(s);
    $('topDocName').textContent = C.fileNameBase(s);
    $('docSub').textContent = C.missingDetails(s).length
      ? `${C.missingDetails(s).length} alan eksik · 4 sayfa`
      : 'Tüm alanlar tamam · 4 sayfa';
  }

  const flashPending = new Set();

  function flashField(key) {
    const el = document.querySelector(`#preview .u[data-key="${CSS.escape(key)}"]`);
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1500);
  }

  function fitPreview() {
    const pane = $('preview');
    if (!pane) return;
    const usable = Math.max(220, pane.clientWidth - 40);
    const pageW = 210 / 25.4 * 96;
    const pageH = 297 / 25.4 * 96;
    const scale = Math.max(0.2, Math.min(0.82, usable / pageW));
    document.documentElement.style.setProperty('--preview-scale', scale.toFixed(4));
    document.documentElement.style.setProperty('--scaled-page-w', `${Math.round(pageW * scale)}px`);
    document.documentElement.style.setProperty('--scaled-page-h', `${Math.round(pageH * scale)}px`);
  }

  function updateProgress() {
    const s = state();
    const req = C.requiredKeys(s);
    const filled = req.filter(([k]) => !C.isBlank(s[k])).length;
    const total = req.length;
    const ratio = total ? filled / total : 0;
    const circ = 69.1;
    const ring = $('progressRing');
    if (ring) {
      ring.style.strokeDashoffset = String(circ * (1 - ratio));
      ring.style.stroke = ratio === 1 ? 'var(--green)' : ratio > .6 ? 'var(--accent)' : 'var(--amber)';
    }
    $('progressText').textContent = `${filled} / ${total} alan`;
  }

  function updateTop() {
    if (!session) return;
    $('docName').textContent = C.fileNameBase(state());
    $('topDocName').textContent = C.fileNameBase(state());
    updateProgress();
  }

  /* ------------------------------ mesajlar ------------------------------ */

  function appendMessage(m) {
    if (m.kind === 'question' && m.closed) return;
    if (m.kind === 'updates' || m.kind === 'notice') {
      // yalnızca sohbet akışında göster
    }
    if (msgEls.has(m.id)) { replaceMessage(m); return; }
    const wrap = document.createElement('div');
    wrap.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
    const el = wrap.firstElementChild;
    if (!el) return;

    if (el.classList && el.classList.contains('qcard')) {
      const holder = document.createElement('div');
      holder.className = 'msg ai';
      holder.appendChild(el);
      el.dataset.mid = m.id;
      Chat.wireQuestionCard(el, m, answers => {
        session.submitAnswers(m.id, answers).catch(() => toast('Gönderilemedi', true));
      }, () => toast('Lütfen tüm soruları yanıtlayın'));
      msgEls.set(m.id, holder);
      $('messages').appendChild(holder);
      setTimeout(() => scrollToEl(holder), 90);
    } else {
      msgEls.set(m.id, el);
      $('messages').appendChild(el);
    }

    syncPhotoThumbs();
    clearWelcome();
    if (m.kind !== 'question') autoScroll(true);
  }

  function scrollToEl(el) {
    const box = $('messages');
    if (!box || !el) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 10;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function replaceMessage(m) {
    const old = msgEls.get(m.id);
    if (m.kind === 'question' && m.closed) {
      if (old) old.remove();
      msgEls.delete(m.id);
      return;
    }
    if (!old) { appendMessage(m); return; }

    if (m.kind === 'question') {
      const holder = document.createElement('div');
      holder.className = 'msg ai';
      holder.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
      const card = holder.firstElementChild;
      if (card && !m.answered) {
        Chat.wireQuestionCard(card, m, answers => {
          session.submitAnswers(m.id, answers).catch(() => toast('Gönderilemedi', true));
        }, () => toast('Lütfen tüm soruları yanıtlayın'));
      }
      old.replaceWith(holder);
      msgEls.set(m.id, holder);
      syncPhotoThumbs();
      return;
    }

    const tmp = document.createElement('div');
    tmp.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
    const el = tmp.firstElementChild;
    if (!el) return;
    old.replaceWith(el);
    msgEls.set(m.id, el);
    syncPhotoThumbs();
  }

  function renderMessages() {
    const box = $('messages');
    box.innerHTML = '';
    msgEls.clear();
    for (const m of session.messages) appendMessage(m);
    if (!session.messages.length) renderWelcome();
    box.appendChild(document.createElement('div')).className = 'scroll-anchor';
  }

  function clearWelcome() {
    const w = document.querySelector('.welcome');
    if (w) w.remove();
  }

  function renderWelcome() {
    const w = document.createElement('div');
    w.className = 'welcome';
    w.innerHTML = `
      <div class="w-orb"><div class="orb"></div></div>
      <h3>Merhaba, ben Emlak Yardımcısı</h3>
      <p>Kimlik veya belge fotoğrafını gönderin; bilgileri okuyup sözleşmeye yerleştireyim.
      Eksikleri size sorarak birlikte tamamlayalım.</p>
      <div class="w-grid">
        <button class="w-card" data-act="photo">
          <span class="w-ic">${Chat.icons.DOC_SVG}</span>
          <b>Fotoğraf yükle</b>
          <span>Kimlik, tapu, ekran görüntüsü</span>
        </button>
        <button class="w-card" data-act="phone">
          <span class="w-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.5 18.5h3"/></svg></span>
          <b>Telefondan gönder</b>
          <span>Kare kodu okutun</span>
        </button>
        <button class="w-card" data-act="ask">
          <span class="w-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 1 1 4.9 2.3c-.9.7-1.5 1.2-1.5 2.2"/><path d="M12.5 17h.01"/><circle cx="12" cy="12" r="9"/></svg></span>
          <b>Kira bilgilerini sor</b>
          <span>Adım adım anlatın</span>
        </button>
        <button class="w-card" data-act="fields">
          <span class="w-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h7"/></svg></span>
          <b>Alanları göster</b>
          <span>Neler eksik, görün</span>
        </button>
      </div>`;
    $('messages').appendChild(w);

    w.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'photo') $('fileInput').click();
        if (act === 'phone') openQr();
        if (act === 'ask') sendText('Eksik bilgileri sırayla, kısa seçeneklerle sor.');
        if (act === 'fields') openPicker(true);
      });
    });
  }

  function autoScroll(force) {
    const box = $('messages');
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 180;
    if (force || near) box.scrollTop = box.scrollHeight;
  }

  function syncPhotoThumbs() {
    document.querySelectorAll('.photo-thumb').forEach(el => {
      const p = session.photos.find(x => x.id === el.dataset.photo);
      if (!p) return;
      el.querySelectorAll('.veil, .badge, .scanline').forEach(n => n.remove());
      const ov = Chat.photoOverlay(p.status);
      if (ov.veil) {
        el.insertAdjacentHTML('beforeend', `<div class="veil">${ov.html}</div>`);
      }
      if (p.status === 'done') {
        el.insertAdjacentHTML('beforeend', `<div class="badge">${Chat.icons.CHECK_SVG}</div>`);
      }
    });
  }

  /* ------------------------------ etkinlik ------------------------------ */

  function renderActivity(a) {
    const box = $('messages');
    if (!a) {
      if (activityEl) { activityEl.remove(); activityEl = null; }
      clearInterval(activityTimer);
      return;
    }
    if (activityEl) {
      const label = activityEl.querySelector('.thinking span:nth-child(2)');
      if (label) label.textContent = a.label || 'Düşünüyor';
      autoScroll();
      return;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = Chat.activityHTML(a);
    activityEl = wrap.firstElementChild;
    box.appendChild(activityEl);
    let step = 0;
    clearInterval(activityTimer);
    activityTimer = setInterval(() => {
      if (!activityEl) return;
      const steps = activityEl.querySelectorAll('.step');
      if (steps[step]) {
        steps[step].classList.remove('on');
        steps[step].classList.add('done');
        const spin = steps[step].querySelector('.spin');
        if (spin) spin.outerHTML = `<span class="tick">${Chat.icons.CHECK_SVG}</span>`;
      }
      step++;
      if (steps[step]) steps[step].classList.add('on');
    }, 1900);
    autoScroll();
  }

  /* ------------------------------ yazma ------------------------------ */

  function renderRefs() {
    const row = $('refsRow');
    row.innerHTML = refs.map(r => `
      <span class="ref">${Chat.icons.DOC_SVG}<span>${esc(r.label)}</span>
        <button data-key="${esc(r.key)}" title="Kaldır">${Chat.icons.X_SVG}</button>
      </span>`).join('');
    row.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        refs = refs.filter(r => r.key !== b.dataset.key);
        renderRefs();
        updateComposer();
      });
    });
  }

  function addRef(key, label) {
    if (refs.some(r => r.key === key)) return;
    refs.push({ key, label });
    renderRefs();
    updateComposer();
    $('composerInput').focus();
  }

  function renderAttachments() {
    const row = $('attachRow');
    row.innerHTML = attachments.map(a => `
      <div class="attach" data-id="${a.id}">
        <img src="${a.preview}" alt="" />
        <button title="Kaldır">${Chat.icons.X_SVG}</button>
      </div>`).join('');
    row.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.closest('.attach').dataset.id;
        attachments = attachments.filter(a => a.id !== id);
        renderAttachments();
        updateComposer();
      });
    });
  }

  function updateComposer() {
    const text = $('composerInput').value.trim();
    $('btnSend').disabled = !(text || attachments.length) || !session || session.busy || !!lastActivity;
  }

  function sendText(text) {
    if (!session) return;
    if (session.busy || session.remoteBusy) { toast('Asistan şu an çalışıyor, bitmesini bekleyin'); return; }
    session.send({ text }).catch(err => toast(errText(String(err.message || err)), true));
  }

  async function doSend() {
    if (!session) return;
    if (session.busy || session.remoteBusy) { toast('Asistan şu an çalışıyor, bitmesini bekleyin'); return; }
    const text = $('composerInput').value.trim();
    const ids = attachments.map(a => a.id);
    if (!text && !ids.length) return;

    const useRefs = refs.slice();
    refs = [];
    attachments = [];
    $('composerInput').value = '';
    $('composerInput').style.height = 'auto';
    renderRefs(); renderAttachments(); updateComposer();

    try {
      await session.send({ text, refs: useRefs, photoIds: ids });
    } catch (err) {
      toast(errText(String(err.message || err)), true);
    }
  }

  async function addFiles(files) {
    if (!session) return;
    const list = [...files].slice(0, 8);
    for (const f of list) {
      if (!f.type.startsWith('image/')) continue;
      try {
        uploadingLocal = true;
        const id = await session.addPhoto(f);
        localPhotoIds.add(id);
        uploadingLocal = false;
        const preview = session.dataCache.get(id) || session.photoUrl(id);
        attachments.push({ id, preview });
      } catch (e) {
        toast('Fotoğraf yüklenemedi', true);
      }
    }
    renderAttachments();
    updateComposer();
    if (list.length) toast(`${list.length} fotoğraf eklendi`);
  }

  function schedulePhoneTurn(photoId) {
    pendingPhotos.push(photoId);
    clearTimeout(phoneTimer);
    phoneTimer = setTimeout(async function attempt() {
      if (!session) return;
      if (session.busy || session.remoteBusy) {
        phoneTimer = setTimeout(attempt, 1800);
        return;
      }
      const ids = pendingPhotos.slice();
      pendingPhotos = [];
      if (!ids.length) return;
      try {
        await session.send({ text: 'Telefondan fotoğraf gönderdim.', photoIds: ids });
      } catch (e) {}
    }, 1400);
  }

  /* ------------------------------ dışa aktarma ------------------------------ */

  function openExport() {
    const s = state();
    const missing = C.missingDetails(s);
    const errors = C.validate(s).filter(e => !missing.some(m => e.startsWith(m.label)));
    const body = $('exportBody');
    const foot = $('exportFoot');

    $('exportTitle').textContent = missing.length ? 'Birkaç alan eksik' : 'Belge hazır';
    $('exportSub').textContent = C.fileNameBase(s);

    if (missing.length) {
      body.innerHTML = `
        <div class="missing-box">
          <div class="mb-head">
            <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg></div>
            <b>${missing.length} alan henüz doldurulmadı</b>
          </div>
          <ul>${missing.map(m => `<li>${esc(m.text)}</li>`).join('')}</ul>
        </div>
        <p style="font-size:12.5px;color:var(--muted);line-height:1.6;margin:0 0 4px">
          İsterseniz asistan eksikleri sorarak tamamlasın. Yine de indirirseniz bu alanlar PDF'te boş görünür.
        </p>`;
      foot.innerHTML = `
        <button class="btn ghost" id="exportAnyway" style="flex:1">Yine de indir</button>
        <button class="btn primary" id="exportAsk" style="flex:1">Eksikleri tamamla</button>`;
      $('exportAsk').addEventListener('click', () => {
        closeSheets();
        sendText('Eksik alanları sırayla, kısa seçeneklerle sor.');
      });
      $('exportAnyway').addEventListener('click', () => printDoc(true));
    } else {
      const ok = `<div class="ok-box">
        <div class="ic">${Chat.icons.CHECK_SVG}</div>
        <div><b>Her şey tamam görünüyor</b><p>Belge ${C.addressLine(s)} adresi ve taraflar için hazır. PDF olarak kaydedebilirsiniz.</p></div>
      </div>`;
      const warn = errors.length
        ? `<div class="missing-box" style="margin-top:12px"><div class="mb-head"><div class="ic">!</div><b>Kontrol edilecekler</b></div><ul>${errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>`
        : '';
      body.innerHTML = ok + warn + `<p style="font-size:12px;color:var(--faint);margin-top:14px;line-height:1.55">Açılan yazdırma penceresinde hedef olarak <b>“PDF olarak kaydet”</b> seçin.</p>`;
      foot.innerHTML = `<button class="btn primary" id="exportGo" style="flex:1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
        PDF olarak indir</button>`;
      $('exportGo').addEventListener('click', () => printDoc(false));
    }

    openSheet('exportSheet');
  }

  async function saveHistory() {
    const s = state();
    try {
      await fetch(`${API}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          id: sid,
          docId: sid,
          title: C.fileNameBase(s),
          state: s,
          thumb: C.page1(s)
        })
      });
    } catch (e) {}
  }

  async function printDoc(anyway) {
    await saveHistory();
    const s = state();
    const root = $('printRoot');
    root.innerHTML = [C.page1(s), C.page2(s), C.page3(s), C.page4(s)].join('');

    const oldTitle = document.title;
    document.title = C.fileNameBase(s);
    closeSheets();

    const restore = () => {
      document.title = oldTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 260);
    setTimeout(restore, 4000);
  }

  /* ------------------------------ geçmiş ------------------------------ */

  async function openHistory() {
    historyOpen = true;
    openSheet('historySheet');
    const grid = $('histGrid');
    grid.innerHTML = `<div class="hist-skel"></div><div class="hist-skel"></div><div class="hist-skel"></div><div class="hist-skel"></div>`;
    try {
      const res = await fetch(`${API}/api/history`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      const items = data.items || [];
      $('histEmpty').classList.toggle('hidden', items.length > 0);
      grid.innerHTML = items.map(it => `
        <div class="hist-card" data-id="${esc(it.id)}">
          <div class="hist-preview">
            <div class="mini">${it.thumb || ''}</div>
          </div>
          <div class="hist-meta">
            <b>${esc(it.title || 'Belge')}</b>
            <span>${new Date(it.created).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <div class="hist-actions">
              <button class="btn small" data-open="${esc(it.id)}">Aç</button>
              <button class="btn small" data-del="${esc(it.id)}" style="flex:0 0 34px" title="Sil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/></svg>
              </button>
            </div>
          </div>
        </div>`).join('');

      grid.querySelectorAll('[data-open]').forEach(b => {
        b.addEventListener('click', () => loadHistoryItem(b.dataset.open));
      });
      grid.querySelectorAll('[data-del]').forEach(b => {
        b.addEventListener('click', async () => {
          b.disabled = true;
          await fetch(`${API}/api/history/${b.dataset.del}`, {
            method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
          }).catch(() => {});
          const card = b.closest('.hist-card');
          if (card) { card.style.opacity = '.4'; setTimeout(() => card.remove(), 220); }
          toast('Belge silindi');
        });
      });
    } catch (e) {
      grid.innerHTML = '';
      toast('Geçmiş yüklenemedi', true);
    }
  }

  async function loadHistoryItem(id) {
    try {
      const res = await fetch(`${API}/api/version/${id}`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (!data || !data.state) throw new Error();
      const st = typeof data.state === 'string' ? JSON.parse(data.state) : data.state;
      await openSessionWith(st);
    } catch (e) {
      toast('Belge açılamadı', true);
    }
  }

  /* ------------------------------ QR ------------------------------ */

  async function openQr() {
    qrBuilt = false;
    $('qrStatus').className = 'qr-status';
    $('qrStatus').querySelector('span').textContent = session && session.remote.size ? 'Telefon bağlı' : 'Telefon bekleniyor…';
    $('qrStatus').querySelector('i').style.display = '';
    $('qrTarget').innerHTML = '';
    $('qrLink').value = '';
    openSheet('qrSheet');
    await buildQr();
  }

  async function buildQr() {
    try {
      const res = await fetch(`${API}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ sid })
      });
      const data = await res.json();
      if (!data.token) throw new Error();
      const url = new URL('m.html', location.href);
      url.searchParams.set('s', sid);
      url.searchParams.set('t', data.token);
      $('qrLink').value = url.toString();

      const qr = window.qrcode(0, 'M');
      qr.addData(url.toString());
      qr.make();
      $('qrTarget').innerHTML = qr.createSvgTag({ cellSize: 5, margin: 1, scalable: true });
      const svg = $('qrTarget').querySelector('svg');
      if (svg) { svg.style.width = '212px'; svg.style.height = '212px'; }
      qrBuilt = true;
      updateQrStatus(session && session.remote.has('phone'));
    } catch (e) {
      $('qrTarget').innerHTML = '<div style="width:238px;height:238px;display:grid;place-items:center;color:var(--faint);font-size:12px">Kare kod oluşturulamadı</div>';
    }
  }

  function updateQrStatus(online) {
    const el = $('qrStatus');
    if (!el) return;
    el.className = 'qr-status' + (online ? ' ok' : '');
    el.querySelector('span').textContent = online ? 'Telefon bağlandı' : 'Telefon bekleniyor…';
    el.querySelector('i').style.display = online ? '' : 'none';
  }

  /* ------------------------------ alan seçici ------------------------------ */

  let pickerMissingOnly = false;

  function openPicker(missingOnly) {
    pickerMissingOnly = !!missingOnly;
    $('pickerSearch').value = '';
    renderPicker();
    openSheet('pickerSheet');
    setTimeout(() => $('pickerSearch').focus(), 300);
  }

  function fold(v) {
    return String(v ?? '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
  }

  function renderPicker() {
    const s = state();
    const q = fold($('pickerSearch').value.trim());
    const missing = new Set(C.missingDetails(s).map(m => m.key));
    const groups = C.GROUPS.map(g => {
      const keys = g.keys.filter(k => {
        if (pickerMissingOnly && !missing.has(k)) return false;
        if (!q) return true;
        return fold(C.LABELS[k] || k).includes(q) || fold(s[k] || '').includes(q);
      });
      if (!keys.length) return '';
      return `<div class="field-group"><h4>${g.title}</h4><div class="field-list">${keys.map(k => {
        const val = String(s[k] ?? '');
        const empty = C.isBlank(val);
        return `<button class="field-item" data-key="${esc(k)}" data-label="${esc(C.LABELS[k] || k)}">
          ${empty ? '<span class="missing-dot"></span>' : ''}
          <span class="fl"><b>${esc(C.LABELS[k] || k)}</b><span>${empty ? 'Boş' : esc(val.slice(0, 80))}</span></span>
          <span class="add">${Chat.icons.ADD_SVG}</span>
        </button>`;
      }).join('')}</div></div>`;
    }).join('');

    $('pickerList').innerHTML = groups || `<div class="empty"><b>Sonuç yok</b><p>Aradığınız alanı bulamadık.</p></div>`;
    $('pickerList').querySelectorAll('.field-item').forEach(b => {
      b.addEventListener('click', () => {
        addRef(b.dataset.key, b.dataset.label);
        toast(`${b.dataset.label} eklendi`);
        closeSheets();
      });
    });
  }

  /* ------------------------------ sayfalar ------------------------------ */

  function openSheet(id) {
    $('scrim').classList.add('on');
    document.querySelectorAll('.sheet').forEach(s => {
      s.classList.toggle('on', s.id === id);
      s.setAttribute('aria-hidden', s.id === id ? 'false' : 'true');
    });
    document.body.dataset.sheet = id;
  }

  function closeSheets() {
    $('scrim').classList.remove('on');
    document.querySelectorAll('.sheet').forEach(s => { s.classList.remove('on'); s.setAttribute('aria-hidden', 'true'); });
    document.body.dataset.sheet = '';
    historyOpen = false;
  }

  function toast(message, bad) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = (bad
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 17h.01"/></svg>`
      : Chat.icons.CHECK_SVG) + `<span>${esc(message)}</span>`;
    $('toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2600);
  }

  /* ------------------------------ bağlantılar ------------------------------ */

  function wire() {
    $('gateSubmit').addEventListener('click', login);
    $('gatePassword').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

    $('btnExport').addEventListener('click', openExport);
    $('btnHistory').addEventListener('click', openHistory);
    $('btnPhone').addEventListener('click', openQr);
    $('btnPhone2').addEventListener('click', openQr);
    $('btnRef').addEventListener('click', () => openPicker(false));
    $('btnProgress').addEventListener('click', () => openPicker(true));

    $('btnAttach').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', e => {
      addFiles(e.target.files);
      e.target.value = '';
    });

    $('btnSend').addEventListener('click', doSend);
    $('composerInput').addEventListener('input', () => {
      const t = $('composerInput');
      t.style.height = 'auto';
      t.style.height = Math.min(132, t.scrollHeight) + 'px';
      updateComposer();
    });
    $('composerInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        doSend();
      }
    });

    $('scrim').addEventListener('click', closeSheets);
    document.querySelectorAll('[data-close]').forEach(b => {
      b.addEventListener('click', closeSheets);
    });

    $('preview').addEventListener('click', e => {
      let el = e.target.closest('.u');
      if (!el) {
        const cell = e.target.closest('td, th');
        if (cell) {
          const inner = cell.querySelector('.u');
          if (inner) el = inner;
        }
      }
      if (!el) return;
      const key = el.dataset.key;
      const label = el.dataset.label || C.LABELS[key] || key;
      addRef(key, label);
    });

    $('pickerSearch').addEventListener('input', renderPicker);

    $('btnCopyLink').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($('qrLink').value);
        toast('Bağlantı kopyalandı');
      } catch (e) { toast('Kopyalanamadı', true); }
    });

    $('btnNewFromHistory').addEventListener('click', () => {
      closeSheets();
      openSheet('newDocSheet');
    });
    $('btnConfirmNew').addEventListener('click', async () => {
      closeSheets();
      await openSessionWith(C.defaults);
    });

    document.querySelectorAll('#mobileTabs button').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#mobileTabs button').forEach(x => x.classList.toggle('on', x === b));
        const doc = b.dataset.tab === 'doc';
        $('docPane').classList.toggle('show', doc);
        $('chatPane').classList.toggle('hide', doc);
        if (doc) setTimeout(fitPreview, 60);
      });
    });

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(fitPreview, 120);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSheets();
    });

    window.addEventListener('online', () => { if (session && !session.ws) session.connect(); });
  }

  /* ------------------------------ başlangıç ------------------------------ */

  wire();
  if (!API) {
    showGate('Kurulum tamamlanmadı: sunucu adresi yok.');
  } else if (localStorage.getItem('emlak.token')) {
    boot();
  } else {
    showGate();
  }

  window.EmekApp = {
    get session() { return session; },
    toast, openHistory, openQr, openPicker
  };
})();
