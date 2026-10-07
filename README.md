flowchart TD
    ManualStart(("시작 A: 사용자가 스냅샷 버튼 클릭"))
    AutoStart(("시작 B: 실행 중인 백엔드의 예약 시각 도달"))
    CollectAPI["FastAPI 수집 API 또는 예약 작업"]
    Collector["유기동물 데이터 수집 서비스"]
    GetKey["백엔드 환경변수에서 API 인증키 읽기"]
    PublicAPI["대전광역시 유기동물 공공 API 요청"]
    Response["API 응답 수신"]
    Validate{"응답 코드와 데이터 형식이 정상인가?"}
    Parse["응답 필드 파싱"]
    Aggregate["등록일·구·종·상태별 집계"]
    Timestamp["KST 기준 시각 생성<br/>기준일·조회 시각 기록"]
    Save["정상 실제 집계 기록 저장"]
    SQLite[("SQLite 날짜별 기록")]
    Success["수집 성공 상태 갱신"]
    Failure(("실패 흐름으로 이동"))
    End(("종료: 저장 결과를 화면에 반영"))

    ManualStart --> CollectAPI
    AutoStart --> CollectAPI
    CollectAPI --> Collector
    Collector --> GetKey
    GetKey --> PublicAPI
    PublicAPI --> Response
    Response --> Validate

    Validate -->|정상| Parse
    Parse --> Aggregate
    Aggregate --> Timestamp
    Timestamp --> Save
    Save --> SQLite
    Save --> Success
    Success --> End

    Validate -->|오류·시간 초과·형식 변경| Failure


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
