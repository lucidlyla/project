/* ═══════════════════════════════════════════════════════════
   Google Apps Script - 기획 진행 현황 시스템

   [설정 방법]
   1. Google Sheets에서 새 스프레드시트 생성
   2. 시트 이름을 "Projects", "Settings", "Users" 로 설정
   3. 확장 프로그램 > Apps Script 클릭
   4. 이 코드를 붙여넣기
   5. 배포 > 새 배포 > 웹 앱 선택
      - 실행 주체: 나
      - 액세스 권한: 모든 사용자
   6. 배포된 URL을 index.html의 CONFIG.APPS_SCRIPT_URL에 입력
   ═══════════════════════════════════════════════════════════ */

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token || "";

  let result;
  switch(action) {
    case "readAll":
      result = readAll(token);
      break;
    case "readSettings":
      result = readSettings();
      break;
    default:
      result = { success: false, error: "Unknown action" };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: "Invalid JSON" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = body.action;
  const token = body.token || "";
  let result;

  switch(action) {
    case "writeProjects":
      result = writeProjects(body.data, token);
      break;
    case "writeSettings":
      result = writeSettings(body.data, token);
      break;
    case "initPasswords":
      result = initPasswords(body.data);
      break;
    default:
      result = { success: false, error: "Unknown action" };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ─── Auth Check ─── */
function isAuthorized(token) {
  const sheet = SS.getSheetByName("Settings");
  if(!sheet) return false;
  const data = sheet.getDataRange().getValues();
  // Settings 시트: A1=adminPwHash, B1=editorPwHash
  if(data.length < 1) return true; // 초기 설정 전
  const adminHash = data[0][0] || "";
  const editorHash = data[0][1] || "";
  return token === adminHash || token === editorHash;
}

function isAdmin(token) {
  const sheet = SS.getSheetByName("Settings");
  if(!sheet) return false;
  const data = sheet.getDataRange().getValues();
  if(data.length < 1) return true;
  return token === (data[0][0] || "");
}

/* ─── Read All ─── */
function readAll(token) {
  if(!isAuthorized(token)) return { success: false, error: "Unauthorized" };

  // Projects
  const projSheet = SS.getSheetByName("Projects");
  let projects = [];
  if(projSheet && projSheet.getLastRow() > 1) {
    const data = projSheet.getDataRange().getValues();
    const headers = data[0];
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      const stages = {};
      for(let j = 2; j < headers.length; j++) {
        stages[headers[j]] = row[j] ? formatDateValue(row[j]) : "";
      }
      projects.push({
        id: row[0],
        title: row[1] || "",
        author: row[2] || "",
        stages: stages
      });
    }
    // 헤더 보정: id, title, author 다음이 stages
    // 실제로는 id, title, author, 아이디어, 기획제안, ...
    projects = [];
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      const stages = {};
      // headers[0]=id, [1]=title, [2]=author, [3~]=stages
      for(let j = 3; j < headers.length; j++) {
        stages[headers[j]] = row[j] ? formatDateValue(row[j]) : "";
      }
      projects.push({
        id: Number(row[0]),
        title: row[1] || "",
        author: row[2] || "",
        stages: stages
      });
    }
  }

  // Users
  const userSheet = SS.getSheetByName("Users");
  let users = [];
  if(userSheet && userSheet.getLastRow() > 1) {
    const data = userSheet.getDataRange().getValues();
    for(let i = 1; i < data.length; i++) {
      users.push({ name: data[i][0], role: data[i][1] || "editor" });
    }
  }

  // Settings
  const settingsSheet = SS.getSheetByName("Settings");
  let settings = { adminPwHash: "", editorPwHash: "" };
  if(settingsSheet && settingsSheet.getLastRow() >= 1) {
    const data = settingsSheet.getDataRange().getValues();
    settings.adminPwHash = data[0][0] || "";
    settings.editorPwHash = data[0][1] || "";
  }

  return { success: true, data: { projects, users, settings } };
}

/* ─── Read Settings (no auth needed for login) ─── */
function readSettings() {
  const settingsSheet = SS.getSheetByName("Settings");
  let settings = { adminPwHash: "", editorPwHash: "", users: [] };

  if(settingsSheet && settingsSheet.getLastRow() >= 1) {
    const data = settingsSheet.getDataRange().getValues();
    settings.adminPwHash = data[0][0] || "";
    settings.editorPwHash = data[0][1] || "";
  }

  const userSheet = SS.getSheetByName("Users");
  if(userSheet && userSheet.getLastRow() > 1) {
    const data = userSheet.getDataRange().getValues();
    for(let i = 1; i < data.length; i++) {
      settings.users.push({ name: data[i][0], role: data[i][1] || "editor" });
    }
  }

  return { success: true, data: settings };
}

/* ─── Write Projects ─── */
function writeProjects(projects, token) {
  if(!isAuthorized(token)) return { success: false, error: "Unauthorized" };

  const sheet = SS.getSheetByName("Projects") || SS.insertSheet("Projects");
  const stages = [
    "아이디어","기획 제안","샘플원고 작성","계약서 초안검토",
    "계약 완료","집필 시작","초고","탈고","출간 완료"
  ];
  const headers = ["id","title","author",...stages];

  // Clear and rewrite
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if(projects && projects.length > 0) {
    const rows = projects.map(p => [
      p.id,
      p.title,
      p.author,
      ...stages.map(s => (p.stages && p.stages[s]) || "")
    ]);
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return { success: true };
}

/* ─── Write Settings ─── */
function writeSettings(data, token) {
  if(!isAdmin(token)) return { success: false, error: "Admin only" };

  // Settings
  const settingsSheet = SS.getSheetByName("Settings") || SS.insertSheet("Settings");
  settingsSheet.clear();
  settingsSheet.getRange(1, 1, 1, 2).setValues([[
    data.settings.adminPwHash || "",
    data.settings.editorPwHash || ""
  ]]);

  // Users
  const userSheet = SS.getSheetByName("Users") || SS.insertSheet("Users");
  userSheet.clear();
  userSheet.getRange(1, 1, 1, 2).setValues([["name","role"]]);
  if(data.users && data.users.length > 0) {
    const rows = data.users.map(u => [u.name, u.role || "editor"]);
    userSheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return { success: true };
}

/* ─── Init Passwords (최초 1회) ─── */
function initPasswords(data) {
  const settingsSheet = SS.getSheetByName("Settings") || SS.insertSheet("Settings");
  const existing = settingsSheet.getDataRange().getValues();
  if(existing.length > 0 && existing[0][0]) {
    return { success: false, error: "Already initialized" };
  }
  settingsSheet.getRange(1, 1, 1, 2).setValues([[
    data.adminPwHash || "",
    data.editorPwHash || ""
  ]]);
  return { success: true };
}

/* ─── Utility ─── */
function formatDateValue(val) {
  if(val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth()+1).padStart(2,'0');
    const d = String(val.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

/* ─── 초기 시트 구조 생성 (한 번만 실행) ─── */
function setupSheets() {
  if(!SS.getSheetByName("Projects")) {
    const s = SS.insertSheet("Projects");
    s.getRange(1,1,1,12).setValues([[
      "id","title","author",
      "아이디어","기획 제안","샘플원고 작성","계약서 초안검토",
      "계약 완료","집필 시작","초고","탈고","출간 완료"
    ]]);
  }
  if(!SS.getSheetByName("Settings")) {
    SS.insertSheet("Settings");
  }
  if(!SS.getSheetByName("Users")) {
    const s = SS.insertSheet("Users");
    s.getRange(1,1,1,2).setValues([["name","role"]]);
  }
}
