/**
 * BARÜ Yazılım Birimi — Yoklama arka ucu.
 *
 * Bu dosyayı Google E-Tablolar'daki "Uzantılar > Apps Script" menüsünden
 * açılan editöre YAPIŞTIR, sonra "Dağıt > Yeni dağıtım > Web uygulaması"
 * ile yayınla (ayrıntılı adımlar README.md'de).
 *
 * Statik site (GitHub Pages) buraya POST isteği atar; bu script de
 * Google E-Tablolar'daki "Form Yanıtları 1" sayfasına satır ekler —
 * mevcut Yoklama/Ayarlar formülleri bu sayfayı zaten okuyor.
 *
 * SAHTE YOKLAMA KORUMASI:
 * - goster.html (projeksiyon ekranı) her oturumda rastgele bir "token"
 *   üretip bu script'e bildirir ve süresi TOKEN_TTL_MS sonra dolar.
 *   Öğrenci formu bu token'ı QR linkinden alıp gönderime ekler; süresi
 *   dolmuş ya da eski bir token kabul edilmez. Böylece biri linki/QR'ı
 *   fotoğraflayıp arkadaşına atsa bile, oturum kapandıktan sonra işe
 *   yaramaz.
 * - goster.html ekranın açıldığı konumu (varsa, tarayıcı izin verirse)
 *   alıp oturuma kaydeder. Öğrenci gönderirken kendi konumunu da
 *   gönderir; ikisi arasındaki mesafe MAX_DISTANCE_M'den büyükse kayıt
 *   reddedilir — yani biri evden/uzaktan dolduramaz. Projeksiyon
 *   ekranı konum izni vermezse bu kontrol o oturum için otomatik
 *   devre dışı kalır (hata vermez, sadece korumasız olur).
 */

var SPREADSHEET_ID = "18wNqN0jXftRfkh99oOo6-9SgCw_l26DgvSMB4NCRvWo";
var SHEET_NAME = "Form Yanıtları 1";
var ROSTER_SHEET_NAME = "Yoklama";
var ROSTER_FIRST_ROW = 7;
var ROSTER_LAST_ROW = 86;

var TOKEN_TTL_MS = 20 * 60 * 1000;   // bir QR en fazla 20 dakika geçerli
var MAX_DISTANCE_M = 200;            // öğrenci, ekrandan en fazla bu kadar metre uzakta olabilir

// Kaptan paneline (panel.html) girmek için basit bir şifre. Bunu kendi
// seçtiğin bir kelimeyle değiştir — bu, öğrencilerin paneli bulup elle
// yoklama eklemesini engellemek için, gerçek bir güvenlik katmanı değil.
var ADMIN_CODE = "CHANGE_ME";

function doPost(e) {
  try {
    var body = parseBody(e);

    if (body.action === "startSession") {
      return handleStartSession(body);
    }
    if (body.action === "manualAdd") {
      return handleManualAdd(body);
    }

    return handleAttendance(body);
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;

  if (action === "panelData") {
    return handlePanelData(e.parameter);
  }

  return ContentService
    .createTextOutput("BARÜ Yazılım Birimi yoklama servisi çalışıyor. Bu uç nokta sadece POST kabul eder.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// goster.html'den gelen "yeni oturum başlat" bildirimi. Token'ı goster.html
// kendisi üretip burada sadece onaylatıyor; biz onu + süresini + (varsa)
// konumunu ScriptProperties'e kaydediyoruz.
function handleStartSession(body) {
  var token = String(body.token || "").trim();
  var expiresAt = Number(body.expiresAt || 0);
  if (!token || !expiresAt) {
    return jsonOutput({ ok: false, error: "token ve expiresAt gerekli" });
  }

  var lat = body.lat !== undefined && body.lat !== null && body.lat !== "" ? Number(body.lat) : null;
  var lng = body.lng !== undefined && body.lng !== null && body.lng !== "" ? Number(body.lng) : null;

  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    SESSION_TOKEN: token,
    SESSION_EXPIRES: String(expiresAt),
    SESSION_LAT: lat === null || isNaN(lat) ? "" : String(lat),
    SESSION_LNG: lng === null || isNaN(lng) ? "" : String(lng)
  });

  return jsonOutput({ ok: true });
}

function handleAttendance(body) {
  var studentNo = String(body.studentNo || "").trim();
  var fullName = String(body.fullName || "").trim();
  var token = String(body.token || "").trim();
  var lat = body.lat !== undefined && body.lat !== null && body.lat !== "" ? Number(body.lat) : null;
  var lng = body.lng !== undefined && body.lng !== null && body.lng !== "" ? Number(body.lng) : null;

  if (!studentNo || !fullName) {
    return jsonOutput({ ok: false, error: "studentNo ve fullName gerekli" });
  }

  var session = getActiveSession();
  if (!session) {
    return jsonOutput({ ok: false, error: "Aktif oturum yok. Hocandan güncel QR'ı iste." });
  }
  if (token !== session.token) {
    return jsonOutput({ ok: false, error: "Bu QR artık geçerli değil. Güncel QR'ı okut." });
  }
  if (Date.now() > session.expiresAt) {
    return jsonOutput({ ok: false, error: "QR süresi doldu. Hocandan yeni QR'ı iste." });
  }

  var distanceNote = "";
  if (session.lat !== null && session.lng !== null) {
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      return jsonOutput({ ok: false, error: "Konum izni gerekli. Tarayıcıda konuma izin verip tekrar dene." });
    }
    var dist = distanceMeters(lat, lng, session.lat, session.lng);
    if (dist > MAX_DISTANCE_M) {
      return jsonOutput({ ok: false, error: "Sınıfın yakınında görünmüyorsun. Yoklama sadece dersteyken alınır." });
    }
    distanceNote = String(Math.round(dist));
  }

  var sheet = getOrCreateResponseSheet();
  sheet.appendRow([new Date(), studentNo, fullName, distanceNote]);

  return jsonOutput({ ok: true });
}

// Kaptan paneli kaydı: token/konum kontrolü atlanır ama ADMIN_CODE doğru
// olmalı. "ELLE" notuyla kaydedilir, ki Form Yanıtları 1'de ayırt edilsin.
function handleManualAdd(body) {
  if (String(body.code || "") !== ADMIN_CODE) {
    return jsonOutput({ ok: false, error: "Kod yanlış." });
  }

  var studentNo = String(body.studentNo || "").trim();
  var fullName = String(body.fullName || "").trim();
  if (!studentNo || !fullName) {
    return jsonOutput({ ok: false, error: "studentNo ve fullName gerekli" });
  }

  var sheet = getOrCreateResponseSheet();
  sheet.appendRow([new Date(), studentNo, fullName, "ELLE"]);

  return jsonOutput({ ok: true });
}

// Kaptan paneli (panel.html) için: aktif oturumun durumu, bu oturumda
// gelenler ve roster'daki gelmeyenler.
function handlePanelData(params) {
  if (String((params && params.code) || "") !== ADMIN_CODE) {
    return jsonOutput({ ok: false, error: "Kod yanlış." });
  }

  var session = getActiveSession();
  var sessionInfo = null;
  var sessionStart = 0;

  if (session) {
    sessionStart = session.expiresAt - TOKEN_TTL_MS;
    sessionInfo = {
      active: Date.now() <= session.expiresAt,
      expiresAt: session.expiresAt,
      geoEnabled: session.lat !== null && session.lng !== null
    };
  }

  var roster = getRoster();
  var checkedIn = getCheckedInSince(sessionStart);

  var checkedInNos = {};
  checkedIn.forEach(function (row) {
    checkedInNos[row.studentNo] = row;
  });

  var present = [];
  var absent = [];
  roster.forEach(function (student) {
    if (checkedInNos[student.studentNo]) {
      present.push({
        studentNo: student.studentNo,
        fullName: student.fullName,
        timestamp: checkedInNos[student.studentNo].timestamp,
        distance: checkedInNos[student.studentNo].distance
      });
    } else {
      absent.push(student);
    }
  });

  // Rosterda olmayan ama bu oturumda kayıt atmış (eşleşmeyen no) girişler.
  var unmatched = checkedIn.filter(function (row) {
    return !roster.some(function (s) { return s.studentNo === row.studentNo; });
  });

  return jsonOutput({
    ok: true,
    session: sessionInfo,
    present: present,
    absent: absent,
    unmatched: unmatched,
    rosterCount: roster.length
  });
}

function getRoster() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(ROSTER_SHEET_NAME);
  if (!sheet) return [];

  var numRows = ROSTER_LAST_ROW - ROSTER_FIRST_ROW + 1;
  var values = sheet.getRange(ROSTER_FIRST_ROW, 1, numRows, 2).getValues();

  var roster = [];
  values.forEach(function (row) {
    var studentNo = String(row[0] || "").trim();
    var fullName = String(row[1] || "").trim();
    if (studentNo) roster.push({ studentNo: studentNo, fullName: fullName });
  });
  return roster;
}

function getCheckedInSince(sinceMs) {
  var sheet = getOrCreateResponseSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var result = [];
  values.forEach(function (row) {
    var ts = row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime();
    if (isNaN(ts) || ts < sinceMs) return;
    result.push({
      timestamp: ts,
      studentNo: String(row[1] || "").trim(),
      fullName: String(row[2] || "").trim(),
      distance: String(row[3] || "")
    });
  });
  return result;
}

function getActiveSession() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("SESSION_TOKEN");
  var expiresAt = Number(props.getProperty("SESSION_EXPIRES") || 0);
  if (!token || !expiresAt) return null;

  var latStr = props.getProperty("SESSION_LAT");
  var lngStr = props.getProperty("SESSION_LNG");

  return {
    token: token,
    expiresAt: expiresAt,
    lat: latStr ? Number(latStr) : null,
    lng: lngStr ? Number(lngStr) : null
  };
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  var R = 6371000;
  var toRad = function (d) { return (d * Math.PI) / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    sheet.appendRow(["Zaman damgası", "Öğrenci No", "Ad Soyad", "Mesafe (m)"]);
  }
  return sheet;
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
