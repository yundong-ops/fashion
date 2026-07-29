import { useState } from 'react';
import { prepImage } from '../lib/imagePrep';
import { analyzePose, loadImageFromBlob } from '../lib/poseAnalysis';
import type { PoseTraits } from '../../shared/types';

export interface PreppedPhoto {
  blob: Blob;
  dataUrl: string;
}

interface Props {
  onNext: (photo: PreppedPhoto, pose: PoseTraits | null) => void;
}

type Status = 'idle' | 'prepping' | 'analyzing' | 'done';

export function PhotoUpload({ onNext }: Props) {
  const [photo, setPhoto] = useState<PreppedPhoto | null>(null);
  const [pose, setPose] = useState<PoseTraits | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  async function handleFile(file: File) {
    setStatus('prepping');
    const prepped = await prepImage(file, 768, 'portrait');
    setPhoto(prepped);

    setStatus('analyzing');
    try {
      const img = await loadImageFromBlob(prepped.blob);
      const detected = await analyzePose(img);
      setPose(detected);
    } catch {
      setPose(null);
    }
    setStatus('done');
  }

  return (
    <div className="screen">
      <p className="eyebrow">3 / 3</p>
      <h1 className="title">전신 사진을 올려주세요</h1>
      <p className="subtitle">
        얼굴이 보이는 정면 전신 사진 한 장이면 돼요. 브라우저에서 바로 체형을 분석하고,
        서버에는 업로드된 사진 원본이 저장되지 않아요.
      </p>

      <div className="upload-grid single">
        <label className={`upload-slot${photo ? ' filled' : ''}`} aria-label="전신 사진 업로드">
          {photo ? (
            <img src={photo.dataUrl} alt="전신 사진 미리보기" />
          ) : (
            <>
              <span className="label">전신 사진</span>
              <span className="hint">머리부터 발끝까지, 정면</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
      </div>

      {status === 'prepping' && <p className="hint">사진 처리 중...</p>}
      {status === 'analyzing' && <p className="hint">체형을 분석하는 중이에요...</p>}
      {status === 'done' && (
        <p className="hint">
          {pose ? '체형 분석 완료' : '체형을 정확히 인식하지 못했어요 — 키/몸무게 기준으로만 추천할게요'}
        </p>
      )}

      <button
        className="button accent"
        disabled={!photo || status === 'prepping' || status === 'analyzing'}
        onClick={() => photo && onNext(photo, pose)}
      >
        합성하기
      </button>
    </div>
  );
}
