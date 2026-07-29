import type { SizeFitResult } from '../../shared/types';

export function SizeFitCard({ fit }: { fit: SizeFitResult }) {
  if (!fit.best) {
    return <span className="fit-warning">추천 사이즈: 정보 없음</span>;
  }
  return (
    <span className="fit-warning">
      추천 사이즈 {fit.best} · {fit.warnings.join(', ')}
    </span>
  );
}
