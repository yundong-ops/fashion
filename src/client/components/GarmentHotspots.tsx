interface Props {
  onSelect: (slot: 'top' | 'bottom') => void;
}

/** 착장 이미지 위 고정 비율 2존 오버레이. 프롬프트가 항상
 * "머리부터 발끝까지, 정중앙" 구도를 강제하므로 좌표를 고정할 수 있다. */
export function GarmentHotspots({ onSelect }: Props) {
  return (
    <>
      <button
        type="button"
        className="hotspot"
        style={{ top: '16%', left: '22%', width: '56%', height: '40%' }}
        aria-label="상의 정보 보기"
        onClick={() => onSelect('top')}
      >
        <span className="chip">상의 보기</span>
      </button>
      <button
        type="button"
        className="hotspot"
        style={{ top: '56%', left: '28%', width: '44%', height: '38%' }}
        aria-label="하의 정보 보기"
        onClick={() => onSelect('bottom')}
      >
        <span className="chip">하의 보기</span>
      </button>
    </>
  );
}
