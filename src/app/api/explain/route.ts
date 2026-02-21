import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            console.warn('DEEPSEEK_API_KEY is missing. Returning a simulated response or error.');
            return NextResponse.json({ explanation: 'AI 해설 기능이 현재 비활성화되어 있습니다. (API 키 누락)' });
        }

        const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: apiKey
        });

        const { latex, choices, answer } = await req.json();

        if (!latex || !choices || answer === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const prompt = `
당신은 수능 수학을 다 까먹은 30~50대 어른들(삼촌, 이모)에게 수학 문제를 다시 가르쳐주는 친절한 AI 선생님입니다.
사용자는 간단한 수학 게임을 풀다가 틀렸거나, 해설을 원해서 이 요청을 보냈습니다.

문제 정보:
LaTeX 수식: ${latex}
선택지: ${choices.join(', ')}
정답: ${answer}

다음 지침에 따라 해설을 작성해주세요:
1. 친근하고 다정한 말투를 사용하세요. (예: "아이고, 기억이 가물가물하시죠?", "괜찮아요, 천천히 다시 살펴보면 됩니다!")
2. 문제의 핵심 개념을 중학교/고등학교 1학년 수준의 쉬운 말로 먼저 짚어주세요.
3. 단계별로 식을 푸는 과정을 보여주세요. 수식은 반드시 LaTeX 문법(인라인은 $, 블록은 $$)을 사용해서 작성해주세요.
4. 마지막에는 정답이 왜 ${answer}인지 명확하게 결론지어주세요.
5. 너무 길지 않게, 모바일 화면에서 읽기 좋은 분량(3~4 문단)으로 요약해서 설명해주세요.

해설 텍스트:
`;

        const response = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }]
        });

        const explanation = response.choices[0]?.message?.content || '해설을 생성하지 못했습니다.';

        return NextResponse.json({ explanation });
    } catch (error) {
        console.error('Explanation generation error:', error);
        return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
    }
}
