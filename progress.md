Original prompt: 초수가 얼마 남지 않았을 때 오답이면 바로 게임 종료되어야 하는데, 연타하면 살아남음.

- 가설: 오답으로 시간이 0이 되어도 타이머 onComplete가 즉시 실행되지 않고, 500ms 후 nextQuestion이 먼저 호출되는 레이스가 존재.
- 계획: useGameTimer에서 addTime으로 0 도달 시 즉시 onComplete 트리거 + SuneungGame에서 오답 후 남은 시간이 0이면 nextQuestion 스킵.
- 수정1: useGameSession에 isSubmittingRef 추가. submitAnswer/submitPass에서 동기 락을 걸어 연타 중복 채점을 차단.
- 수정2: SuneungGame 오답 처리 시 `nextTimeLeft` 계산 후 0 이하면 `nextQuestion` 없이 즉시 game over.
