---
name: dev-workflow
description: TMS 저장소에서 기능 추가/수정 등 신규 작업 요청을 처리할 때 항상 따라야 하는 작업 절차. 작업 시작 전 docs/PROJECT_STRUCTURE.md 확인, 완료 후 docs/HISTORY.md 기록과 PROJECT_STRUCTURE.md 갱신, 빌드/타입체크 검증, main 브랜치 머지 및 푸시까지 포함. "새 기능 추가해줘", "수정해줘", "구현해줘" 류의 코드 변경 요청에는 반드시 이 skill을 사용한다.
---

# TMS 개발 작업 절차

전체 절차는 `docs/workflow.md`에 정의되어 있다. 이 skill이 매칭되면 반드시 `docs/workflow.md`를 읽고 그 내용을 그대로 따른다.

요약:
1. 작업 전 `docs/PROJECT_STRUCTURE.md` 확인
2. 작업 수행
3. `docs/HISTORY.md`에 작업 내역 기록, `docs/PROJECT_STRUCTURE.md`에 추가된 기능 반영
4. `npm run lint`, `npx tsc --noEmit`, `npm run build`로 디버깅 체크
5. main 브랜치에 머지 후 push
