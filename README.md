# PIXEL EDIT STUDIO

React + TypeScript + Vite + Canvas API + localStorage로 만든 브라우저 이미지 편집기.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/` 접속.

## 포함 기능

- PNG/JPEG 업로드 및 MIME/확장자 검증
- 잘못된 업로드 시 기존 편집 상태 유지
- 텍스트 입력, 크기, 색상, 줄간격, 투명도, 정렬
- Canvas에서 텍스트/스티커 드래그
- 1:1 / 4:5 / 9:16
- PNG/JPEG 다운로드
- 브러시, 색상, 크기, 지우기
- 이모지 스티커 추가/이동/크기/회전/삭제
- 템플릿 생성/불러오기/수정/삭제
- localStorage 저장
- JSON export/import
- JSON 문법/구조/필수항목/타입·값 검증
- 같은 Canvas 렌더링 함수로 미리보기와 다운로드 처리

## 주의

현재 버전은 빠른 1차 완성본이다. 실제 제출 전에는 극단 입력 12건, 다운로드 일치 여부, 브라우저별 동작을 직접 확인하고 README의 검증 기록을 보강한다.
