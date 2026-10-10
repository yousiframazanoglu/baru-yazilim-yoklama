# BARÜ Yazılım Birimi — Yoklama

Telefonla QR okutup Öğrenci No + Ad Soyad girilen, terminal temalı bir yoklama ekranı.
Girişler doğrudan Google E-Tablolar'a yazılır; tablodaki haftalık/oturum hesaplaması
(`Yoklama` ve `Ayarlar` sayfaları) değişmeden çalışmaya devam eder.

Sayfalar:
- `index.html` — öğrencinin doldurduğu form (QR'ın açtığı sayfa)
- `goster.html` — projeksiyonda gösterilecek büyük QR kodu
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

1. Siteyi aç, test amaçlı bir öğrenci no + isim gir, gönder.
2. Google E-Tablolar'da **Form Yanıtları 1** sayfasına satırın düştüğünü doğrula.
3. `Ayarlar!B5` hücresinde "✓ Bağlı" yazdığını kontrol et.
4. Test satırını sil.

### 5) Projeksiyonda göster

Toplantıda `goster.html` sayfasını aç (`https://yousiframazanoglu.github.io/baru-yazilim-yoklama/goster.html`),
büyük QR kodunu projektöre yansıt. Öğrenciler telefonla okutup formu doldurur.

## Notlar

- Oturum (hafta içi/hafta sonu) ve hafta numarası hesaplaması tamamen `Ayarlar`/`Yoklama`
  sayfalarındaki formüllerde — bu depo sadece ham kayıtları (zaman damgası, no, isim) yazar.
- Apps Script URL'si herkese açıktır ama sadece bu iki alanı (`studentNo`, `fullName`) kabul
  eder ve tabloya satır ekler; tabloyu okuyamaz veya başka bir şey değiştiremez.
- `config.js`'teki URL'yi değiştirirsen GitHub Pages birkaç dakika içinde günceller.
