import type { CatalogItem } from '../../shared/types';

interface Props {
  items: CatalogItem[];
  currentId: string;
  onSelect: (item: CatalogItem) => void;
}

export function SimilarList({ items, currentId, onSelect }: Props) {
  if (items.length === 0) return null;

  return (
    <>
      <p className="similar-label">유사한 상품</p>
      <div className="similar-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`similar-card${item.id === currentId ? ' selected' : ''}`}
            onClick={() => onSelect(item)}
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
  );
}
