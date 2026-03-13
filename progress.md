Original prompt: 초수가 얼마 남지 않았을 때 오답이면 바로 게임 종료되어야 하는데, 연타하면 살아남음.

- 가설: 오답으로 시간이 0이 되어도 타이머 onComplete가 즉시 실행되지 않고, 500ms 후 nextQuestion이 먼저 호출되는 레이스가 존재.
- 계획: useGameTimer에서 addTime으로 0 도달 시 즉시 onComplete 트리거 + SuneungGame에서 오답 후 남은 시간이 0이면 nextQuestion 스킵.
- 수정1: useGameSession에 isSubmittingRef 추가. submitAnswer/submitPass에서 동기 락을 걸어 연타 중복 채점을 차단.
- 수정2: SuneungGame 오답 처리 시 `nextTimeLeft` 계산 후 0 이하면 `nextQuestion` 없이 즉시 game over.
- 신규 요청 반영: `practice`와 `middle/practice`를 공부형 허브로 재구성하고, 각 허브 아래 `basic/core/advanced` 서브페이지를 추가.
- 구현 메모: 새 공부 세션은 자동 다음 문제 이동을 제거하고, 힌트 확인 후 사용자가 직접 `다음 문제`를 누르는 self-paced 흐름으로 설계.
- 데이터 메모: `src/lib/studyConfig.ts`에 수능/중등 단계별 타입 풀과 학습 포인트를 정리.
- 검증 메모: 새로 만든 공부 페이지 관련 파일만 대상으로 한 eslint는 통과. 전체 `npm run lint`는 기존 프로젝트 전반의 오래된 lint 오류 때문에 여전히 실패.
- 추가 요청 반영: 중등 `advanced` 첫 문제가 쉬웠던 원인을 확인. 로컬 심화 생성기에서 core용 backtrack/geometry가 섞이던 구조를 분리함.
- 수정 메모: `src/lib/studyQuestionFactory.ts`에서 중등 심화 후보를 tier별로 분기하고, advanced 전용 레벨 5 문제(3집합 포함배제, 4의 배수 경우의 수, 비율 결합, 자리수 조건, 직사각형 추론)를 추가.
- 추가 요청 반영: 홈에서 학습 진입을 메인 버튼이 아니라 별도 햄버거 메뉴로 분리.
- 수정 메모: `src/app/page.tsx`에 우측 상단 `학습 메뉴` 드로어를 추가하고, 메뉴 내부에서 `고등학교 학습`과 `중학교 학습`으로 이동하도록 구조 변경.
