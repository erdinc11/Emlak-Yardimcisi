/* ============================================================
   Emlak Yardımcısı — telefon arayüzü
   ============================================================ */
(() => {
  const Chat = window.ChatUI;
  const U = window.EmekUtil;
  const C = window.Contract;
  const cfg = window.EMLAK_CONFIG || {};
  const API = (cfg.api || '').replace(/\/$/, '');
  const $ = id => document.getElementById(id);

  const params = new URLSearchParams(location.search);
  const sid = params.get('s') || '';
  const token = params.get('t') || '';

  let session = null;
  let activity = null;
  let lastActivity = null;
  let incoming = [];
  let timer = null;
  const msgEls = new Map();
  const localIds = new Set();

  function showError(title, text) {
    $('phone').style.display = 'none';
    $('phoneError').style.display = 'block';
    $('phoneErrTitle').textContent = title;
    $('phoneErrText').textContent = text;
  }

  function toast(message) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = Chat.icons.CHECK_SVG + `<span>${Chat.esc(message)}</span>`;
    $('toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2400);
  }

  async function start() {
    if (!API) return showError('Sunucu ayarlı değil', 'Masaüstü uygulamasındaki bağlantıyı kontrol edin.');
    if (!sid || !token) return showError('Bağlantı eksik', 'Masaüstündeki kare kodu tekrar okutun.');

    session = new window.EmekSession({ sid, token, role: 'phone', onChange: handleEvent });
    try {
      await session.load();
    } catch (err) {
      if (String(err.message) === 'auth') return showError('Bağlantının süresi dolmuş', 'Masaüstünden yeni bir kare kod oluşturun ve tekrar okutun.');
      return showError('Sunucuya ulaşılamadı', 'İnternet bağlantınızı kontrol edip sayfayı yenileyin.');
    }

    if (!session.doc) return showError('Belge bulunamadı', 'Masaüstünde yeni bir kare kod oluşturun.');

    $('phone').style.display = 'flex';
    $('phoneError').style.display = 'none';
    session.connect();
    $('phoneDocTitle').textContent = C.fileNameBase(session.state);
    renderPhotos();
    renderMessages();
    updateSend();
  }

  function handleEvent(ev) {
    switch (ev.type) {
      case 'doc':
        $('phoneDocTitle').textContent = C.fileNameBase(session.state);
        break;
      case 'message':
        appendMessage(ev.message);
        break;
      case 'patch': {
        const m = session.messages.find(x => x.id === ev.id);
        if (m) replaceMessage(m);
        break;
      }
      case 'stream': {
        const m = session.messages.find(x => x.id === ev.id);
        const el = msgEls.get(ev.id);
        if (m && el) {
          const md = el.querySelector('.md');
          if (md) md.innerHTML = Chat.md(m.text);
          scrollBottom();
        }
        break;
      }
      case 'photo':
        renderPhotos();
        break;
      case 'photoStatus':
        renderPhotos();
        break;
      case 'deletePhoto':
        renderPhotos();
        break;
      case 'activity':
        lastActivity = ev.activity;
        renderActivity(ev.activity);
        break;
      case 'connection':
        $('phoneStatus').classList.toggle('on', ev.online);
        $('phoneStatus').querySelector('span').textContent = ev.online ? 'Bağlı' : 'Bağlanıyor';
        break;
      case 'busy':
        updateSend();
        break;
      case 'turnEnd':
        renderPhotos();
        updateSend();
        break;
      case 'error':
        toast('Asistana ulaşılamadı, tekrar deneyin.');
        break;
      default:
        break;
    }
  }

  /* ------------------------------ mesajlar ------------------------------ */

  function appendMessage(m) {
    if (m.kind === 'question' && m.closed) return;
    document.querySelector('.phone-empty')?.remove();
    if (msgEls.has(m.id)) { replaceMessage(m); return; }
    const holder = document.createElement('div');

    if (m.kind === 'question') {
      holder.className = 'msg ai';
      holder.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
      const card = holder.firstElementChild;
      if (card && !m.answered) {
        Chat.wireQuestionCard(card, m, answers => {
          session.submitAnswers(m.id, answers).catch(() => toast('Gönderilemedi'));
        }, () => toast('Tüm soruları yanıtlayın'));
      }
    } else if (m.kind === 'updates') {
      holder.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
    } else if (m.kind === 'notice') {
      holder.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
    } else {
      holder.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
    }

    const node = holder.firstElementChild || holder;
    msgEls.set(m.id, node === holder ? holder : node);
    $('phoneMessages').appendChild(node === holder ? holder : node);
    syncThumbs();
    updateSend();
    scrollBottom(true);
  }

  function replaceMessage(m) {
    const old = msgEls.get(m.id);
    if (m.kind === 'question' && m.closed) {
      if (old) old.remove();
      msgEls.delete(m.id);
      return;
    }
    if (!old) return appendMessage(m);
    const holder = document.createElement('div');
    if (m.kind === 'question') {
      holder.className = 'msg ai';
      holder.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
      const card = holder.firstElementChild;
      if (card && !m.answered) {
        Chat.wireQuestionCard(card, m, answers => {
          session.submitAnswers(m.id, answers).catch(() => toast('Gönderilemedi'));
        }, () => toast('Tüm soruları yanıtlayın'));
      }
      old.replaceWith(holder);
      msgEls.set(m.id, holder);
    } else {
      holder.innerHTML = Chat.messageHTML(m, { photoUrl: id => session.photoUrl(id) });
      const node = holder.firstElementChild;
      if (!node) return;
      old.replaceWith(node);
      msgEls.set(m.id, node);
    }
    syncThumbs();
  }

  function renderMessages() {
    $('phoneMessages').innerHTML = '';
    msgEls.clear();
    if (!session.messages.length) {
      const w = document.createElement('div');
      w.className = 'phone-empty';
      w.style.cssText = 'font-size:12.5px;color:var(--faint);line-height:1.55;padding:2px 3px';
      w.textContent = 'Henüz mesaj yok. Yukarıdan bir fotoğraf gönderdiğinizde asistan bilgileri okuyup buraya yazar.';
      $('phoneMessages').appendChild(w);
      return;
    }
    for (const m of session.messages) appendMessage(m);
    scrollBottom(true);
  }

  function scrollBottom(force) {
    const box = $('phoneScroll');
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 260;
    if (force || near) setTimeout(() => { box.scrollTop = box.scrollHeight; }, 40);
  }

  /* ------------------------------ fotoğraflar ------------------------------ */

  function renderPhotos() {
    const grid = $('phonePhotos');
    grid.innerHTML = session.photos.map(p => {
      const ov = Chat.photoOverlay(p.status);
      return `<div class="ph" data-id="${Chat.esc(p.id)}">
        <img src="${session.photoUrl(p.id)}" alt="" loading="lazy" />
        ${ov.veil ? `<div class="veil">${ov.html}</div>` : ''}
        ${p.status === 'done' ? `<div class="badge" style="position:absolute;right:5px;top:5px;width:17px;height:17px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center">${Chat.icons.CHECK_SVG}</div>` : ''}
      </div>`;
    }).join('');

    grid.querySelectorAll('.ph').forEach(el => {
      el.addEventListener('click', () => {
        $('phViewImg').src = session.photoUrl(el.dataset.id);
        $('phView').classList.add('on');
      });
    });
  }

  function syncThumbs() {
    document.querySelectorAll('.photo-thumb').forEach(el => {
      const p = session.photos.find(x => x.id === el.dataset.photo);
      if (!p) return;
      el.querySelectorAll('.veil, .badge').forEach(n => n.remove());
      const ov = Chat.photoOverlay(p.status);
      if (ov.veil) el.insertAdjacentHTML('beforeend', `<div class="veil">${ov.html}</div>`);
      if (p.status === 'done') el.insertAdjacentHTML('beforeend', `<div class="badge">${Chat.icons.CHECK_SVG}</div>`);
    });
  }

  async function addFiles(files) {
    const list = [...files].filter(f => f.type.startsWith('image/')).slice(0, 10);
    if (!list.length) return;
    toast(`${list.length} fotoğraf yükleniyor…`);
    const ids = [];
    for (const f of list) {
      try {
        const id = await session.addPhoto(f, 'phone');
        localIds.add(id);
        ids.push(id);
      } catch (e) {
        toast('Bir fotoğraf yüklenemedi');
      }
    }
    renderPhotos();
    if (ids.length) scheduleTurn(ids);
  }

  function scheduleTurn(ids) {
    incoming.push(...ids);
    clearTimeout(timer);
    timer = setTimeout(function attempt() {
      if (!session) return;
      if (session.busy || session.remoteBusy) {
        timer = setTimeout(attempt, 1200);
        return;
      }
      const ready = incoming.filter(id => {
        const p = session.photos.find(x => x.id === id);
        return p && p.status === 'new';
      });
      incoming = [];
      if (!ready.length) return;
      session.send({ text: 'Telefondan fotoğraf gönderdim.', photoIds: ready }).catch(() => {});
    }, 650);
  }

  /* ------------------------------ etkinlik ------------------------------ */

  function renderActivity(a) {
    if (!a) {
      $('phoneActivity').classList.remove('on');
      return;
    }
    $('phoneActivity').classList.add('on');
    $('phoneActivity').querySelector('span').textContent = a.label || 'Düşünüyor…';
  }

  /* ------------------------------ yazma ------------------------------ */

  function updateSend() {
    const text = $('phoneInput').value.trim();
    $('btnPhoneSend').disabled = !text || !session || session.busy || !!lastActivity || !!activity;
  }

  async function send() {
    const text = $('phoneInput').value.trim();
    if (!text || !session) return;
    if (session.busy || session.remoteBusy) { toast('Asistan şu an çalışıyor'); return; }
    $('phoneInput').value = '';
    $('phoneInput').style.height = 'auto';
    updateSend();
    try {
      await session.send({ text });
    } catch (e) {
      toast('Gönderilemedi');
    }
  }

  /* ------------------------------ bağlantılar ------------------------------ */

  $('btnCam').addEventListener('click', () => $('camInput').click());
  $('btnGal').addEventListener('click', () => $('galInput').click());
  $('btnPhoneAttach').addEventListener('click', () => $('galInput').click());

  $('camInput').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  $('galInput').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });

  $('btnPhoneSend').addEventListener('click', send);
  $('phoneInput').addEventListener('input', () => {
    const t = $('phoneInput');
    t.style.height = 'auto';
    t.style.height = Math.min(96, t.scrollHeight) + 'px';
    updateSend();
  });
  $('phoneInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send();
    }
  });

  $('phViewClose').addEventListener('click', () => $('phView').classList.remove('on'));
  $('phView').addEventListener('click', e => {
    if (e.target === $('phView')) $('phView').classList.remove('on');
  });

  start();
})();
