(() => {
  const form = document.getElementById("form");
  const studentNoInput = document.getElementById("studentNo");
  const fullNameInput = document.getElementById("fullName");
  const submitBtn = document.getElementById("submitBtn");
  const output = document.getElementById("output");
  const statusDot = document.getElementById("statusDot");

  const ENDPOINT = window.YOKLAMA_ENDPOINT || "";

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
      await fetch(ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ studentNo, fullName }),
      });

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
    } catch (err) {
      setStatus("error");
      printLines([
        { text: "✗ Gönderilemedi. İnternet bağlantını kontrol et.", cls: "err" },
      ]);
      submitBtn.disabled = false;
    }
  });
})();
