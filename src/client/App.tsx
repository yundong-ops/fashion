import { useRef, useState } from 'react';
import type { CatalogItem, Outfit, UserProfile } from '../shared/types';
import { CATALOG } from '../shared/catalog';
import { pickOutfit, scoreItem } from '../shared/recommend';
import { fitSize } from '../shared/sizing';
import { analyzeProfile, requestTryOn } from './lib/api';
import { shortHash } from './lib/hash';
import { getCached, setCached, clearCache } from './lib/tryonCache';
import { Intro } from './screens/Intro';
import { BodyInput } from './screens/BodyInput';
import { PhotoUpload, type PhotoSlot, type PreppedPhoto } from './screens/PhotoUpload';
import { Progress, type ProgressStage } from './screens/Progress';
import { Result } from './screens/Result';
import { ErrorScreen } from './screens/ErrorScreen';

type AppScreen =
  | { name: 'intro' }
  | { name: 'bodyInput' }
  | { name: 'photoUpload' }
  | { name: 'progress'; stage: ProgressStage }
  | { name: 'result' }
  | { name: 'error'; message: string };

interface Session {
  height: number;
  weight: number;
  photos: Record<PhotoSlot, PreppedPhoto> | null;
  profile: UserProfile | null;
  outfit: Outfit | null;
  imageUrl: string | null;
  regenerating: boolean;
}

const EMPTY_SESSION: Session = {
  height: 0,
  weight: 0,
  photos: null,
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
    height: number,
    weight: number,
    photos: Record<PhotoSlot, PreppedPhoto>,
  ) {
    setScreen({ name: 'progress', stage: 'analyzing' });
    try {
      const profile = await analyzeProfile(height, weight);

      setScreen({ name: 'progress', stage: 'selecting' });
      const outfit = pickOutfit(CATALOG, profile);
      if (!outfit) {
        fail('추천할 수 있는 옷 조합을 찾지 못했어요.', () =>
          runInitialGeneration(height, weight, photos),
        );
        return;
      }

      setScreen({ name: 'progress', stage: 'generating' });
      const [topBlob, bottomBlob] = await Promise.all([
        fetchImageBlob(outfit.top.item.imagePath),
        fetchImageBlob(outfit.bottom.item.imagePath),
      ]);
      const resultBlob = await requestTryOn({
        person: photos.full.blob,
        face: photos.face.blob,
        top: topBlob,
        bottom: bottomBlob,
        topDescription: outfit.top.item.detail,
        bottomDescription: outfit.bottom.item.detail,
      });

      const imageUrl = URL.createObjectURL(resultBlob);
      setSession((prev) => ({ ...prev, height, weight, photos, profile, outfit, imageUrl }));
      setScreen({ name: 'result' });
    } catch (err) {
      fail(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.',
        () => runInitialGeneration(height, weight, photos),
      );
    }
  }

  async function runSwap(slot: 'top' | 'bottom', item: CatalogItem) {
    if (!session.photos || !session.profile || !session.outfit) return;

    const scored = { item, score: scoreItem(item, session.profile), fit: fitSize(item, session.profile.metrics) };
    const nextOutfit: Outfit =
      slot === 'top' ? { ...session.outfit, top: scored } : { ...session.outfit, bottom: scored };

    setSession((prev) => ({ ...prev, regenerating: true }));

    try {
      const personHash = await shortHash(session.photos.full.blob);
      const cacheKey = `${personHash}:${nextOutfit.top.item.id}:${nextOutfit.bottom.item.id}`;

      let resultBlob = await getCached(cacheKey);
      if (!resultBlob) {
        const [topBlob, bottomBlob] = await Promise.all([
          fetchImageBlob(nextOutfit.top.item.imagePath),
          fetchImageBlob(nextOutfit.bottom.item.imagePath),
        ]);
        resultBlob = await requestTryOn({
          person: session.photos.full.blob,
          face: session.photos.face.blob,
          top: topBlob,
          bottom: bottomBlob,
          topDescription: nextOutfit.top.item.detail,
          bottomDescription: nextOutfit.bottom.item.detail,
        });
        await setCached(cacheKey, resultBlob);
      }

      const newUrl = URL.createObjectURL(resultBlob);
      setSession((prev) => {
        if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
        return { ...prev, outfit: nextOutfit, imageUrl: newUrl, regenerating: false };
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
      return <Intro onStart={() => setScreen({ name: 'bodyInput' })} />;

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
          onNext={(photos) => runInitialGeneration(session.height, session.weight, photos)}
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
          catalog={CATALOG}
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
