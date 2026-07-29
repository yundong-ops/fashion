interface Props {
  message: string;
  onRetry: () => void;
  onRestart: () => void;
}

export function ErrorScreen({ message, onRetry, onRestart }: Props) {
  return (
    <div className="screen" style={{ justifyContent: 'center', flex: 1 }}>
      <div className="error-box">{message}</div>
      <button className="button accent" onClick={onRetry}>
        다시 시도
      </button>
      <button className="link-button" onClick={onRestart}>
        처음부터 다시 시작하기
      </button>
    </div>
  );
}
