import { useEffect, useState } from 'react';
import type { CatalogItem, Category } from '../../shared/types';
import { CATALOG } from '../../shared/catalog';
import { fetchSimilar } from '../lib/api';

interface Props {
  step: string;
  category: Category;
  title: string;
  subtitle: string;
  onNext: (item: CatalogItem) => void;
}

export function GarmentSelect({ step, category, title, subtitle, onNext }: Props) {
  const items = CATALOG.filter((item) => item.category === category);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '');
  const [similar, setSimilar] = useState<CatalogItem[]>([]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    fetchSimilar(selectedId, 5)
      .then((result) => {
        if (!cancelled) setSimilar(result);
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  return (
    <div className="screen">
      <p className="eyebrow">{step}</p>
      <h1 className="title">{title}</h1>
      <p className="subtitle">{subtitle}</p>

      <p className="similar-label">전체 상품</p>
      <div className="similar-grid" style={{ marginBottom: 24 }}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`similar-card${item.id === selectedId ? ' selected' : ''}`}
            onClick={() => setSelectedId(item.id)}
          >
            <img src={item.imagePath} alt={item.name} />
            <div className="info">
              <p className="name">{item.name}</p>
              <p className="price">{item.price.toLocaleString()}원</p>
            </div>
          </button>
        ))}
      </div>

      {similar.length > 0 && (
        <>
          <p className="similar-label">이런 것도 잘 어울려요</p>
          <div className="similar-grid" style={{ marginBottom: 24 }}>
            {similar.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`similar-card${item.id === selectedId ? ' selected' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <img src={item.imagePath} alt={item.name} />
                <div className="info">
                  <p className="name">{item.name}</p>
                  <p className="price">{item.price.toLocaleString()}원</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button className="button accent" disabled={!selected} onClick={() => selected && onNext(selected)}>
        다음
      </button>
    </div>
  );
}
