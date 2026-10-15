# BARÜ Yazılım Birimi — Yoklama

Telefonla QR okutup Öğrenci No + Ad Soyad girilen, terminal temalı bir yoklama ekranı.
Girişler doğrudan Google E-Tablolar'a yazılır; tablodaki haftalık/oturum hesaplaması
(`Yoklama` ve `Ayarlar` sayfaları) değişmeden çalışmaya devam eder.

Sayfalar:
- `index.html` — öğrencinin doldurduğu form (QR'ın açtığı sayfa)
- `goster.html` — projeksiyonda gösterilecek büyük QR kodu
- `panel.html` — **kaptan paneli**: canlı "kim geldi / gelmedi" listesi + elle ekleme
- `apps-script/Code.gs` — Google E-Tablolar'a yazan arka uç

## Kurulum (tek seferlik, ~5 dakika)

### 1) Apps Script'i dağıt

1. Yoklama E-Tablosunu aç: https://docs.google.com/spreadsheets/d/18wNqN0jXftRfkh99oOo6-9SgCw_l26DgvSMB4NCRvWo/edit
2. Üst menüden **Uzantılar > Apps Script**.
3. Açılan editördeki örnek kodu sil, bu depodaki `apps-script/Code.gs` dosyasının tamamını yapıştır.
4. Sağ üstten **Kaydet** (disket ikonu).
5. **Dağıt > Yeni dağıtım**.
6. Dişli ikonundan tür olarak **Web uygulaması** seç.
7. Ayarlar:
   - **Yürüten:** Ben (kendi hesabın)
   - **Erişebilenler:** Herkes
8. **Dağıt**'a bas. Google seni yetkilendirme isteyebilir — kendi hesabınla onayla ("Gelişmiş" > "...'e git (güvenli değil)" uyarısı çıkarsa bu normal, kendi scriptin).
9. Çıkan **Web uygulaması URL'si**ni kopyala (`https://script.google.com/macros/s/.../exec` şeklinde).

**Not:** Kodun en üstünde `var ADMIN_CODE = "CHANGE_ME";` satırı var — bunu kendi
seçtiğin bir kelime/şifreyle değiştir (kaydet + yeniden dağıt). Bu, kaptan
panelini (`panel.html`) açabilmek ve elle yoklama ekleyebilmek için gereken kod.

### 2) Siteye URL'yi tanıt

`config.js` dosyasını aç, şu satırı kendi URL'inle değiştir:

```js
window.YOKLAMA_ENDPOINT = "https://script.google.com/macros/s/BURAYA_YAPISTIR/exec";
```

Değiştirip kaydet, GitHub'a push et (veya Claude'a "URL'yi şuna güncelle" diye yaz).

### 3) GitHub Pages'i aç

1. Repo sayfasında **Settings > Pages**.
2. **Source**: "Deploy from a branch".
3. **Branch**: `main`, klasör `/ (root)`.
4. Kaydet. Birkaç dakika içinde site şu adreste yayına girer:
   `https://yousiframazanoglu.github.io/baru-yazilim-yoklama/`

### 4) Test et

1. Önce `goster.html`'i aç (QR olmadan `index.html`'e `?t=...` eklenmeden giriş kabul edilmez).
2. QR'ı okut (ya da linki `goster.html`'in gösterdiği adresten elle aç), test amaçlı bir
   öğrenci no + isim gir, gönder.
3. Google E-Tablolar'da **Form Yanıtları 1** sayfasına satırın düştüğünü doğrula.
4. `Ayarlar!B5` hücresinde "✓ Bağlı" yazdığını kontrol et.
5. Test satırını sil.
6. `goster.html`'i açık bırakıp süresi dolmasını bekle (ya da `TOKEN_TTL_MS`'i test için
   geçici olarak kısalt) — QR'ın otomatik yenilendiğini ve eski linkin artık
   "QR süresi doldu" hatası verdiğini doğrula.

### 5) Projeksiyonda göster

Toplantıda `goster.html` sayfasını aç (`https://yousiframazanoglu.github.io/baru-yazilim-yoklama/goster.html`),
büyük QR kodunu projektöre yansıt. Öğrenciler telefonla okutup formu doldurur.

## Kaptan paneli

`panel.html`'i kendi telefonundan/laptopundan aç
(`https://yousiframazanoglu.github.io/baru-yazilim-yoklama/panel.html`), `ADMIN_CODE`'u gir.
Ders boyunca 5 saniyede bir kendini yeniler ve gösterir:

- **Geldi / Gelmedi**: roster'daki (`Yoklama!A7:B86`) herkesin bu oturumda yoklama
  verip vermediği, canlı — dersin ortasında kimin hâlâ okutmadığını görürsün.
- **Listede olmayan girişler**: roster'da eşleşmeyen bir öğrenci no ile gelen
  kayıtlar (yazım hatası ya da yanlış no girmiş olabilir) ayrı gösterilir.
- **Elle ekle**: telefonu olmayan/QR okutamayan bir öğrenciyi, token veya konum
  kontrolüne takılmadan, kaptan yetkisiyle doğrudan ekler (`Form Yanıtları 1`'e
  "ELLE" notuyla düşer).
- Panelin linki öğrencilerle paylaşılmaz; `ADMIN_CODE` bunun tek korumasıdır,
  gerçek bir giriş sistemi değildir — kimseyle paylaşma.

## Sahte yoklama koruması (linki arkadaşa atma sorunu)

`goster.html` her açıldığında (ve her ~20 dakikada bir, kendiliğinden) yeni bir
tek kullanımlık "oturum" başlatır:

- QR'ın içindeki link bir token taşır (`?t=...`). O token'ın süresi dolunca
  (`apps-script/Code.gs`'teki `TOKEN_TTL_MS`, varsayılan 20 dk) aynı linkle
  gönderilen kayıtlar reddedilir — yani biri linki ya da QR'ın fotoğrafını
  arkadaşına atsa bile, ders bitip süre dolduktan sonra işe yaramaz.
- `goster.html` açıldığı yerin konumunu (tarayıcı izin verirse) alıp oturuma
  kaydeder. Öğrenci formu doldururken kendi konumunu da gönderir; ikisi
  arası `MAX_DISTANCE_M`'den (varsayılan 200 m) uzaksa kayıt reddedilir —
  yani biri evden/uzaktan dolduramaz. Projeksiyon ekranı konum izni
  vermezse bu kontrol o oturum için otomatik kapanır, sistem çalışmaya
  devam eder (sadece konum koruması olmadan).
- Bu %100 kusursuz değildir (biri konumunu sahte GPS ile değiştirebilir, ya
  da 20 dakika bitmeden fotoğrafı atıp arkadaşı hemen doldurursa yine geçer)
  ama "linki akşam eve gidince arkadaşına at, o da evden doldursun" gibi en
  yaygın hileyi engeller.
- Projeksiyon ekranının (bilgisayar/tabletin) konum iznini açık tutman,
  korumanın çalışması için önemli — tarayıcıda site ayarlarından "Konum: İzin ver"
  yapman yeterli.
- **"Yakınımdayım ama uzak diyor" sorunu**: GPS'siz bir laptop/masaüstünde
  `goster.html` açıksa, tarayıcı konumu Wi-Fi/IP üzerinden tahmin eder ve bu
  bazen birkaç km yanılabilir. Sistem artık bunu `accuracy` değerine bakarak
  kendi kendine tolere ediyor: tahmin çok kabaysa (`MAX_ACCURACY_M`, varsayılan
  2000m) o oturum için konum kontrolü otomatik kapanır. `goster.html`'in
  altındaki "✓/✗ Konum kontrolü" satırında (± kaç metre) yazdığını görebilirsin.
  Hâlâ sorun yaşıyorsan en güvenilir yol: `goster.html`'i bir telefon/tabletten
  (GPS'li bir cihazdan) açmak.
- Öğrenciye gösterilen hata mesajları (`QR süresi doldu`, `Sınıfın yakınında
  görünmüyorsun` vb.) doğrudan bu kontrollerden gelir.

## Notlar

- Oturum (hafta içi/hafta sonu) ve hafta numarası hesaplaması tamamen `Ayarlar`/`Yoklama`
  sayfalarındaki formüllerde — bu depo sadece ham kayıtları (zaman damgası, no, isim,
  mesafe) yazar.
- Apps Script URL'si herkese açıktır ama sadece bu alanları kabul eder ve tabloya
  satır ekler veya geçerli bir oturum bildirir; tabloyu okuyamaz veya başka bir
  şey değiştiremez.
- `config.js`'teki URL'yi değiştirirsen GitHub Pages birkaç dakika içinde günceller.
- **Önemli:** `Yoklama` sayfasının A/B sütunlarına (satır 7'den itibaren) gerçek
  öğrenci numaralarını ve isimlerini girmeden sistem "bağlı" görünür ama hiçbir
  öğrenciyi eşleştiremez — gelen her kayıt `Ayarlar!B6`'daki "listede olmayan giriş"
  sayacına düşer. Örnek satırı (`2601010001 — Ahmet Yılmaz`) gerçek listenle değiştir.
