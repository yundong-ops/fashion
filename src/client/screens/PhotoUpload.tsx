import { useState } from 'react';
import { prepImage } from '../lib/imagePrep';

export interface PreppedPhoto {
  blob: Blob;
  dataUrl: string;
}

export type PhotoSlot = 'face' | 'upper' | 'lower' | 'full';

interface Props {
  onNext: (photos: Record<PhotoSlot, PreppedPhoto>) => void;
}

const SLOTS: { key: PhotoSlot; label: string; hint: string; aspect: 'square' | 'portrait' }[] = [
  { key: 'face', label: '얼굴', hint: '정면을 바라본 얼굴 사진', aspect: 'square' },
  { key: 'upper', label: '상체', hint: '어깨~허리가 보이는 사진', aspect: 'square' },
  { key: 'lower', label: '하체', hint: '허리~발목이 보이는 사진', aspect: 'square' },
  { key: 'full', label: '전신', hint: '머리부터 발끝까지, 정면', aspect: 'portrait' },
];

export function PhotoUpload({ onNext }: Props) {
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, PreppedPhoto>>>({});
  const [busy, setBusy] = useState<PhotoSlot | null>(null);

  const allFilled = SLOTS.every((slot) => photos[slot.key]);

  async function handleFile(slot: PhotoSlot, aspect: 'square' | 'portrait', file: File) {
    setBusy(slot);
    try {
      const prepped = await prepImage(file, 512, aspect);
      setPhotos((prev) => ({ ...prev, [slot]: prepped }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="screen">
      <p className="eyebrow">2 / 3</p>
      <h1 className="title">사진 4장을 업로드해주세요</h1>
      <p className="subtitle">
        상체·하체 사진은 체형 파악을 더 정확히 하기 위한 추가 각도예요. 전신 사진에 옷을
        입혀드립니다.
      </p>

      <div className="upload-grid">
        {SLOTS.map((slot) => {
          const filled = photos[slot.key];
          return (
            <label
              key={slot.key}
              className={`upload-slot${filled ? ' filled' : ''}`}
              aria-label={`${slot.label} 사진 업로드`}
            >
              {filled ? (
                <img src={filled.dataUrl} alt={`${slot.label} 미리보기`} />
              ) : (
                <>
                  <span className="label">
                    {busy === slot.key ? '처리 중...' : slot.label}
                  </span>
                  <span className="hint">{slot.hint}</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(slot.key, slot.aspect, file);
                }}
              />
            </label>
          );
        })}
      </div>

      <button
        className="button accent"
        disabled={!allFilled || busy !== null}
        onClick={() => onNext(photos as Record<PhotoSlot, PreppedPhoto>)}
      >
        분석 시작하기
      </button>
    </div>
  );
}
