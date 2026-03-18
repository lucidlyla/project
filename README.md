# 기획 진행 현황 시스템

편집부 전용 기획 파이프라인 관리 사이트

## 구조

```
index.html      → 메인 사이트 (GitHub Pages 배포)
setup.html      → 초기 비밀번호 설정 (1회만 사용)
apps-script.js  → Google Apps Script 코드 (시트에 붙여넣기)
```

## 설정 순서

### 1단계: Google Sheets 준비

1. [Google Sheets](https://sheets.google.com) 새 스프레드시트 생성
2. 확장 프로그램 → Apps Script 클릭
3. `apps-script.js` 내용 전체 복사 → 붙여넣기
4. 상단 함수 선택 → `setupSheets` 선택 → ▶ 실행 (시트 구조 자동 생성)
5. 배포 → 새 배포 → 유형: 웹 앱
   - 실행 주체: **나**
   - 액세스 권한: **모든 사용자**
6. 배포된 URL 복사

### 2단계: 사이트 설정

1. `index.html`의 `CONFIG.APPS_SCRIPT_URL`에 URL 붙여넣기
2. GitHub에 push
3. GitHub → Settings → Pages → Source: main branch

### 3단계: 초기 비밀번호

1. `setup.html` 열기 (로컬에서 직접 열어도 됨)
2. Apps Script URL 입력
3. 관리자/편집자 비밀번호 각각 설정
4. **이 페이지는 1회만 사용** (이후 비밀번호 변경은 관리자 설정에서)

### 4단계: 기존 데이터 마이그레이션

기존 사이트(goodwork-todo.pages.dev)의 데이터를 옮기려면:
1. 기존 사이트의 Google Sheets에서 기획 데이터 복사
2. 새 시트의 Projects 탭에 같은 형식으로 붙여넣기

## 권한 구조

| 역할 | 기획 추가/삭제 | 저자 변경 | 단계 변경 | 제목 변경 | 설정 |
|------|:-:|:-:|:-:|:-:|:-:|
| 관리자 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 편집자 | ✕ | ✕ | 본인 담당만 | 본인 담당만 | ✕ |

## 보안

- 비밀번호: SHA-256 해시 저장 (원문 저장 안 함)
- 세션: 브라우저 탭 닫으면 자동 로그아웃
- API: 해시 토큰으로 인증
- 편집자: 관리자가 등록한 이름만 로그인 가능
- Google Sheets: 시트 공유 설정으로 이중 보호

## 백업

- Google Sheets 자체가 백업 (버전 기록 자동 보관)
- localStorage에도 로컬 캐시 저장
- 시트에서 직접 데이터 확인/수정 가능
