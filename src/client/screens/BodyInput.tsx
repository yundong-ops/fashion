import { useState } from 'react';

interface Props {
  onNext: (height: number, weight: number) => void;
}

export function BodyInput({ onNext }: Props) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const h = Number(height);
  const w = Number(weight);
  const valid = h >= 130 && h <= 210 && w >= 30 && w <= 150;

  return (
    <div className="screen">
      <p className="eyebrow">1 / 3</p>
      <h1 className="title">키와 몸무게를 알려주세요</h1>
      <p className="subtitle">체형 분석과 사이즈 추천의 기준이 돼요</p>

      <div className="field">
        <label htmlFor="height">키 (cm)</label>
        <input
          id="height"
          type="number"
          inputMode="numeric"
          placeholder="175"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="weight">몸무게 (kg)</label>
        <input
          id="weight"
          type="number"
          inputMode="numeric"
          placeholder="68"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>

      <button className="button accent" disabled={!valid} onClick={() => onNext(h, w)}>
        다음
      </button>
    </div>
  );
}
