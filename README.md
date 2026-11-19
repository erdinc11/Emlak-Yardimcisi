# Emlak Yardımcısı

Kira sözleşmesi ve tahliye taahhütnamesini fotoğraflardan ve sohbetle hazırlayan,
tamamen ücretsiz çalışan bir web uygulaması.

- **Arayüz:** GitHub Pages — https://erdinc11.github.io/Emlak-Yardimcisi/
- **Telefon sayfası:** https://erdinc11.github.io/Emlak-Yardimcisi/m.html
- **API / yapay zekâ köprüsü:** Cloudflare Worker — `emlak-yardimcisi-api.erdibaba3.workers.dev`

## Nasıl çalışır

1. Masaüstünde şifreyle giriş yapılır (cihaz bir kez hatırlar).
2. Sohbete kimlik/tapu/WhatsApp ekran görüntüsü gibi fotoğraflar yüklenir.
3. Görseller birlikte değerlendirilir; isim, T.C., telefon, adres gibi bilgiler
   eşleştirilip sözleşmedeki doğru alanlara yerleştirilir.
4. Yalnızca gerçekten belirsiz kalan bilgiler (ör. "bu kimlik kime ait?")
   hazır seçenekli soru kartlarıyla sorulur.
5. Belge hazır olduğunda "PDF indir" ile yazdırılır; her çıktı geçmişe kaydedilir.
6. Telefondan fotoğraf göndermek için kare kod okutulur; telefon ve masaüstü
   canlı olarak senkronize çalışır.

## Teknik yapı

| Parça | Görev |
|---|---|
| `index.html`, `assets/*` | Arayüz, sözleşme motoru, sohbet |
| `m.html`, `assets/phone.js` | Telefon fotoğraf çekmecesi |
| `worker/` | Cloudflare Worker: giriş, AI proxy, kalıcı depolama, WebSocket |

- AI anahtarı **repoda tutulmaz**; Cloudflare üzerinde `AI_KEY` secret'ı olarak durur.
- Veriler Durable Object içindeki SQLite veritabanında kalıcıdır.
- Masaüstü ↔ telefon senkronizasyonu WebSocket ile yapılır.

## Cloudflare kurulumu

```bash
cd worker
npx wrangler deploy

npx wrangler secret put AI_KEY         # opencode.ai inference anahtarı
npx wrangler secret put PASSWORD       # uygulama giriş şifresi
npx wrangler secret put TOKEN_SECRET   # rastgele uzun bir değer
```

`wrangler.toml` içindeki Worker adı değişirse `assets/config.js` dosyasındaki
`api` adresini de güncelleyin.
