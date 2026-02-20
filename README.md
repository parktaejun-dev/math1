# 수능1번 타임어택 (Suneung Math Time Attack)

![수능1번 타임어택](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)
![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4-blue?style=flat-square&logo=tailwindcss)
![Redis](https://img.shields.io/badge/Redis-Leaderboard-red?style=flat-square&logo=redis)

**수능 수학 1번 문제의 긴장감을 타임어택으로 그대로 재현한 웹 게임입니다.**
한국교육과정평가원(KICE) 수능 수학 1번 문제에 출제되는 대표 3가지 유형을 무한으로 생성하여 제한 시간 60초 내에 최대한 많은 문제를 푸는 게임입니다.

## 🎯 특징 (Features)

*   **실제 수능 체감 디자인:** 실제 시험지와 동일한 명조체 레이아웃 및 디자인을 적용했습니다.
*   **고도의 문제 생성 엔진:** 단순한 랜덤이 아닌, 실제 수능에 출제되는 기출문제 패턴 (지수법칙, 도함수의 활용, 수열의 합)을 분석하여 억지스럽지 않고 수학적으로 기약 형태(Simplest form)를 갖춘 자연스러운 문제를 생성합니다.
*   **CSAT 스타일 보기:** 1번부터 5번까지 보기 숫자가 오름차순으로 정렬되며, 보통 정답에 근접한 오답들이 매력적인 오답(Distractors)으로 배치됩니다.
*   **타임어택 & 콤보 (피버):** 60초 안에 문제를 풀어야 하며, 연속으로 정답을 맞히면 콤보 점수와 함께 추가 시간이 부여됩니다.
*   **실시간 전국 랭킹:** Redis를 통해 사용자들의 점수를 실시간으로 집계해 명예의 전당(리더보드)을 제공합니다.
*   **성적표 발급:** 게임이 끝나면 실제 수능 성적표와 유사한 형태의 결과 화면을 제공합니다.

## 🧩 문제 유형 (Question Types)

1.  **지수와 로그:** 밑이 같거나 다른 분수 지수들의 거듭제곱 연산 및 합차 공식을 이용한 무리수 지수 연산.
2.  **다항함수의 극한 및 미분:** 삼차함수의 특정 점에서의 미분 계수(극한식) 구하기.
3.  **수열의 시그마 성질:** 여러 수열의 합이 조건으로 주어졌을 때 변형된 수열의 합 도출.

## 🛠 기술 스택 (Tech Stack)

*   **Framework:** [Next.js](https://nextjs.org/) (App Directory, React 19)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Math Rendering:** [KaTeX](https://katex.org/) (`react-katex`)
*   **Leaderboard DB:** [Redis](https://redis.io/) (`ioredis`) (로컬 환경에서는 In-Memory fallback 지원)

## 🚀 로컬 실행 방법 (Installation & Run)

```bash
# 1. 패키지 설치
npm install

# 2. 로컬 개발 환경 실행
npm run dev
```

환경 변수 (`.env.local`)에 `REDIS_URL`을 설정하면 리더보드가 동작하며, 없을 경우 임시 메모리(In-Memory) 리더보드가 동작합니다.

## 📄 라이선스 (License)

이 프로젝트는 교육적 및 엔터테인먼트 목적으로 패러디된 것으로, 상업적 이용을 금합니다. 수능 시험지와 관련된 양식의 저작권은 한국교육과정평가원(KICE)에 있습니다.
