/* Sohbet parçalarının ortak çizimi (masaüstü + telefon) */
(() => {
  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function md(text) {
    let s = esc(text || '');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    const blocks = s.split(/\n{2,}/);
    return blocks.map(block => {
      const lines = block.split('\n');
      if (lines.every(l => /^\s*[-•]\s+/.test(l) || !l.trim())) {
        return '<ul>' + lines.filter(l => l.trim()).map(l => '<li>' + l.replace(/^\s*[-•]\s+/, '') + '</li>').join('') + '</ul>';
      }
      if (lines.every(l => /^\s*\d+[.)]\s+/.test(l) || !l.trim())) {
        return '<ol>' + lines.filter(l => l.trim()).map(l => '<li>' + l.replace(/^\s*\d+[.)]\s+/, '') + '</li>').join('') + '</ol>';
      }
      return '<p>' + lines.join('<br>') + '</p>';
    }).join('');
  }

  function timeLabel(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  const ORB_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 10.9 10.1 9Z"/><path d="M18.5 16.5 19.4 19l2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z"/></svg>`;
  const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5 5L20 6.5"/></svg>`;
  const ADD_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
  const X_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  const DOC_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>`;

  const PHOTO_LABEL = {
    new: 'Sırada',
    processing: 'İnceleniyor…',
    question: 'Soru soruldu',
    done: 'Okundu',
    error: 'Okunamadı'
  };

  function photoStrip(ids, urlFor, compact) {
    if (!ids || !ids.length) return '';
    return `<div class="photo-strip">` + ids.map(id => `
      <div class="photo-thumb" data-photo="${esc(id)}">
        <img src="${urlFor(id)}" alt="" loading="lazy" />
        <div class="veil"><div class="orb" style="width:18px;height:18px;box-shadow:none"></div><span>Yükleniyor…</span></div>
      </div>`).join('') + `</div>`;
  }

  function photoOverlay(status) {
    if (status === 'done' || !status) return { veil: false, badge: status === 'done' };
    if (status === 'processing') {
      return { veil: true, html: `<div class="scanline"></div><div class="orb" style="width:18px;height:18px;box-shadow:none"></div><span>İnceleniyor…</span>` };
    }
    if (status === 'question') {
      return { veil: true, html: `<span style="font-size:15px">?</span><span>Soru soruldu</span>` };
    }
    if (status === 'error') {
      return { veil: true, html: `<span>Okunamadı</span>` };
    }
    return { veil: true, html: `<span>${esc(PHOTO_LABEL[status] || '')}</span>` };
  }

  function questionCard(m) {
    if (m.answered) {
      const rows = (m.answers || []).map(a => {
        const q = (m.questions || []).find(x => x.id === a.id);
        return `<div class="row"><b>${esc(q ? q.label : a.id)}</b><span>${esc(a.value)}</span></div>`;
      }).join('');
      return `<div class="qcard answered" data-mid="${esc(m.id)}">
        <div class="qhead">
          <div class="ic">${CHECK_SVG}</div>
          <b>${esc(m.title || 'Sorular yanıtlandı')}</b>
          <span class="done-badge">${CHECK_SVG} Yanıtlandı</span>
        </div>
        <div class="summary">${rows}</div>
      </div>`;
    }

    const qs = m.questions || [];
    const blocks = qs.map((q, i) => {
      const opts = (q.options || []).filter(o => !/yazacağım|kendim yaz|diğer|^other$/i.test(String(o).trim()));
      return `
      <div class="qblock" data-qid="${esc(q.id)}" data-field="${esc(q.field || '')}" ${i ? 'hidden' : ''}>
        <div class="qlabel">${esc(q.question || q.label)}</div>
        ${q.label && q.label !== q.question ? `<div class="qhint">${esc(q.label)}</div>` : ''}
        <div class="chips">
          ${opts.map(o => `<button class="chip" data-value="${esc(o)}">${esc(o)}</button>`).join('')}
        </div>
        ${q.allowFreeText !== false ? `<div class="qcustom"><input placeholder="Kendiniz yazın…" autocomplete="off" /></div>` : ''}
      </div>`;
    }).join('');

    const dots = qs.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');

    return `<div class="qcard" data-mid="${esc(m.id)}" data-total="${qs.length}">
      <div class="qhead">
        <div class="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 1 1 4.9 2.3c-.9.7-1.5 1.2-1.5 2.2"/><path d="M12.5 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
        </div>
        <b>${esc(m.title || 'Bir şeyi netleştirelim')}</b>
        <span class="qstep">1 / ${qs.length}</span>
      </div>
      ${blocks}
      <div class="qfoot">
        <button type="button" class="btn ghost qback" disabled>Geri</button>
        <div class="qdots">${dots}</div>
        <button type="button" class="btn primary qnext">${qs.length > 1 ? 'İleri' : 'Gönder'}</button>
      </div>
    </div>`;
  }

  function messageHTML(m, opts) {
    opts = opts || {};
    const urlFor = opts.photoUrl || (() => '');
    const compact = opts.compact;

    if (m.kind === 'question') return questionCard(m);

    if (m.kind === 'updates') {
      return `<div class="updates">${(m.items || []).map(it => `
        <div class="update">${CHECK_SVG}<span><b>${esc(it.label)}</b> <span class="val">${esc(it.value)}</span></span></div>`).join('')}</div>`;
    }

    if (m.kind === 'notice') {
      return `<div class="msg ai"><div class="body"><div class="text" style="background:var(--amber-soft);color:#7A4A00;font-size:12.5px">${esc(m.text)}</div></div></div>`;
    }

    const refs = (m.refs && m.refs.length)
      ? `<div class="refs">${m.refs.map(r => `<span class="ref" style="background:rgba(255,255,255,.13);color:#fff">${DOC_SVG}${esc(r.label)}</span>`).join('')}</div>`
      : '';

    const photos = photoStrip(m.photos, urlFor, compact);

    if (m.role === 'user') {
      return `<div class="msg user" data-mid="${esc(m.id)}">
        <div class="body">
          ${refs}
          ${photos}
          ${m.text ? `<div class="text md">${md(m.text)}</div>` : ''}
          <div class="meta">${timeLabel(m.at)}</div>
        </div>
      </div>`;
    }

    return `<div class="msg ai" data-mid="${esc(m.id)}">
      <div class="bubble-avatar">${ORB_SVG}</div>
      <div class="body">
        ${photos}
        <div class="text md">${md(m.text)}</div>
      </div>
    </div>`;
  }

  function wireQuestionCard(card, m, onSubmit, onInvalid) {
    if (!card || m.answered) return;
    const blocks = [...card.querySelectorAll('.qblock')];
    const back = card.querySelector('.qback');
    const next = card.querySelector('.qnext');
    const dots = [...card.querySelectorAll('.qdots i')];
    const step = card.querySelector('.qstep');
    const total = blocks.length;
    let cur = 0;

    const answered = b => String(b.dataset.answer || '').trim().length > 0;

    const paint = () => {
      blocks.forEach((b, i) => { b.hidden = i !== cur; });
      dots.forEach((d, i) => d.classList.toggle('on', i === cur));
      if (step) step.textContent = `${cur + 1} / ${total}`;
      back.disabled = cur === 0;
      const isLast = cur === total - 1;
      next.innerHTML = isLast ? `${CHECK_SVG} Gönder` : 'İleri';
      next.disabled = !answered(blocks[cur]) || (isLast && !blocks.every(answered));
    };

    const pick = (b, v) => {
      b.dataset.answer = v;
      b.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.value === v));
      const input = b.querySelector('.qcustom input');
      if (input && input.value !== v) input.value = '';
      paint();
    };

    card.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const b = chip.closest('.qblock');
        if (b.dataset.answer === chip.dataset.value) {
          b.dataset.answer = '';
          chip.classList.remove('on');
          paint();
        } else {
          pick(b, chip.dataset.value);
        }
      });
    });

    card.querySelectorAll('.qcustom input').forEach(input => {
      input.addEventListener('input', () => {
        const b = input.closest('.qblock');
        b.dataset.answer = input.value;
        b.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        paint();
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          if (!next.disabled) next.click();
        }
      });
    });

    back.addEventListener('click', () => {
      if (cur > 0) { cur--; paint(); }
    });

    next.addEventListener('click', () => {
      if (next.disabled) return;
      if (cur < total - 1) { cur++; paint(); return; }
      if (!blocks.every(answered)) return onInvalid && onInvalid();
      const answers = blocks.map(b => ({
        id: b.dataset.qid,
        value: String(b.dataset.answer || '').trim(),
        field: b.dataset.field || null
      }));
      next.disabled = true;
      next.innerHTML = 'Gönderiliyor…';
      onSubmit(answers);
    });

    paint();
  }

  function activityHTML(activity) {
    if (!activity) return '';
    return `<div class="msg ai activity-msg">
      <div class="bubble-avatar"><div class="orb" style="width:18px;height:18px;box-shadow:none"></div></div>
      <div class="body">
        <div class="thinking">
          <div class="orb"></div>
          <span>${esc(activity.label || 'Düşünüyor')}</span>
          <span class="dots"><i></i><i></i><i></i></span>
        </div>
        <div class="steps">
          <div class="step on"><span class="spin"></span>Belgeler ve bilgiler kontrol ediliyor</div>
          <div class="step"><span class="tick">${CHECK_SVG}</span>Doğru alanlar eşleştiriliyor</div>
          <div class="step"><span class="tick">${CHECK_SVG}</span>Belgeye yerleştiriliyor</div>
        </div>
      </div>
    </div>`;
  }

  window.ChatUI = {
    esc, md, timeLabel, messageHTML, photoStrip, questionCard,
    wireQuestionCard, activityHTML, photoOverlay, icons: { ORB_SVG, CHECK_SVG, ADD_SVG, X_SVG, DOC_SVG },
    PHOTO_LABEL
  };
})();
