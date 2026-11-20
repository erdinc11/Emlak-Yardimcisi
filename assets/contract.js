/* ============================================================
   Emlak Yardımcısı — sözleşme motoru
   Orijinal "Kira Sözleşmesi Üretici" belge dizgisi korunmuştur.
   ============================================================ */
(() => {
  const defaults = {
    province: 'İzmir',
    district: 'Karşıyaka',
    neighborhood: '',
    street: '',
    buildingNo: '',
    buildingName: '',
    apartmentNo: '',

    landlordName: '',
    landlordTckn: '',
    landlordPhone: '',
    landlord2Enabled: false,
    landlord2Name: '',
    landlord2Tckn: '',
    landlord2Phone: '',

    tenantName: '',
    tenantTckn: '',
    tenantPhone: '',
    tenant2Enabled: false,
    tenant2Name: '',
    tenant2Tckn: '',
    tenant2Phone: '',
    tenantBusinessAddress: '',

    guarantorName: '',
    guarantorTckn: '',
    guarantorPhone: '',
    guarantor2Enabled: false,
    guarantor2Name: '',
    guarantor2Tckn: '',
    guarantor2Phone: '',

    leaseStart: '',
    durationValue: 1,
    durationUnit: 'year',
    monthlyRent: '',
    paymentMethod: 'iban',
    daskPolicyNo: '',
    depositOneRent: true,
    depositManual: '',
    paymentDayFrom: 1,
    paymentDayTo: 5,
    iban: '',
    demirbaslar: '',
    commitmentDate: '',

    propertyType: 'MESKEN',
    durationText: '',
    propertyCondition: 'BOŞ MESKEN SADECE MESKEN OLARAK KULLANILACAKTIR',

    clauseOverrides: {},
    generalOverrides: {},
    customClauses: []
  };

  const LABELS = {
    province: 'İl',
    district: 'İlçe',
    neighborhood: 'Mahalle',
    street: 'Cadde / Sokak',
    buildingNo: 'Bina No',
    buildingName: 'Bina Adı',
    apartmentNo: 'Daire No',

    landlordName: 'Kiraya Veren Adı Soyadı',
    landlordTckn: 'Kiraya Veren T.C. No',
    landlordPhone: 'Kiraya Veren Telefon',
    landlord2Enabled: 'İkinci Kiraya Veren',
    landlord2Name: 'İkinci Kiraya Veren Adı Soyadı',
    landlord2Tckn: 'İkinci Kiraya Veren T.C. No',
    landlord2Phone: 'İkinci Kiraya Veren Telefon',

    tenantName: 'Kiracı Adı Soyadı',
    tenantTckn: 'Kiracı T.C. No',
    tenantPhone: 'Kiracı Telefon',
    tenant2Enabled: 'İkinci Kiracı',
    tenant2Name: 'İkinci Kiracı Adı Soyadı',
    tenant2Tckn: 'İkinci Kiracı T.C. No',
    tenant2Phone: 'İkinci Kiracı Telefon',
    tenantBusinessAddress: 'Kiracının İş Adresi',

    guarantorName: 'Kefil Adı Soyadı',
    guarantorTckn: 'Kefil T.C. No',
    guarantorPhone: 'Kefil Telefon',
    guarantor2Enabled: 'İkinci Kefil',
    guarantor2Name: 'İkinci Kefil Adı Soyadı',
    guarantor2Tckn: 'İkinci Kefil T.C. No',
    guarantor2Phone: 'İkinci Kefil Telefon',

    leaseStart: 'Kira Başlangıç Tarihi',
    durationValue: 'Sözleşme Süresi',
    durationUnit: 'Süre Birimi',
    monthlyRent: 'Aylık Kira Bedeli',
    paymentMethod: 'Kira Ödeme Şekli',
    daskPolicyNo: 'DASK Poliçe No',
    depositOneRent: 'Depozito 1 Kira Bedeli',
    depositManual: 'Depozito Bedeli',
    paymentDayFrom: 'Ödeme Günü Başlangıç',
    paymentDayTo: 'Ödeme Günü Bitiş',
    iban: 'IBAN',
    demirbaslar: 'Demirbaşlar',
    commitmentDate: 'Taahhüt Tarihi',

    propertyType: 'Kiralananın Cinsi',
    durationText: 'Sözleşmenin Süresi (metin)',
    propertyCondition: 'Kiralananın Durumu ve Kullanım Şekli',
    customClauses: 'Ek Koşullar',
    clauseOverrides: 'Madde metni'
  };

  const GROUPS = [
    {
      title: 'Adres',
      keys: ['province', 'district', 'neighborhood', 'street', 'buildingNo', 'buildingName', 'apartmentNo']
    },
    {
      title: 'Kiraya Veren',
      keys: ['landlordName', 'landlordTckn', 'landlordPhone', 'landlord2Name', 'landlord2Tckn', 'landlord2Phone']
    },
    {
      title: 'Kiracı',
      keys: ['tenantName', 'tenantTckn', 'tenantPhone', 'tenant2Name', 'tenant2Tckn', 'tenant2Phone', 'tenantBusinessAddress']
    },
    {
      title: 'Kefil',
      keys: ['guarantorName', 'guarantorTckn', 'guarantorPhone', 'guarantor2Name', 'guarantor2Tckn', 'guarantor2Phone']
    },
    {
      title: 'Kira Bilgileri',
      keys: ['leaseStart', 'durationValue', 'durationUnit', 'monthlyRent', 'paymentMethod', 'daskPolicyNo', 'depositOneRent', 'depositManual', 'paymentDayFrom', 'paymentDayTo', 'iban', 'demirbaslar']
    },
    {
      title: 'Sözleşme Metinleri',
      keys: ['propertyType', 'durationText', 'propertyCondition', 'commitmentDate']
    }
  ];

  const REQUIRED = [
    ['province', 'İl'],
    ['district', 'İlçe'],
    ['neighborhood', 'Mahalle'],
    ['street', 'Cadde / Sokak'],
    ['buildingNo', 'Bina No'],
    ['apartmentNo', 'Daire No'],
    ['landlordName', 'Kiraya Veren Adı Soyadı'],
    ['landlordTckn', 'Kiraya Veren T.C. No'],
    ['tenantName', 'Kiracı Adı Soyadı'],
    ['tenantTckn', 'Kiracı T.C. No'],
    ['tenantBusinessAddress', 'Kiracının İş Adresi'],
    ['leaseStart', 'Kira Başlangıç Tarihi'],
    ['durationValue', 'Sözleşme Süresi'],
    ['monthlyRent', 'Aylık Kira Bedeli'],
    ['paymentDayFrom', 'Ödeme Günü Başlangıç'],
    ['paymentDayTo', 'Ödeme Günü Bitiş'],
    ['iban', 'IBAN'],
    ['commitmentDate', 'Taahhüt Tarihi']
  ];

  const tcknKeys = ['landlordTckn', 'landlord2Tckn', 'tenantTckn', 'tenant2Tckn', 'guarantorTckn', 'guarantor2Tckn'];
  const phoneKeys = ['landlordPhone', 'landlord2Phone', 'tenantPhone', 'tenant2Phone', 'guarantorPhone', 'guarantor2Phone'];

  const esc = v => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const isBlank = v => String(v ?? '').trim() === '';
  const blank = v => { const s = String(v ?? '').trim(); return s ? esc(s) : '&nbsp;'; };
  const onlyDigits = v => String(v ?? '').replace(/\D/g, '');
  const toNumber = v => { const n = Number(String(v ?? '').replace(/[^\d]/g, '')); return Number.isFinite(n) ? n : 0; };

  function u(state, key, value, opts) {
    opts = opts || {};
    const label = LABELS[key] || key;
    const raw = String(value ?? '');
    let inner = esc(raw);
    if (opts.multiline) inner = inner.replace(/\n/g, '<br>');
    const empty = inner === '';
    if (empty) inner = '&nbsp;';
    const prefix = opts.prefix ? `<strong class="u-label">${esc(opts.prefix)}</strong> ` : '';
    return `<span class="u${empty ? ' is-empty' : ''}" data-key="${esc(key)}" data-label="${esc(label)}">${prefix}${inner}</span>`;
  }

  function normalizePhoneDigits(v) {
    const d = onlyDigits(v);
    return d.startsWith('0') ? d.slice(0, 11) : d.slice(0, 10);
  }

  function phoneFormat(v) {
    const d = normalizePhoneDigits(v);
    if (!d) return '';
    if (d.startsWith('0')) {
      if (d.length <= 4) return d;
      if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
      return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
    }
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
  }

  const moneyNumber = v => {
    const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    const n = moneyNumber(v);
    return n ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) : '';
  };
  const moneyFormat = n => n ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) : '';

  function identitySpans(state, prefix, name, tckn, phone) {
    const parts = [];
    if (!isBlank(name)) parts.push(u(state, prefix + 'Name', name, { prefix: 'Adı Soyadı:' }));
    if (!isBlank(tckn)) parts.push(u(state, prefix + 'Tckn', tckn, { prefix: 'T.C. No:' }));
    if (!isBlank(phone)) parts.push(u(state, prefix + 'Phone', phoneFormat(phone), { prefix: 'Telefon:' }));
    return parts;
  }

  function partiesInline(state, primary, secondary, secondaryEnabled) {
    const groups = [{ label: '', parts: identitySpans(state, primary.prefix, primary.name, primary.tckn, primary.phone) }];
    if (secondaryEnabled) groups.push({ label: 'İkinci kişi: ', parts: identitySpans(state, secondary.prefix, secondary.name, secondary.tckn, secondary.phone) });
    const filled = groups.filter(g => g.parts.length > 0);
    if (!filled.length) return u(state, primary.prefix + 'Name', '');
    return filled.map(g => `${g.label ? `<strong>${g.label}</strong>` : ''}${g.parts.join(' · ')}`).join(' &nbsp; ');
  }

  const landlordInline = s => partiesInline(s,
    { prefix: 'landlord', name: s.landlordName, tckn: s.landlordTckn, phone: s.landlordPhone },
    { prefix: 'landlord2', name: s.landlord2Name, tckn: s.landlord2Tckn, phone: s.landlord2Phone },
    s.landlord2Enabled);

  const tenantInline = s => partiesInline(s,
    { prefix: 'tenant', name: s.tenantName, tckn: s.tenantTckn, phone: s.tenantPhone },
    { prefix: 'tenant2', name: s.tenant2Name, tckn: s.tenant2Tckn, phone: s.tenant2Phone },
    s.tenant2Enabled);

  const guarantorInline = s => partiesInline(s,
    { prefix: 'guarantor', name: s.guarantorName, tckn: s.guarantorTckn, phone: s.guarantorPhone },
    { prefix: 'guarantor2', name: s.guarantor2Name, tckn: s.guarantor2Tckn, phone: s.guarantor2Phone },
    s.guarantor2Enabled);

  function dualValueInline(state, a, b, enabled, keyA, keyB) {
    const parts = [];
    if (!isBlank(a)) parts.push(u(state, keyA, a));
    if (enabled && !isBlank(b)) parts.push(u(state, keyB, b));
    if (!parts.length) return u(state, keyA, '');
    return parts.join(' &nbsp;&nbsp; ');
  }

  function joinedPartyNames(primary, secondary, enabled) {
    return [primary, enabled ? secondary : ''].filter(v => !isBlank(v)).join(' ve ');
  }
  const landlordNames = s => joinedPartyNames(s.landlordName, s.landlord2Name, s.landlord2Enabled);
  const tenantNames = s => joinedPartyNames(s.tenantName, s.tenant2Name, s.tenant2Enabled);
  const guarantorNames = s => joinedPartyNames(s.guarantorName, s.guarantor2Name, s.guarantor2Enabled);

  function safeFilePart(v, fallback) {
    const s = String(v ?? '').trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/\.+$/g, '')
      .slice(0, 80);
    return s || fallback;
  }

  function fileNameBase(s) {
    const people = [landlordNames(s), tenantNames(s)].filter(v => !isBlank(v));
    const place = safeFilePart([s.neighborhood, s.apartmentNo ? 'Daire ' + s.apartmentNo : ''].filter(Boolean).join(' '), '');
    if (!people.length) {
      return ['Kira Sözleşmesi', place].filter(Boolean).join(' - ');
    }
    return [...people.map(p => safeFilePart(p, 'Taraf')), place].filter(Boolean).join(' - ');
  }

  const pad = n => String(n).padStart(2, '0');
  function formatDate(value) {
    if (!value) return ' / / ';
    const d = new Date(value + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return ' / / ';
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  const depositAmount = s => s.depositOneRent ? moneyNumber(s.monthlyRent) : moneyNumber(s.depositManual);
  function depositText(s) {
    const n = depositAmount(s);
    return n ? `${moneyFormat(n)} TL` : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TL';
  }

  function addMonths(dateStr, months) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    d.setMonth(d.getMonth() + months, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d.toISOString().slice(0, 10);
  }

  function addYears(dateStr, years) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.getMonth();
    d.setFullYear(d.getFullYear() + years, month, 1);
    const last = new Date(d.getFullYear(), month + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d.toISOString().slice(0, 10);
  }

  function leaseDurationText(s) {
    const val = Math.max(1, toNumber(s.durationValue) || 1);
    return `${val} ${s.durationUnit === 'month' ? 'ay' : 'yıl'}`;
  }
  const effectiveDurationText = s => String(s.durationText ?? '').trim() || leaseDurationText(s);
  function leaseDurationSentence(s) {
    const val = Math.max(1, toNumber(s.durationValue) || 1);
    return `bir ( ${val} ) ${s.durationUnit === 'month' ? 'ay' : 'yıl'}dır`;
  }
  function leaseEndDate(s) {
    const val = Math.max(1, toNumber(s.durationValue) || 1);
    if (!s.leaseStart) return '';
    return s.durationUnit === 'month' ? addMonths(s.leaseStart, val) : addYears(s.leaseStart, val);
  }
  const taahhutDate = s => s.commitmentDate || s.leaseStart;
  const annualRent = s => moneyNumber(s.monthlyRent) * 12;

  function paymentDays(s) {
    const a = toNumber(s.paymentDayFrom);
    const b = toNumber(s.paymentDayTo);
    if (a && b && a !== b) return `${a}-${b}`;
    return String(a || b || '');
  }

  const ibanClean = s => String(s.iban || '').replace(/\s+/g, '').toUpperCase();
  function ibanFormatted(s) {
    const v = ibanClean(s);
    return v ? v.replace(/(.{4})(?=.)/g, '$1 ').trim() : '';
  }

  const buildingIdentity = s => [s.buildingNo, s.buildingName].filter(Boolean).join(' ');
  function addressLine(s) {
    return [
      s.neighborhood ? `Mahalle: ${s.neighborhood}` : '',
      s.street ? `Cadde/Sokak: ${s.street}` : '',
      s.buildingNo ? `Bina No: ${s.buildingNo}` : '',
      s.buildingName ? `Bina Adı: ${s.buildingName}` : '',
      s.apartmentNo ? `Daire No: ${s.apartmentNo}` : '',
      s.district ? `İlçe: ${s.district}` : '',
      s.province ? `İl: ${s.province}` : ''
    ].filter(Boolean).join(' ');
  }

  function sigTable(s) {
    return `<table class="sig-table"><thead><tr>
      <th>KİRAYA VEREN</th><th>MÜTESELSİL BORÇLU VE KEFİL</th><th>KİRACI</th>
    </tr></thead><tbody><tr>
      <td>${landlordInline(s)}</td><td>${guarantorInline(s)}</td><td>${tenantInline(s)}</td>
    </tr></tbody></table>`;
  }

  const contractRow = (label, value, cls = '') =>
    `<tr class="${cls}"><th>${label}</th><td>${value}</td></tr>`;

  function page1(s) {
    const monthly = money(s.monthlyRent);
    const annual = annualRent(s);
    const iban = ibanFormatted(s);

    return `<section class="page contract-page"><div class="page-inner">
      <h1 class="title">KİRA SÖZLEŞMESİ</h1>
      <table class="contract-table"><tbody>
        ${contractRow('Dairesi', u(s, 'apartmentNo', s.apartmentNo))}
        ${contractRow('Mahallesi', u(s, 'neighborhood', s.neighborhood))}
        ${contractRow('Cadde/Sokağı', u(s, 'street', s.street))}
        ${contractRow('Numarası', `${u(s, 'buildingNo', s.buildingNo)} ${u(s, 'buildingName', s.buildingName)}`)}
        ${contractRow('Kiralananın<br>Cinsi', u(s, 'propertyType', s.propertyType), 'mid')}
        ${contractRow('Kiraya Veren<br>Bilgileri', landlordInline(s), 'xbig')}
        ${contractRow('Kiracı<br>Bilgileri', tenantInline(s), 'big')}
        ${contractRow('Kiracının İş<br>Adresi', u(s, 'tenantBusinessAddress', s.tenantBusinessAddress, { multiline: true }), 'big')}
        ${contractRow('Kira Başlangıç<br>Tarihi', u(s, 'leaseStart', formatDate(s.leaseStart)), 'mid')}
        ${contractRow('Sözleşmenin<br>Süresi', u(s, 'durationText', effectiveDurationText(s)), 'mid')}
        ${contractRow('Aylık Kira Bedeli', u(s, 'monthlyRent', monthly ? `${monthly} TL` : ''))}
        ${contractRow('Yıllık Kira Bedeli', annual ? `${moneyFormat(annual)} TL` : '&nbsp;')}
        ${contractRow('DASK Poliçe No', u(s, 'daskPolicyNo', s.daskPolicyNo))}
        ${contractRow('Kira Ödeme<br>Şekli', s.paymentMethod === 'cash'
          ? u(s, 'paymentMethod', 'ELDEN NAKİT')
          : u(s, 'iban', iban), 'mid')}
        ${contractRow('Kiralananın<br>Durumu<br>ve Kullanım<br>Şekli', u(s, 'propertyCondition', s.propertyCondition, { multiline: true }), 'big')}
        ${contractRow('Kiralananla<br>Birlikte<br>Teslim Edilen<br>Demirbaşlar', u(s, 'demirbaslar', s.demirbaslar, { multiline: true }), 'tall')}
      </tbody></table>
      ${sigTable(s)}
    </div></section>`;
  }

  function gClause(s, no, inner) {
    const over = s.generalOverrides && s.generalOverrides[String(no)];
    const numbered = over && /^\s*\d+[.)]/.test(String(over));
    const body = over
      ? `<p>${numbered ? esc(over) : `<b>${no}.</b> ${esc(over)}`}</p>`
      : inner;
    return `<div class="clause-block" data-ref-clause="g${no}" data-ref-label="Genel Koşullar ${no}. madde">${body}</div>`;
  }

  function page2(s) {
    return `<section class="page conditions-page"><div class="page-inner">
      <h1>GENEL KOŞULLAR</h1>
      <div class="conditions-content">
        ${gClause(s, 1, `
          <p><b>1.</b> Bu kira sözleşmesinde kullanılacak tabirler:</p>
          <p><b><u>KİRAYA VEREN :</u></b> Gayrimenkul / menkul’ü kiraya verecek olup, bu sözleşmeye taraf olan mülk sahibi veya yetkili vekilini tanımlar.</p>
          <p><b><u>KİRACI:</u></b> Gayrimenkul / menkul’ü kiralayacak olup, bu sözleşmeye taraf olan kiralayan veya yetkili vekilidir.</p>
          <p><b><u>KİRALANAN:</u></b> İş bu sözleşmeye konu olan ve taraflarca sözleşmede belirtilen hususlarda üzerinde anlaşma sağlanan gayrimenkul / menkul’ü tanımlar.</p>
        `)}
        ${gClause(s, 2, `<p><b>2.</b> Kiracı; kiralananı kısmen veya tamamen başkasına devredemez, kullandıramaz, kiraya veremez, kiralama amacı dışında kullanamaz. Bu kuralların aksine hareketler tahliye sebebi olarak kabul edilecektir.(B.K Md.322)</p>`)}
        ${gClause(s, 3, `
          <p><b>3.</b> Kiracı; kiralananı, sözleşmeye uygun olarak özenle kullanmak ve kiralananın bulunduğu taşınmazda oturan kişiler ile komşulara gerekli saygıyı göstermekle yükümlüdür. Kiracının bu yükümlülüğüne aykırı davranması durumunda kiraya veren, en az otuz (30) gün süre vererek, aykırılığın giderilmesi, aksi takdirde sözleşmeyi feshedeceği konusunda yazılı bir ihtarda bulunur.</p>
          <p class="indent">Kiracının, kiralanana kasten ağır bir zarar vermesi, kiracıya verilecek sürenin yararsız olacağının anlaşılması veya kiracının bu yükümlülüğe aykırı davranışının kiraya veren veya aynı taşınmazda oturan kişiler ile komşular bakımından çekilmez olması durumlarında kiraya veren, yazılı bir bildirimle sözleşmeyi hemen feshedebilir. (T.B.K. Md. 316)</p>
        `)}
        ${gClause(s, 4, `
          <p><b>4.</b> Kiracı; kiraya verenin yazılı izni olmadan kiralananda ana yapıyı bozacak hiçbir tadilat ve ilave yapamaz.Yenilik ve değişikliklere rıza gösteren kiraya veren, yazılı olarak kararlaştırılmış olmadıkça, kiralananın eski durumuyla geri verilmesini isteyemez.Kiracı; aksine yazılı bir anlaşma yoksa, kiraya verenin rızasıyla yaptığı yenilik ve değişiklikler sebebiyle kiralananda ortaya çıkan değer artışının karşılığını isteyemez. (T.B.K. Md.321)</p>
          <p class="indent">Kira akdi devam ettiği sürece kiralananda her ne sebeple olursa olsun kiracının kendi kusuru ile meydana gelebilecek her türlü hasar ve arızalar kiracı tarafından giderilecek olup bu hususlardan dolayı kiraya verenden talep de bulunulamaz.</p>
        `)}
        ${gClause(s, 5, `<p><b>5.</b> Kiracı; ısıtma, aydınlatma, su, site/apt. yönetim aidatı, iş yerlerinde çevre temizlik vergisi vs. gibi kullanma giderlerine katlanmakla yükümlüdür. Bu giderleri ispat edici belgelerin birer örneğini, istem üzerine diğer tarafa (kiralayana) vermek zorundadır. (T.B.K. Md. 341)</p>`)}
        ${gClause(s, 6, `<p><b>6.</b> Gayrimenkule ait elektrik, su ve doğal gaz abonelikleri kiracı tarafından yaptırılacaktır.(üzerine alınacaktır)</p>`)}
        ${gClause(s, 7, `<p><b>7.</b> Kiracı; kiralananın tesliminden sonra muaccel olan kira bedelini veya yan gideri ödeme borcunu ifa etmezse, kiraya veren, kiracıya yazılı olarak en az otuz (30) gün süre verir, bu sürede de ifa etmeme durumunda, sözleşmeyi feshedeceğini bildirir. (T.B.K. Md. 315)</p>`)}
        ${gClause(s, 8, `<p><b>8.</b> Kiraya veren; kiralananın kullanımıyla ilgili olmak üzere, kendisi veya üçüncü kişi tarafından yapılan yan giderlere katlanmakla yükümlüdür. (T.B.K. Md. 303)</p>`)}
        ${gClause(s, 9, `<p><b>9.</b> Kiracı; kiralananı ne durumda teslim almışsa, kira sözleşmesinin bitiminde o durumda geri vermekle yükümlüdür. Kiracı; sözleşmenin sona ermesi hâlinde, sözleşmeye aykırı kullanmadan doğacak zararları gidermekle yükümlüdür. (T.B.K. Md. 334)</p>`)}
        ${gClause(s, 10, `<p><b>10.</b> Kiracı, belirli süreli kira sözleşmesinin süresinin bitiminden en az on beş gün öncesine kadar bildirimde bulunmadıkça, sözleşme aynı koşullarla bir yıl için uzatılmış sayılır. (T.B.K. Md. 347)</p>`)}
      </div>
      <div class="conditions-sign">${sigTable(s)}</div>
    </div></section>`;
  }

  function clause(s, no, html) {
    const over = s.clauseOverrides && s.clauseOverrides[String(no)];
    const numbered = over && /^\s*\d+[.)]/.test(String(over));
    const body = over
      ? (numbered ? esc(over) : `<b>${no}.</b> ${esc(over)}`)
      : html;
    return `<p data-clause="${no}" data-ref-clause="c${no}" data-ref-label="${no}. madde">${body}</p>`;
  }

  function page3(s) {
    const monthly = money(s.monthlyRent);
    const annual = annualRent(s);
    const iban = ibanFormatted(s);
    const deposit = depositText(s);
    const extrasArr = Array.isArray(s.customClauses) ? s.customClauses : [];
    const summaryNo = 24 + extrasArr.length;
    const total = summaryNo;

    const extras = extrasArr.map((c, i) =>
      `<p data-extra="${i}" data-ref-clause="c${24 + i}" data-ref-label="${24 + i}. madde"><b>${24 + i}.</b> ${esc(c)}</p>`
    ).join('');

    return `<section class="page conditions-page"><div class="page-inner">
      <div class="conditions-content">
        <p>Kiracı belirli süreli kira sözleşmelerinde gayrimenkulü kira tarihinin bitmesinden önce tahliye ederse gayrimenkulün yeniden kiralanana kadar geçecek süre zarfında makul bir süre kadar kira bedelini ödemeyi taahhüt eder. Müteakip yıllarda kiracı gayrimenkulü tahliye etmeden 1 ay öncesinden mülk sahibine yazılı olarak tahliye talebini bildirmek zorundadır.</p>
        ${clause(s, 11, `<b>11.</b> Kira başlangıç tarihi; ${u(s, 'leaseStart', formatDate(s.leaseStart))} ’dir. Kira kontrat süresi ${leaseDurationSentence(s)}. Kira bitiş tarihi : ${formatDate(leaseEndDate(s))}’dır`)}
        ${clause(s, 12, `<b>12.</b> Kira bedeli; PEŞİN ve NET ilk yıl için ( ${monthly ? monthly + ' TL' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TL'} )dir. Müteakip yıllarda kira artışları bir önceki yılın aynı ayına göre belirtilen aynı oranda yıllık TÜFE ortalamasına göre olacaktır. ${s.paymentMethod === 'cash' ? 'İlk aya ait kira bedeli elden ödenmiştir.' : 'İlk aya ait kira bedeli Hesap numarasına aktarılmıştır.'}`)}
        ${clause(s, 13, s.paymentMethod === 'cash'
          ? `<b>13.</b> Kira bedelleri her ayın ${blank(paymentDays(s))} günleri arasında ${blank(`Kiraya Veren: ${payeeName(s)}`)} adına, ELDEN NAKİT olarak düzenli olarak ödenecektir.`
          : `<b>13.</b> Kira bedelleri her ayın ${blank(paymentDays(s))} günleri arasında ${blank(`Kiraya Veren: ${payeeName(s)}`)} adına, İBAN ${u(s, 'iban', iban)} hesabına düzenli olarak yatırılacaktır.`)}
        ${clause(s, 14, `<b>14.</b> Kiracı, kiralayana ( ${deposit} ) depozito vermiş olup, kiralanan tahliye edildiğinde herhangi bir borcu ve hasar olmaması durumunda bu depozito kiracıya aynen iade edilecektir.`)}
        ${clause(s, 15, `<b>15. Kefil kira akdi devam ettiği süre kefaleti devam eder.aylık ${monthly ? monthly + ' TL' : 'TL'} Yıllık ${annual ? moneyFormat(annual) + ' TL' : 'TL'} kabul eder.</b>`)}
        ${clause(s, 16, `${guarantorInline(s)} kefiliği kontrat süresi boyunca müteselsildir. İşbu sözleşmeyi Garantör ve müşterek müteselsil kefil sıfatıyla imzalayan ${blank(`Kefil: ${guarantorNames(s)}`)} kiracının işbu sözleşmeden kaynaklanacak ve bu sözleşme ile ilgili her türlü edimlerine 6098 sayılı Türk Borçlar Kanunu’nun ilgili maddeleri çerçevesinde kiracı ile birlikte ve kiracının yanında müştereken ve müteselsilen sorumlu olacağını garanti etmektedir. Kiracı, kira sözleşmesi çerçevesinde kiralanan taşınmazın kullanılmasından kaynaklanacak kira ve sair borçlarını kiraya veren veya ilgili kuruluşlara karşı yerine getirmemesi durumunda, garantör aleyhine ayrıca bir hüküm alınmasına gerek olmaksızın kiracının borçlarından sorumlu olacaktır. Garantörün sorumluluğu müşterek ve müteselsil kefalet sorumluluğunu içermekte olup kiracılık ilişkisi devam ettiği müddetçe sorumluluğu devam edecektir.`)}
        ${clause(s, 17, `<b>17.</b> Kiracı; kira akdi devam ettiği sürece gayrimenkulde kedi köpek gibi evcil hayvanlarla yabani olarak adlandırılabilecek hiçbir hayvanı besleyemez, barındıramaz.`)}
        ${clause(s, 18, `<b>18.</b> Aile konutu olarak kullanılmak üzere kiralanan taşınmazlarda kiracı, eşinin açık rızası olmadıkça kira sözleşmesini feshedemez. (T.B.K. Md. 349)`)}
        ${clause(s, 19, `<b>19.</b> Kiralananı tahliye etme kararı veren Kiracı, mukavele müddetinin son ayı içinde kiralananı görmeye gelen taliplerin gezip görmesine ve vasıflarını tetkik etmesine karşı koyamaz.`)}
        ${clause(s, 20, `<b>20.</b> Bu sözleşmede yazılı bulunmayan hükümlere ihtiyaç duyulduğunda; 4721 sayılı Türk Medeni Kanunu, 6098 sayılı Türk Borçlar Kanunu, 634 sayılı Kat Mülkiyeti Kanunu, 488 sayılı Damga Vergisi Kanunu ile yürürlükteki diğer ilgili Kanunlar ve Yargıtay Kararları uygulanır. Taraflar yukarıda yazılı kanunların ilgili hükümlerini peşinen kabul etmişlerdir.`)}
        ${clause(s, 21, `<b>21.</b> Kontratta yazılı tebligat adresi kanuni olup, bu adrese yapılacak tebligat geçerli sayılacaktır. Kiracı adres değişikliğini derhal bildirmediği takdirde ilk adresinin kanuni tebligat adresi sayılacağını kabul eder.`)}
        ${clause(s, 22, `<b>22.</b> İşbu kira akdinden dolayı taraflar arasında doğabilecek her türlü uyuşmazlıkların hal mercii ${blank(String(s.province || '').toLocaleUpperCase('tr-TR'))} İcra Daireleri ve Mahkemeleridir.`)}
        ${clause(s, 23, `<b>23.</b> Kiralanan Gayrimenkulde bulunan ve kiracıya teslim edilen demirbaşlar ve gayrimenkulün durumu kira sözleşmesinde belirtilmiş ve listelenmiş olup taraflarca okunup yerinde görülerek imza altına alınmıştır.`)}
        ${extras}
        ${clause(s, summaryNo, `<b>${summaryNo}.</b> İşbu Kira sözleşmesi, Genel Koşullar ve tahliye taahhütnamesi ile toplamda 4 sahife ${total} maddeden ibaret olup, ekleri ile bir bütündür.`)}
        <p class="final">Vasıfları ve kullanım amacı yukarıda ve varsa eklerde belirtilen taşınmaz, tarafların rızasıyla ve yukarıda yazılı şartlarla kiralanmış olduğuna dair bu sözleşme 2 nüsha olarak tanzim ve teati edilmiş olup taraflara birer sureti verilmiştir.</p>
      </div>
      <div class="conditions-sign">${sigTable(s)}</div>
    </div></section>`;
  }

  function page4(s) {
    const taahhut = formatDate(taahhutDate(s));
    return `<section class="page evac-page"><div class="page-inner">
      <h1>TAHLİYE TAAHHÜTNAMESİ</h1>
      <div class="evac-heading">TAAHHÜT EDEN (KİRACI)</div>
      <table class="evac-table"><tbody>
        <tr><th>ADI SOYADI</th><td>${dualValueInline(s, s.tenantName, s.tenant2Name, s.tenant2Enabled, 'tenantName', 'tenant2Name')}</td></tr>
        <tr><th>T.C. NO</th><td>${dualValueInline(s, s.tenantTckn, s.tenant2Tckn, s.tenant2Enabled, 'tenantTckn', 'tenant2Tckn')}</td></tr>
      </tbody></table>
      <div class="evac-heading">MÜLK SAHİBİ (KİRAYA VEREN)</div>
      <table class="evac-table"><tbody>
        <tr><th>ADI SOYADI</th><td>${dualValueInline(s, s.landlordName, s.landlord2Name, s.landlord2Enabled, 'landlordName', 'landlord2Name')}</td></tr>
        <tr><th>T.C.NO</th><td>${dualValueInline(s, s.landlordTckn, s.landlord2Tckn, s.landlord2Enabled, 'landlordTckn', 'landlord2Tckn')}</td></tr>
      </tbody></table>
      <div class="evac-heading">TAHLİYE EDİLECEK GAYRİMENKULÜN</div>
      <table class="evac-table"><tbody>
        <tr><th>ADRESİ</th><td>${blank(addressLine(s))}</td></tr>
        <tr><th>TAHLİYE TARİHİ</th><td>.. / ... / ...</td></tr>
      </tbody></table>
      <p class="evac-text">Halen kiracı olarak kullanmakta olduğum yukarıda yazılı adresteki taşınmazı, kiralayana kira koşullarına uygun olarak kendi arzu ve isteğimle <br/> ... / ... / ... tarihinde tahliye ve teslim edeceğimi beyan ve taahhüt ederim. Hiçbir ihtar ve ihbara gerek kalmadan kayıtsız ve şartsız olarak 6098 sayılı Türk Borçlar Kanunu'nun 350 351 ve 352 maddesi gereğince boş ve sağlam olarak yukarıda belirtilen tarihte tahliye edeceğimi, adı geçen mal sahibinin icrai takibata geçerek yapacağı bilumum masrafları ve tahliyeyi geciktirmemden dolayı uğrayacağı zarar ve ziyanları hiçbir ihtar, ihbar ve hükme gerek kalmadan derhal nakden ve peşinen ödeyeceğimi beyan kabul ve taahhüt ederim.</p>
      <table class="evac-bottom"><tbody>
        <tr><th>TAAHHÜT TARİHİ</th><td>${u(s, 'commitmentDate', taahhut)}</td></tr>
        <tr><th>TAAHHÜT EDEN</th><td>${dualValueInline(s, s.tenantName, s.tenant2Name, s.tenant2Enabled, 'tenantName', 'tenant2Name')}</td></tr>
        <tr><th>İMZASI</th><td>&nbsp;</td></tr>
      </tbody></table>
    </div></section>`;
  }

  function pages(s) {
    return [page1(s), page2(s), page3(s), page4(s)];
  }

  function renderPages(s) {
    return pages(s).map(p => `<div class="page-frame">${p}</div>`).join('');
  }

  function requiredKeys(s) {
    const out = REQUIRED.filter(([key]) => !(key === 'iban' && s.paymentMethod === 'cash'));
    if (s.landlord2Enabled) out.push(['landlord2Name', 'İkinci Kiraya Veren Adı Soyadı'], ['landlord2Tckn', 'İkinci Kiraya Veren T.C. No']);
    if (s.tenant2Enabled) out.push(['tenant2Name', 'İkinci Kiracı Adı Soyadı'], ['tenant2Tckn', 'İkinci Kiracı T.C. No']);
    if (s.guarantor2Enabled) out.push(['guarantor2Name', 'İkinci Kefil Adı Soyadı'], ['guarantor2Tckn', 'İkinci Kefil T.C. No']);
    return out;
  }

  function validate(s) {
    const errors = [];
    for (const [key] of requiredKeys(s)) {
      if (isBlank(s[key])) errors.push(`${LABELS[key] || key} zorunlu.`);
    }

    const tckn = [['landlordTckn', 'Kiraya Veren T.C. No', true], ['landlord2Tckn', 'İkinci Kiraya Veren T.C. No', s.landlord2Enabled],
      ['tenantTckn', 'Kiracı T.C. No', true], ['tenant2Tckn', 'İkinci Kiracı T.C. No', s.tenant2Enabled],
      ['guarantorTckn', 'Kefil T.C. No', true], ['guarantor2Tckn', 'İkinci Kefil T.C. No', s.guarantor2Enabled]];
    for (const [key, label, on] of tckn) {
      if (!on) continue;
      const v = onlyDigits(s[key]);
      if (!isBlank(s[key]) && v.length !== 11) errors.push(`${label} 11 rakam olmalı.`);
    }

    for (const [key, label, on] of [['landlordPhone', 'Kiraya Veren Telefon', true], ['landlord2Phone', 'İkinci Kiraya Veren Telefon', s.landlord2Enabled],
      ['tenantPhone', 'Kiracı Telefon', true], ['tenant2Phone', 'İkinci Kiracı Telefon', s.tenant2Enabled],
      ['guarantorPhone', 'Kefil Telefon', true], ['guarantor2Phone', 'İkinci Kefil Telefon', s.guarantor2Enabled]]) {
      if (!on) continue;
      const v = onlyDigits(s[key]);
      if (v && !/^0\d{10}$/.test(v) && !/^5\d{9}$/.test(v)) errors.push(`${label} geçerli bir numara olmalı.`);
    }

    const iban = ibanClean(s);
    if (s.paymentMethod !== 'cash' && !isBlank(s.iban) && !/^TR\d{24}$/.test(iban)) errors.push('IBAN TR ile başlayıp 26 karakter olmalı.');
    if (toNumber(s.durationValue) < 1) errors.push('Sözleşme süresi en az 1 olmalı.');
    if (moneyNumber(s.monthlyRent) < 1) errors.push('Aylık kira bedeli 0’dan büyük olmalı.');
    if (!s.depositOneRent && moneyNumber(s.depositManual) < 1) errors.push('Depozito bedeli 0’dan büyük olmalı.');

    const a = toNumber(s.paymentDayFrom);
    const b = toNumber(s.paymentDayTo);
    if (a < 1 || a > 31) errors.push('Ödeme günü başlangıç 1-31 arası olmalı.');
    if (b < 1 || b > 31) errors.push('Ödeme günü bitiş 1-31 arası olmalı.');
    if (a && b && a > b) errors.push('Ödeme günü başlangıcı bitişten büyük olamaz.');

    return [...new Set(errors)];
  }

  function tcknValid(v) {
    const x = String(v || '');
    if (!/^\d{11}$/.test(x) || x[0] === '0') return false;
    const d = x.split('').map(Number);
    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    if ((((odd * 7) - even) % 10 + 10) % 10 !== d[9]) return false;
    return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
  }

  function missingDetails(s) {
    const out = [];
    for (const [key, label] of requiredKeys(s)) {
      if (isBlank(s[key])) out.push({ key, label, text: `${label} girilmemiş` });
    }
    if (!isBlank(s.landlordTckn) && onlyDigits(s.landlordTckn).length !== 11) out.push({ key: 'landlordTckn', label: LABELS.landlordTckn, text: 'Kiraya Veren T.C. No 11 haneli olmalı' });
    if (!isBlank(s.tenantTckn) && onlyDigits(s.tenantTckn).length !== 11) out.push({ key: 'tenantTckn', label: LABELS.tenantTckn, text: 'Kiracı T.C. No 11 haneli olmalı' });
    if (s.paymentMethod !== 'cash' && !isBlank(s.iban) && !/^TR\d{24}$/.test(ibanClean(s))) out.push({ key: 'iban', label: 'IBAN', text: 'IBAN geçersiz (TR + 24 rakam olmalı)' });
    const tcs = [['landlordTckn', 'Kiraya Veren T.C. No'], ['tenantTckn', 'Kiracı T.C. No'], ['guarantorTckn', 'Kefil T.C. No']];
    if (s.landlord2Enabled) tcs.push(['landlord2Tckn', 'İkinci Kiraya Veren T.C. No']);
    if (s.tenant2Enabled) tcs.push(['tenant2Tckn', 'İkinci Kiracı T.C. No']);
    if (s.guarantor2Enabled) tcs.push(['guarantor2Tckn', 'İkinci Kefil T.C. No']);
    for (const [key, label] of tcs) {
      if (!isBlank(s[key]) && !tcknValid(s[key])) {
        out.push({ key, label, text: `${label} doğrulanamadı (kontrol hanesi tutmuyor)` });
      }
    }
    return out;
  }

  function payeeName(s) { return landlordNames(s); }

  window.Contract = {
    defaults, LABELS, GROUPS, REQUIRED, tcknKeys, phoneKeys,
    esc, isBlank, blank, onlyDigits, toNumber, money, moneyFormat,
    normalizePhoneDigits, phoneFormat, formatDate, u, tcknValid,
    renderPages, page1, page2, page3, page4,
    validate, missingDetails, fileNameBase, fileName: fileNameBase,
    addressLine, effectiveDurationText, leaseEndDate, paymentDays,
    requiredKeys, depositText
  };
})();
