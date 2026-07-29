import type { CatalogItem, SizeFitResult } from '../../shared/types';
import { SizeFitCard } from './SizeFitCard';
import { SimilarList } from './SimilarList';

interface Props {
  item: CatalogItem;
  fit: SizeFitResult;
  similar: CatalogItem[];
  onSelectSimilar: (item: CatalogItem) => void;
}

export function GarmentPanel({ item, fit, similar, onSelectSimilar }: Props) {
  return (
    <div className="panel">
      <p className="brand">{item.brand}</p>
      <p className="name">{item.name}</p>
      <p className="price">{item.price.toLocaleString()}원</p>
      <SizeFitCard fit={fit} />
      <p className="detail">{item.detail}</p>
      <SimilarList items={similar} currentId={item.id} onSelect={onSelectSimilar} />
    </div>
  );
}
