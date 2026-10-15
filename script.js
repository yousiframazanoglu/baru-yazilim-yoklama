(() => {
  const form = document.getElementById("form");
  const studentNoInput = document.getElementById("studentNo");
  const fullNameInput = document.getElementById("fullName");
  const submitBtn = document.getElementById("submitBtn");
  const output = document.getElementById("output");
  const statusDot = document.getElementById("statusDot");
  const geoNote = document.getElementById("geoNote");

  const ENDPOINT = window.YOKLAMA_ENDPOINT || "";
  const TOKEN = new URLSearchParams(window.location.search).get("t") || "";

  let geo = { lat: null, lng: null, accuracy: null };

  function setStatus(state) {
    statusDot.classList.remove("is-busy", "is-error");
    if (state === "busy") statusDot.classList.add("is-busy");
    if (state === "error") statusDot.classList.add("is-error");
  }

  function clearOutput() {
    output.innerHTML = "";
  }

  // Terminal tarzı "yazarak" çıktı basar; prefers-reduced-motion'da anında yazar.
  function printLines(lines, { done } = {}) {
    clearOutput();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      output.textContent = lines.map((l) => l.text).join("\n");
      if (done) done();
      return;
    }

    let lineIndex = 0;
    let charIndex = 0;

    function typeNext() {
      if (lineIndex >= lines.length) {
        const cursor = document.createElement("span");
        cursor.className = "cursor";
        output.appendChild(cursor);
        if (done) done();
        return;
      }

      const current = lines[lineIndex];
      if (charIndex === 0) {
        const span = document.createElement("span");
        span.className = current.cls || "";
        span.dataset.lineIndex = String(lineIndex);
        output.appendChild(span);
        if (!current.inline) output.appendChild(document.createElement("br"));
      }

      const span = output.querySelector(`span[data-line-index="${lineIndex}"]`);
      charIndex += 1;
      span.textContent = current.text.slice(0, charIndex);

      if (charIndex >= current.text.length) {
        lineIndex += 1;
        charIndex = 0;
        setTimeout(typeNext, 60);
      } else {
        setTimeout(typeNext, 10);
      }
    }

    typeNext();
  }

  function studentNoValid(v) {
    return /^[0-9]{4,20}$/.test(v.trim());
  }

  function fullNameValid(v) {
    return v.trim().length >= 3;
  }

  // Sayfa açılır açılmaz konum izni iste; öğrenci reddederse formu yine de
  // dener, sunucu konum zorunluysa kendi mesajıyla reddeder.
  function requestGeo() {
    if (!navigator.geolocation) {
      geoNote.textContent = "";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geo.lat = pos.coords.latitude;
        geo.lng = pos.coords.longitude;
        geo.accuracy = pos.coords.accuracy;
      },
      () => {
        geoNote.textContent = "Konum paylaşılmadı — sınıf konum kontrolü açıksa gönderim reddedilebilir.";
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
  requestGeo();

  if (!TOKEN) {
    printLines([
      { text: "✗ Bu sayfa QR kodu olmadan açılamaz.", cls: "err" },
      { text: "  Projeksiyondaki güncel QR'ı okut.", cls: "sub" },
    ]);
    submitBtn.disabled = true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const studentNo = studentNoInput.value.trim();
    const fullName = fullNameInput.value.trim();

    if (!studentNoValid(studentNo)) {
      printLines([
        { text: "✗ Hata: Öğrenci No sadece rakamlardan oluşmalı.", cls: "err" },
      ]);
      studentNoInput.focus();
      return;
    }
    if (!fullNameValid(fullName)) {
      printLines([
        { text: "✗ Hata: Ad Soyad çok kısa.", cls: "err" },
      ]);
      fullNameInput.focus();
      return;
    }

    if (!ENDPOINT || ENDPOINT.indexOf("REPLACE_WITH") === 0) {
      printLines([
        { text: "✗ Hata: Sistem henüz bağlanmadı.", cls: "err" },
        { text: "  Yazılım birimine bildir: config.js ayarlanmamış.", cls: "sub" },
      ]);
      return;
    }

    submitBtn.disabled = true;
    setStatus("busy");
    printLines([{ text: "Gönderiliyor…", cls: "sub" }]);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          studentNo,
          fullName,
          token: TOKEN,
          lat: geo.lat,
          lng: geo.lng,
          accuracy: geo.accuracy,
        }),
      });

      let result = null;
      try {
        result = JSON.parse(await res.text());
      } catch (parseErr) {
        result = null;
      }

      if (result && result.ok) {
        setStatus("idle");
        printLines(
          [
            { text: `✓ Kayıt alındı — ${fullName} (${studentNo})`, cls: "ok" },
            { text: "  Yoklamaya katıldın. Derse hoş geldin.", cls: "sub" },
          ],
          {
            done: () => {
              submitBtn.disabled = false;
              form.reset();
              studentNoInput.focus();
            },
          }
        );
      } else if (result && result.error) {
        setStatus("error");
        printLines([
          { text: `✗ ${result.error}`, cls: "err" },
        ]);
        submitBtn.disabled = false;
      } else {
        // Sunucudan okunabilir bir yanıt gelmedi (CORS/ağ nedeniyle olabilir) —
        // istek muhtemelen ulaştı ama onay doğrulanamadı.
        setStatus("idle");
        printLines([
          { text: `✓ Gönderildi — ${fullName} (${studentNo})`, cls: "ok" },
          { text: "  Sunucudan onay alınamadı; emin değilsen hocana sor.", cls: "sub" },
        ]);
        submitBtn.disabled = false;
      }
    } catch (err) {
      setStatus("error");
      printLines([
        { text: "✗ Gönderilemedi. İnternet bağlantını kontrol et.", cls: "err" },
      ]);
      submitBtn.disabled = false;
    }
  });
})();
