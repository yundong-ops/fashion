import { useEffect, useState } from 'react';
import type { CatalogItem, Outfit } from '../../shared/types';
import { fetchSimilar } from '../lib/api';
import { GarmentHotspots } from '../components/GarmentHotspots';
import { GarmentPanel } from '../components/GarmentPanel';

interface Props {
  imageUrl: string;
  regenerating: boolean;
  outfit: Outfit;
  onSwap: (slot: 'top' | 'bottom', item: CatalogItem) => void;
  onRestart: () => void;
}

export function Result({ imageUrl, regenerating, outfit, onSwap, onRestart }: Props) {
  const [panel, setPanel] = useState<'top' | 'bottom' | null>(null);
  const [similar, setSimilar] = useState<CatalogItem[]>([]);

  const active = panel === 'top' ? outfit.top : panel === 'bottom' ? outfit.bottom : null;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetchSimilar(active.item.id, 5)
      .then((result) => {
        if (!cancelled) setSimilar(result);
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
  }, [active?.item.id]);

  return (
    <div className="screen">
      <p className="eyebrow">완성된 착장</p>
      <h1 className="title" style={{ fontSize: 20, marginBottom: 20 }}>
        옷을 클릭하면 상세 정보를 볼 수 있어요
      </h1>

      <div className={`result-image-wrap${regenerating ? ' regenerating' : ''}`}>
        <img src={imageUrl} alt="AI가 생성한 착장 이미지" />
        {!regenerating && <GarmentHotspots onSelect={setPanel} />}
        {regenerating && (
          <div className="regen-spinner">
            <div className="spinner" style={{ marginBottom: 0 }} />
          </div>
        )}
      </div>

      <div className="tab-row">
        <button
          type="button"
          className={panel === 'top' ? 'active' : ''}
          onClick={() => setPanel('top')}
        >
          상의
        </button>
        <button
          type="button"
          className={panel === 'bottom' ? 'active' : ''}
          onClick={() => setPanel('bottom')}
        >
          하의
        </button>
      </div>

      {active && (
        <GarmentPanel
          item={active.item}
          fit={active.fit}
          similar={similar}
          onSelectSimilar={(item) => onSwap(panel!, item)}
        />
      )}

      <button className="link-button" onClick={onRestart}>
        새로 시작하기
      </button>
    </div>
  );
}
