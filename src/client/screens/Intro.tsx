import { useState } from 'react';

interface Props {
  onStart: () => void;
}

export function Intro({ onStart }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="screen">
      <p className="eyebrow">핏메이트</p>
      <h1 className="title">
        직접 입어보지 않아도,
        <br />
        나에게 어울리는 옷을 확인하세요
      </h1>
      <p className="subtitle">
        키·몸무게와 사진 몇 장이면 충분해요. AI가 체형과 톤을 분석해서 잘 어울리는 상의·하의를
        골라주고, 실제로 입은 모습을 보여드릴게요.
      </p>

      <div className="consent-box">
        <p>
          <strong>사진은 서버에 저장되지 않습니다.</strong> 체형 분석은 이 기기(브라우저)에서
          바로 처리되고, 착장 합성을 위해 사진이 외부 AI 모델(Hugging Face)로 일시 전송됩니다.
          결과 이미지는 이 기기에만 저장되며, 언제든 "새로 시작하기"로 전체 삭제할 수 있어요.
        </p>
        <label className="consent-check">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>개인정보 처리 방침에 동의합니다</span>
        </label>
      </div>

      <button className="button accent" disabled={!agreed} onClick={onStart}>
        시작하기
      </button>
    </div>
  );
}
