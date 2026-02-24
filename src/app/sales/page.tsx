const STATUS_GUIDE = [
  {
    status: "NEW",
    label: "신규",
    description: "방금 등록된 리드, 아직 컨택하기 전 상태",
  },
  {
    status: "CONTACTED",
    label: "접촉됨",
    description: "메일 발송 또는 1차 유선 연락 완료",
  },
  {
    status: "PROPOSAL",
    label: "제안 중",
    description: "맞춤형 제안서 및 견적서 송부 완료",
  },
  {
    status: "NEGOTIATING",
    label: "협상 중",
    description: "예산, 단가, 일정 등 세부 조율 단계",
  },
  {
    status: "WON",
    label: "계약 성사",
    description: "광고 집행 확정",
  },
  {
    status: "LOST",
    label: "실패",
    description: "당장 집행 계획이 없어 추후 재컨택을 위해 보류",
  },
];

const DAILY_ROUTINE = [
  {
    time: "오전 09:00",
    title: "리드 확인 및 정보 보강",
    action:
      "전날 또는 아침에 새로 수집된 NEW 상태의 리드 목록을 확인하고, 일괄적으로 [Enrich]를 실행하여 정보를 업데이트합니다.",
  },
  {
    time: "오전 10:00",
    title: "AI 메일 발송",
    action:
      "보강된 인사이트를 바탕으로 맞춤형 제안 메일을 생성하여 발송하고, 상태를 CONTACTED로 변경합니다.",
  },
  {
    time: "오후 02:00",
    title: "유선 팔로업",
    action:
      "며칠 전 제안서를 보낸(PROPOSAL) 리드들에게 확인 전화를 돌리고, 피드백을 Notes에 상세히 기록합니다.",
  },
  {
    time: "오후 05:00",
    title: "파이프라인 마감",
    action:
      "전체 대시보드 현황을 보며 내일 최우선으로 컨택할 타겟 리스트를 정리하고 하루를 마감합니다.",
  },
];

export default function SalesManualPage() {
  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-900 px-6 py-8 text-white sm:px-10">
            <p className="text-sm font-bold tracking-widest text-slate-300">
              SALES MANUAL
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-4xl">
              🚀 KOBACO-ADDR 스마트 영업 아웃리치 사용 설명서
            </h1>
            <p className="mt-3 text-sm text-slate-200 sm:text-base">
              본 매뉴얼은 신규 광고주 발굴부터 AI 맞춤형 제안 메일 작성, 계약 성사까지의
              파이프라인 운영 전 과정을 안내합니다.
            </p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-extrabold text-slate-900">📋 목차</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                <li>Step 1. 리드(잠재 고객) 발굴 및 등록</li>
                <li>Step 2. 리드 정보 자동 보강 (Enrichment)</li>
                <li>Step 3. AI 맞춤형 제안 메일 작성 (Generate Email)</li>
                <li>Step 4. 영업 파이프라인 상태 관리</li>
                <li>영업사원 일일 추천 루틴</li>
              </ol>
            </section>

            <section id="step-1" className="space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">
                1. Step 1. 리드(잠재 고객) 발굴 및 등록
              </h2>
              <p className="text-sm leading-7 text-slate-700">
                성공적인 영업의 첫걸음은 양질의 잠재 고객을 시스템에 등록하는 것입니다.
              </p>

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-base font-bold text-slate-900">
                  🧩 YouTube Ad Miner (크롬 확장 프로그램) 활용
                </h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                  <li>업무용 PC의 크롬 브라우저에 YouTube Ad Miner 확장 프로그램을 설치합니다.</li>
                  <li>
                    유튜브 시청 중 타겟으로 삼을 만한 광고 영상이 나오면 브라우저 우측 상단의
                    확장 프로그램 아이콘을 클릭합니다.
                  </li>
                  <li>
                    감지된 광고주 정보와 랜딩 페이지 URL을 확인한 후 [리드로 전송 (CRM)] 버튼을
                    클릭합니다.
                  </li>
                  <li>
                    KOBACO-ADDR 시스템의 Sales CRM &gt; Leads 메뉴에 해당 광고주가 신규
                    리드(NEW)로 자동 등록됩니다.
                  </li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-base font-bold text-slate-900">✍️ 수동 리드 등록</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                  <li>시스템 좌측 메뉴에서 [Sales] 탭을 클릭합니다.</li>
                  <li>
                    우측 상단의 [+ Add Lead] 버튼을 클릭하여 기업명, 담당자 정보, 웹사이트 등을
                    직접 입력하고 저장합니다.
                  </li>
                </ol>
              </div>
            </section>

            <section id="step-2" className="space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">
                2. Step 2. 리드 정보 자동 보강 (Enrichment)
              </h2>
              <p className="text-sm leading-7 text-slate-700">
                콜드 메일의 성공률을 높이려면 타겟 기업의 최신 동향 파악이 필수입니다. AI 검색
                기능을 활용하세요.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                <li>등록된 리드의 상세 페이지로 이동합니다.</li>
                <li>[Enrich Data] (데이터 보강) 버튼을 클릭합니다.</li>
                <li>AI가 기업 웹사이트와 최근 네이버 뉴스 등을 자동으로 스크랩하고 분석합니다.</li>
                <li>
                  분석 완료 후 Company Overview, 최근 뉴스 하이라이트, 예상 마케팅 니즈(태그)를
                  확인하고 영업 전략을 구상합니다.
                </li>
              </ol>
            </section>

            <section id="step-3" className="space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">
                3. Step 3. AI 맞춤형 제안 메일 작성 (Generate Email)
              </h2>
              <p className="text-sm leading-7 text-slate-700">
                수집된 기업 정보와 코바코의 매체 제안을 결합하여, AI가 고객사 맞춤형 제안 메일
                초안을 1분 만에 작성해 줍니다.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                <li>리드 상세 페이지 내의 [Generate Email] 탭으로 이동합니다.</li>
                <li>
                  메일의 목적(Purpose)을 선택합니다. 예: 첫인사 및 소개(Cold Outreach), 맞춤형
                  매체 제안, 미팅 요청
                </li>
                <li>
                  메일의 톤앤매너(Tone &amp; Manner)를 선택합니다. 예: 전문적인(Professional),
                  친근한(Friendly)
                </li>
                <li>[생성하기] 버튼을 누릅니다.</li>
                <li>
                  AI가 Enrich된 기업 최신 동향을 메일 본문에 반영해 초안을 작성합니다.
                </li>
                <li>
                  완성된 텍스트를 복사해 아웃룩/지메일 등으로 가져간 뒤 첨부파일(견적서 등)과
                  함께 발송합니다.
                </li>
              </ol>
            </section>

            <section id="step-4" className="space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">
                4. Step 4. 영업 파이프라인 상태 관리
              </h2>
              <p className="text-sm leading-7 text-slate-700">
                여러 업체를 동시에 관리할 때 혼선을 줄이려면 상태(Status)를 항상 최신으로
                유지해야 하며, 그래야 대시보드 통계도 정확해집니다.
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">의미</th>
                      <th className="px-4 py-3 font-bold">가이드</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STATUS_GUIDE.map((item) => (
                      <tr key={item.status} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {item.status}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.label}</td>
                        <td className="px-4 py-3 text-slate-700">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-bold text-slate-900">상태 변경 방법</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  Kanban 보드에서 카드를 드래그하거나, 리드 상세 페이지의 상태 배지를 클릭해
                  변경합니다.
                </p>
                <h3 className="mt-4 text-base font-bold text-slate-900">영업 노트 기록</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  Notes 기능에 미팅 결과, 고객 피드백, 다음 액션 플랜을 기록해 히스토리를
                  관리합니다.
                </p>
              </div>
            </section>

            <section id="routine" className="space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">
                5. 💡 영업사원 일일 추천 루틴
              </h2>
              <p className="text-sm leading-7 text-slate-700">
                시스템을 100% 활용하기 위한 시간대별 권장 액션 플랜입니다.
              </p>
              <div className="space-y-3">
                {DAILY_ROUTINE.map((item) => (
                  <div
                    key={item.time}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-sm font-black text-slate-900">{item.time}</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-sm leading-7 text-slate-700">{item.action}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
