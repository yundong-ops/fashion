import { useEffect, useState } from 'react';

export type ProgressStage = 'analyzing' | 'selecting' | 'generating';

const STEPS: { key: ProgressStage; label: string }[] = [
  { key: 'analyzing', label: '체형을 분석하고 있어요' },
  { key: 'selecting', label: '사이즈를 계산하는 중이에요' },
  { key: 'generating', label: '착장 이미지를 만드는 중이에요' },
];

export function Progress({ stage }: { stage: ProgressStage }) {
  const activeIdx = STEPS.findIndex((s) => s.key === stage);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (stage !== 'generating') return;
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  return (
    <div className="screen" style={{ justifyContent: 'center', flex: 1 }}>
      <div className="spinner" />
      <h1 className="title" style={{ fontSize: 20 }}>
        조금만 기다려주세요
      </h1>
      {/* 실측: 무료 HF Space에 상의·하의를 2번 연달아 합성 요청하므로 보통 1분 반~2분.
          대기열이 길면 더 걸릴 수 있다. */}
      <p className="subtitle" style={{ marginBottom: 8 }}>
        착장 합성은 보통 <strong>1~2분</strong> 걸려요. 무료 AI 서버를 쓰기 때문에
        대기열이 길면 조금 더 걸릴 수 있어요.
      </p>
      {stage === 'generating' && elapsed > 0 && (
        <p className="hint" style={{ marginBottom: 20 }}>
          {elapsed}초 경과 — 창을 닫지 말고 기다려주세요
        </p>
      )}

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
