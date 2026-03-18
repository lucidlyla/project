/**
 * Google Apps Script - 전사 기획 현황 관리 시스템 연동
 *
 * 사용법:
 * 1. Google Sheets에서 [확장 프로그램] > [Apps Script] 열기
 * 2. 이 코드를 붙여넣기
 * 3. 웹 앱으로 배포 (누구나 접근 가능하도록 설정)
 * 4. 배포 URL을 index.html의 APPS_SCRIPT_URL에 입력
 */

const SHEET_NAME = '기획현황';
const EDITORS_SHEET = '편집자목록';

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getAll':
        result = getAllProjects();
        break;
      case 'getEditors':
        result = getEditors();
        break;
      default:
        result = { error: 'Unknown action' };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  try {
    switch (action) {
      case 'addProject':
        result = addProject(data.project);
        break;
      case 'updateProject':
        result = updateProject(data.id, data.updates);
        break;
      case 'deleteProject':
        result = deleteProject(data.id);
        break;
      case 'addEditor':
        result = addEditor(data.editor);
        break;
      case 'removeEditor':
        result = removeEditor(data.editor);
        break;
      case 'syncAll':
        result = syncAll(data.projects, data.editors);
        break;
      default:
        result = { error: 'Unknown action' };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_NAME) {
      sheet.getRange(1, 1, 1, 9).setValues([['ID', '제목', '저자', '편집자', '단계', '장르', '메모', '생성일', '수정일']]);
    } else if (name === EDITORS_SHEET) {
      sheet.getRange(1, 1, 1, 2).setValues([['이름', '등록일']]);
    }
  }
  return sheet;
}

function getAllProjects() {
  const sheet = getOrCreateSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { projects: [] };

  const projects = data.slice(1).map(row => ({
    id: row[0],
    title: row[1],
    author: row[2],
    editor: row[3],
    stage: row[4],
    genre: row[5],
    memo: row[6],
    createdAt: row[7],
    updatedAt: row[8]
  }));

  return { projects };
}

function getEditors() {
  const sheet = getOrCreateSheet(EDITORS_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { editors: [] };

  return { editors: data.slice(1).map(row => row[0]) };
}

function addProject(project) {
  const sheet = getOrCreateSheet(SHEET_NAME);
  const now = new Date().toISOString();
  sheet.appendRow([
    project.id,
    project.title,
    project.author,
    project.editor,
    project.stage,
    project.genre || '',
    project.memo || '',
    now,
    now
  ]);
  return { success: true };
}

function updateProject(id, updates) {
  const sheet = getOrCreateSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (updates.title !== undefined) sheet.getRange(i + 1, 2).setValue(updates.title);
      if (updates.author !== undefined) sheet.getRange(i + 1, 3).setValue(updates.author);
      if (updates.editor !== undefined) sheet.getRange(i + 1, 4).setValue(updates.editor);
      if (updates.stage !== undefined) sheet.getRange(i + 1, 5).setValue(updates.stage);
      if (updates.genre !== undefined) sheet.getRange(i + 1, 6).setValue(updates.genre);
      if (updates.memo !== undefined) sheet.getRange(i + 1, 7).setValue(updates.memo);
      sheet.getRange(i + 1, 9).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { error: 'Project not found' };
}

function deleteProject(id) {
  const sheet = getOrCreateSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Project not found' };
}

function addEditor(editor) {
  const sheet = getOrCreateSheet(EDITORS_SHEET);
  sheet.appendRow([editor, new Date().toISOString()]);
  return { success: true };
}

function removeEditor(editor) {
  const sheet = getOrCreateSheet(EDITORS_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === editor) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Editor not found' };
}

function syncAll(projects, editors) {
  const projSheet = getOrCreateSheet(SHEET_NAME);
  const edSheet = getOrCreateSheet(EDITORS_SHEET);

  projSheet.clear();
  projSheet.getRange(1, 1, 1, 9).setValues([['ID', '제목', '저자', '편집자', '단계', '장르', '메모', '생성일', '수정일']]);
  if (projects && projects.length > 0) {
    const rows = projects.map(p => [p.id, p.title, p.author, p.editor, p.stage, p.genre || '', p.memo || '', p.createdAt, p.updatedAt]);
    projSheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }

  edSheet.clear();
  edSheet.getRange(1, 1, 1, 2).setValues([['이름', '등록일']]);
  if (editors && editors.length > 0) {
    const rows = editors.map(e => [e, new Date().toISOString()]);
    edSheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return { success: true };
}
