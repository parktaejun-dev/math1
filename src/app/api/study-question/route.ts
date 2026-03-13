import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CognitiveType, MiddleQuestion } from '@/lib/MiddleMathGenerator';
import type { QType, Question } from '@/lib/MathGenerator';
import {
  createLocalMiddleStudyQuestion,
  createLocalSuneungStudyQuestion,
  getMiddleFocusLabel,
  getStudyTierConfig,
  getSuneungFocusLabel,
  sanitizeMiddleLevel,
  sanitizeNumericChoices,
  shouldAttemptAiQuestion,
  type StudyQuestionResponse,
  type StudyTrack,
} from '@/lib/studyQuestionFactory';
import type { StudyTier } from '@/lib/studyConfig';

function extractJsonObject(content: string): string | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return content.slice(start, end + 1);
}

function createAiClient() {
  const deepSeekKey = process.env.DEEPSEEK_API_KEY;
  if (deepSeekKey) {
    return {
      client: new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: deepSeekKey,
      }),
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    };
  }

  return null;
}

async function requestAiQuestion(track: StudyTrack, tier: StudyTier, seed: string, index: number): Promise<StudyQuestionResponse<Question | MiddleQuestion> | null> {
  const config = getStudyTierConfig(track, tier);
  if (!config) return null;

  const aiConfig = createAiClient();
  if (!aiConfig) return null;

  const allowedTopics = track === 'suneung'
    ? (config.allowedTypes as QType[]).join(', ')
    : (config.allowedTypes as CognitiveType[]).join(', ');

  const difficultyGuide = track === 'suneung'
    ? tier === 'advanced'
      ? '수능 계산형 기준으로 체감상 상위권용 심화 문제'
      : '기본 계산만으로 끝나지 않는 응용 문제'
    : tier === 'advanced'
      ? '중등 상위권/심화 사고력 문제'
      : '학교 시험 응용 문항 수준';

  const prompt = `
당신은 한국 수학 시험 대비용 문제 출제자입니다.
한 문제만 생성하세요. 너무 쉬우면 안 됩니다.

트랙: ${track}
단계: ${tier}
허용 유형: ${allowedTopics}
난도 가이드: ${difficultyGuide}

반드시 다음 JSON 하나만 출력하세요.
{
  "latex": "문제 본문 (KaTeX 가능한 LaTeX)",
  "answer": 12,
  "choices": [4, 8, 12, 16, 20],
  "hint": "핵심 발상만 짧게",
  "solution": "정답에 이르는 풀이를 2~4단계로 설명",
  "misconception": "학생이 흔히 하는 실수 한 줄",
  "type": "허용 유형 중 하나",
  "focusLabel": "사용자에게 보일 단원명",
  "level": 5,
  "cognitiveType": "middle일 때만 허용 유형 중 하나, suneung이면 생략 가능"
}

규칙:
1. 정답은 반드시 정수 하나.
2. 보기는 서로 다른 정수 5개.
3. 정답은 보기 안에 반드시 포함.
4. 도형 이미지는 금지. 텍스트와 LaTeX만 사용.
5. 문제는 풀이가 2단계 이상 필요한 편이 좋습니다.
6. middle이면 cognitiveType을 꼭 넣고, suneung이면 type을 꼭 넣으세요.
7. JSON 외 텍스트는 절대 쓰지 마세요.
8. latex 안에 $ 기호나 markdown 코드블록 표시는 절대 쓰지 마세요.
9. 한국어 문장은 반드시 \\text{...} 안에 넣으세요.
10. solution은 실제 수업용 해설처럼 단계별로 쓰세요.
`;

  try {
    const completion = await aiConfig.client.chat.completions.create({
      model: aiConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const jsonText = extractJsonObject(raw);
    if (!jsonText) return null;
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    if (
      typeof parsed.latex !== 'string'
      || typeof parsed.answer !== 'number'
      || !Number.isInteger(parsed.answer)
      || parsed.latex.includes('$')
      || parsed.latex.includes('```')
      || (/[가-힣]/.test(parsed.latex) && !parsed.latex.includes('\\text{'))
    ) {
      return null;
    }

    if (track === 'suneung') {
      const suneungConfig = getStudyTierConfig('suneung', tier);
      if (!suneungConfig || !('allowedTypes' in suneungConfig)) return null;
      const type = typeof parsed.type === 'string' && suneungConfig.allowedTypes.includes(parsed.type as QType)
        ? parsed.type as QType
        : suneungConfig.allowedTypes[0];

      const question: Question = {
        id: `study-suneung-ai-${tier}-${index}`,
        latex: parsed.latex,
        answer: parsed.answer,
        choices: sanitizeNumericChoices(parsed.answer, parsed.choices, seed, index),
        hint: typeof parsed.hint === 'string' ? parsed.hint : '핵심 개념을 먼저 정리한 뒤, 보기 판단으로 넘어가세요.',
        solution: typeof parsed.solution === 'string' ? parsed.solution : '핵심 개념을 먼저 확인하고, 식을 정리한 뒤 대입 또는 계산을 마무리하세요.',
        misconception: typeof parsed.misconception === 'string' ? parsed.misconception : '조건을 일부만 보고 성급하게 계산에 들어가면 오답이 날 수 있습니다.',
        type,
      };

      return {
        question,
        meta: {
          source: 'ai',
          sourceLabel: 'AI 심화 출제',
          focusLabel: typeof parsed.focusLabel === 'string' ? parsed.focusLabel : getSuneungFocusLabel(type),
        },
      };
    }

    const middleConfig = getStudyTierConfig('middle', tier);
    if (!middleConfig || !('levelRange' in middleConfig)) return null;
    const cognitiveType = typeof parsed.cognitiveType === 'string' && middleConfig.allowedTypes.includes(parsed.cognitiveType as CognitiveType)
      ? parsed.cognitiveType as CognitiveType
      : middleConfig.allowedTypes[0];

    const question: MiddleQuestion = {
      id: `study-middle-ai-${tier}-${index}`,
      latex: parsed.latex,
      answer: parsed.answer,
      choices: sanitizeNumericChoices(parsed.answer, parsed.choices, seed, index),
      hint: typeof parsed.hint === 'string' ? parsed.hint : '조건을 식으로 바꾸고, 필요한 경우를 나누어 보세요.',
      solution: typeof parsed.solution === 'string' ? parsed.solution : '조건을 문자로 두고 식을 세운 뒤, 단계별로 정리해 정답을 구하세요.',
      misconception: typeof parsed.misconception === 'string' ? parsed.misconception : '조건을 한 번에 처리하려 하면 놓치는 값이 생길 수 있습니다.',
      type: typeof parsed.type === 'string' ? parsed.type : `${cognitiveType}_ai`,
      cognitiveType,
      level: sanitizeMiddleLevel(parsed.level, middleConfig),
    };

    return {
      question,
      meta: {
        source: 'ai',
        sourceLabel: 'AI 심화 출제',
        focusLabel: typeof parsed.focusLabel === 'string' ? parsed.focusLabel : getMiddleFocusLabel(cognitiveType),
      },
    };
  } catch (error) {
    console.error('AI study question generation failed:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      track?: StudyTrack;
      tier?: StudyTier;
      seed?: string;
      index?: number;
    };

    if (!body.track || !body.tier || typeof body.seed !== 'string' || typeof body.index !== 'number') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const config = getStudyTierConfig(body.track, body.tier);
    if (!config) {
      return NextResponse.json({ error: 'Unknown tier' }, { status: 404 });
    }

    const useAi = shouldAttemptAiQuestion(body.track, body.tier, body.seed, body.index);

    if (useAi) {
      const aiQuestion = await requestAiQuestion(body.track, body.tier, body.seed, body.index);
      if (aiQuestion) {
        return NextResponse.json(aiQuestion);
      }
    }

    const fallback = body.track === 'suneung' && 'level' in config
      ? createLocalSuneungStudyQuestion(body.seed, body.index, config)
      : body.track === 'middle' && 'levelRange' in config
        ? createLocalMiddleStudyQuestion(body.seed, body.index, config)
        : null;

    if (!fallback) {
      return NextResponse.json({ error: 'Invalid tier configuration' }, { status: 500 });
    }

    return NextResponse.json(fallback);
  } catch (error) {
    console.error('Study question route failed:', error);
    return NextResponse.json({ error: 'Failed to load study question' }, { status: 500 });
  }
}
