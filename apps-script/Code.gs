/**
 * BARÜ Yazılım Birimi — Yoklama arka ucu.
 *
 * Bu dosyayı Google E-Tablolar'daki "Uzantılar > Apps Script" menüsünden
 * açılan editöre YAPIŞTIR, sonra "Dağıt > Yeni dağıtım > Web uygulaması"
 * ile yayınla (ayrıntılı adımlar README.md'de).
 *
 * Statik site (GitHub Pages) buraya POST isteği atar; bu script de
 * Google E-Tablolar'daki "Form Yanıtları 1" sayfasına satır ekler —
 * mevcut Yoklama/Ayarlar formülleri bu sayfayı zaten okuyor, başka
 * hiçbir şeyi değiştirmene gerek yok.
 */

// Yoklama E-Tablosu'nun ID'si (dosyanın URL'sindeki /d/ ile /edit arasındaki kısım).
var SPREADSHEET_ID = "18wNqN0jXftRfkh99oOo6-9SgCw_l26DgvSMB4NCRvWo";
var SHEET_NAME = "Form Yanıtları 1";

function doPost(e) {
  try {
    var body = parseBody(e);
    var studentNo = String(body.studentNo || "").trim();
    var fullName = String(body.fullName || "").trim();

    if (!studentNo || !fullName) {
      return jsonOutput({ ok: false, error: "studentNo ve fullName gerekli" });
    }

    var sheet = getOrCreateResponseSheet();
    sheet.appendRow([new Date(), studentNo, fullName]);

    return jsonOutput({ ok: true });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function doGet() {
  // Tarayıcıdan URL'yi direkt açınca basit bir durum mesajı dönsün.
  return ContentService
    .createTextOutput("BARÜ Yazılım Birimi yoklama servisi çalışıyor. Bu uç nokta sadece POST kabul eder.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  if (e && e.parameter) {
    return e.parameter;
  }
  return {};
}

function getOrCreateResponseSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Zaman damgası", "Öğrenci No", "Ad Soyad"]);
  }
  return sheet;
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
