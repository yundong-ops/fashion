export type ProgressStage = 'analyzing' | 'selecting' | 'generating';

const STEPS: { key: ProgressStage; label: string }[] = [
  { key: 'analyzing', label: '체형을 분석하고 있어요' },
  { key: 'selecting', label: '어울리는 옷을 고르는 중이에요' },
  { key: 'generating', label: '착장 이미지를 만드는 중이에요' },
];

export function Progress({ stage }: { stage: ProgressStage }) {
  const activeIdx = STEPS.findIndex((s) => s.key === stage);

  return (
    <div className="screen" style={{ justifyContent: 'center', flex: 1 }}>
      <div className="spinner" />
      <h1 className="title" style={{ fontSize: 20 }}>
        조금만 기다려주세요
      </h1>
      <p className="subtitle">보통 10~30초 정도 걸려요</p>

      <div className="progress-steps">
        {STEPS.map((step, idx) => (
          <div
            key={step.key}
            className={`progress-step${
              idx === activeIdx ? ' active' : idx < activeIdx ? ' done' : ''
            }`}
          >
            <span className="dot" />
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
