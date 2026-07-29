import { useRef, useState } from 'react';
import type { CatalogItem, Outfit, PoseTraits, UserProfile } from '../shared/types';
import { scoreItem } from '../shared/recommend';
import { fitSize } from '../shared/sizing';
import { buildProfile } from './lib/analyzeLocal';
import { requestTryOn } from './lib/api';
import { shortHash } from './lib/hash';
import { getCached, setCached, clearCache } from './lib/tryonCache';
import { Intro } from './screens/Intro';
import { GarmentSelect } from './screens/GarmentSelect';
import { BodyInput } from './screens/BodyInput';
import { PhotoUpload, type PreppedPhoto } from './screens/PhotoUpload';
import { Progress, type ProgressStage } from './screens/Progress';
import { Result } from './screens/Result';
import { ErrorScreen } from './screens/ErrorScreen';

type AppScreen =
  | { name: 'intro' }
  | { name: 'topSelect' }
  | { name: 'bottomSelect' }
  | { name: 'bodyInput' }
  | { name: 'photoUpload' }
  | { name: 'progress'; stage: ProgressStage }
  | { name: 'result' }
  | { name: 'error'; message: string };

interface Session {
  top: CatalogItem | null;
  bottom: CatalogItem | null;
  height: number;
  weight: number;
  photo: PreppedPhoto | null;
  pose: PoseTraits | null;
  profile: UserProfile | null;
  outfit: Outfit | null;
  imageUrl: string | null;
  regenerating: boolean;
}

const EMPTY_SESSION: Session = {
  top: null,
  bottom: null,
  height: 0,
  weight: 0,
  photo: null,
  pose: null,
  profile: null,
  outfit: null,
  imageUrl: null,
  regenerating: false,
};

async function fetchImageBlob(path: string): Promise<Blob> {
  const res = await fetch(path);
  if (!res.ok) throw new Error('상품 이미지를 불러오지 못했습니다');
  return res.blob();
}

function buildOutfit(top: CatalogItem, bottom: CatalogItem, profile: UserProfile): Outfit {
  return {
    top: { item: top, score: scoreItem(top, profile), fit: fitSize(top, profile.metrics) },
    bottom: { item: bottom, score: scoreItem(bottom, profile), fit: fitSize(bottom, profile.metrics) },
  };
}

export function App() {
  const [screen, setScreen] = useState<AppScreen>({ name: 'intro' });
  const [session, setSession] = useState<Session>(EMPTY_SESSION);
  const retryRef = useRef<() => void>(() => {});

  function fail(message: string, retry: () => void) {
    retryRef.current = retry;
    setScreen({ name: 'error', message });
  }

  function restart() {
    if (session.imageUrl) URL.revokeObjectURL(session.imageUrl);
    void clearCache();
    setSession(EMPTY_SESSION);
    setScreen({ name: 'intro' });
  }

  async function runInitialGeneration(
    top: CatalogItem,
    bottom: CatalogItem,
    height: number,
    weight: number,
    photo: PreppedPhoto,
    pose: PoseTraits | null,
  ) {
    setScreen({ name: 'progress', stage: 'analyzing' });
    try {
      const profile = buildProfile(height, weight, pose);

      setScreen({ name: 'progress', stage: 'selecting' });
      const outfit = buildOutfit(top, bottom, profile);

      setScreen({ name: 'progress', stage: 'generating' });
      const [topBlob, bottomBlob] = await Promise.all([
        fetchImageBlob(top.imagePath),
        fetchImageBlob(bottom.imagePath),
      ]);
      const resultBlob = await requestTryOn({
        person: photo.blob,
        topGarment: topBlob,
        bottomGarment: bottomBlob,
        topDescription: top.detail,
        bottomDescription: bottom.detail,
      });

      const imageUrl = URL.createObjectURL(resultBlob);
      setSession((prev) => ({
        ...prev,
        top,
        bottom,
        height,
        weight,
        photo,
        pose,
        profile,
        outfit,
        imageUrl,
      }));
      setScreen({ name: 'result' });
    } catch (err) {
      fail(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.',
        () => runInitialGeneration(top, bottom, height, weight, photo, pose),
      );
    }
  }

  async function runSwap(slot: 'top' | 'bottom', item: CatalogItem) {
    if (!session.photo || !session.profile || !session.outfit) return;

    const scored = { item, score: scoreItem(item, session.profile), fit: fitSize(item, session.profile.metrics) };
    const nextOutfit: Outfit =
      slot === 'top' ? { ...session.outfit, top: scored } : { ...session.outfit, bottom: scored };

    setSession((prev) => ({ ...prev, regenerating: true }));

    try {
      const personHash = await shortHash(session.photo.blob);
      const cacheKey = `${personHash}:${nextOutfit.top.item.id}:${nextOutfit.bottom.item.id}`;

      let resultBlob = await getCached(cacheKey);
      if (!resultBlob) {
        const [topBlob, bottomBlob] = await Promise.all([
          fetchImageBlob(nextOutfit.top.item.imagePath),
          fetchImageBlob(nextOutfit.bottom.item.imagePath),
        ]);
        resultBlob = await requestTryOn({
          person: session.photo.blob,
          topGarment: topBlob,
          bottomGarment: bottomBlob,
          topDescription: nextOutfit.top.item.detail,
          bottomDescription: nextOutfit.bottom.item.detail,
        });
        await setCached(cacheKey, resultBlob);
      }

      const newUrl = URL.createObjectURL(resultBlob);
      setSession((prev) => {
        if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
        return { ...prev, top: nextOutfit.top.item, bottom: nextOutfit.bottom.item, outfit: nextOutfit, imageUrl: newUrl, regenerating: false };
      });
    } catch (err) {
      setSession((prev) => ({ ...prev, regenerating: false }));
      fail(err instanceof Error ? err.message : '이미지를 다시 만들지 못했어요.', () =>
        runSwap(slot, item),
      );
    }
  }

  switch (screen.name) {
    case 'intro':
      return <Intro onStart={() => setScreen({ name: 'topSelect' })} />;

    case 'topSelect':
      return (
        <GarmentSelect
          key="top"
          step="1 / 4"
          category="top"
          title="상의를 골라주세요"
          subtitle="선택하면 어울리는 다른 상의도 함께 보여드려요"
          onNext={(item) => {
            setSession((prev) => ({ ...prev, top: item }));
            setScreen({ name: 'bottomSelect' });
          }}
        />
      );

    case 'bottomSelect':
      return (
        <GarmentSelect
          key="bottom"
          step="2 / 4"
          category="bottom"
          title="하의를 골라주세요"
          subtitle="선택하면 어울리는 다른 하의도 함께 보여드려요"
          onNext={(item) => {
            setSession((prev) => ({ ...prev, bottom: item }));
            setScreen({ name: 'bodyInput' });
          }}
        />
      );

    case 'bodyInput':
      return (
        <BodyInput
          onNext={(height, weight) => {
            setSession((prev) => ({ ...prev, height, weight }));
            setScreen({ name: 'photoUpload' });
          }}
        />
      );

    case 'photoUpload':
      return (
        <PhotoUpload
          onNext={(photo, pose) => {
            if (!session.top || !session.bottom) return;
            void runInitialGeneration(session.top, session.bottom, session.height, session.weight, photo, pose);
          }}
        />
      );

    case 'progress':
      return <Progress stage={screen.stage} />;

    case 'result':
      if (!session.outfit || !session.imageUrl) {
        return <ErrorScreen message="세션이 만료됐어요." onRetry={restart} onRestart={restart} />;
      }
      return (
        <Result
          imageUrl={session.imageUrl}
          regenerating={session.regenerating}
          outfit={session.outfit}
          onSwap={runSwap}
          onRestart={restart}
        />
      );

    case 'error':
      return (
        <ErrorScreen message={screen.message} onRetry={() => retryRef.current()} onRestart={restart} />
      );
  }
}
