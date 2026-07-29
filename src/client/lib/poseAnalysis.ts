import type { PoseTraits } from '../../shared/types';
import type * as PoseDetectionNS from '@tensorflow-models/pose-detection';

// tfjs + pose-detection은 ~2MB라 초기 번들에 넣지 않고, 사진 업로드 단계에서만 동적 로드한다.
let detectorPromise: Promise<PoseDetectionNS.PoseDetector> | null = null;

function getDetector() {
  if (!detectorPromise) {
    detectorPromise = Promise.all([
      import('@tensorflow/tfjs-core'),
      import('@tensorflow/tfjs-backend-webgl'),
      import('@tensorflow-models/pose-detection'),
    ]).then(([tf, , poseDetection]) =>
      tf
        .setBackend('webgl')
        .then(() => tf.ready())
        .then(() =>
          poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }),
        ),
    );
  }
  return detectorPromise;
}

const MIN_KEYPOINT_SCORE = 0.3;

function dist(a: PoseDetectionNS.Keypoint, b: PoseDetectionNS.Keypoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 전신 사진 한 장에서 MoveNet 키포인트를 뽑아 어깨/골반/다리 비율을 근사한다.
 * 의료용 정확도가 아니라 사이즈 추천을 위한 참고값이며, 자세·카메라 각도에
 * 따라 오차가 클 수 있다. 키포인트 신뢰도가 낮으면 null을 반환해 BMI만으로
 * 폴백하게 한다.
 */
export async function analyzePose(image: HTMLImageElement): Promise<PoseTraits | null> {
  const detector = await getDetector();
  const poses = await detector.estimatePoses(image);
  const keypoints = poses[0]?.keypoints;
  if (!keypoints) return null;

  const byName = new Map(keypoints.map((k) => [k.name, k]));
  const leftShoulder = byName.get('left_shoulder');
  const rightShoulder = byName.get('right_shoulder');
  const leftHip = byName.get('left_hip');
  const rightHip = byName.get('right_hip');
  const leftAnkle = byName.get('left_ankle');
  const rightAnkle = byName.get('right_ankle');

  const required = [leftShoulder, rightShoulder, leftHip, rightHip, leftAnkle, rightAnkle];
  if (required.some((k) => !k || (k.score ?? 0) < MIN_KEYPOINT_SCORE)) {
    return null;
  }

  const shoulderWidth = dist(leftShoulder!, rightShoulder!);
  const hipWidth = dist(leftHip!, rightHip!);
  const hipMidY = (leftHip!.y + rightHip!.y) / 2;
  const shoulderMidY = (leftShoulder!.y + rightShoulder!.y) / 2;
  const ankleMidY = (leftAnkle!.y + rightAnkle!.y) / 2;

  const torsoLength = hipMidY - shoulderMidY;
  const legLength = ankleMidY - hipMidY;

  const shoulderHipRatio = shoulderWidth / hipWidth;
  const torsoLegRatio = torsoLength / legLength;

  const shoulderVsHip: PoseTraits['shoulderVsHip'] =
    shoulderHipRatio > 1.08 ? 'shoulder-wider' : shoulderHipRatio < 0.93 ? 'hip-wider' : 'balanced';

  const torsoToLegRatio: PoseTraits['torsoToLegRatio'] =
    torsoLegRatio > 0.95 ? 'long-torso' : torsoLegRatio < 0.75 ? 'long-legs' : 'balanced';

  const confidence =
    required.reduce((sum, k) => sum + (k!.score ?? 0), 0) / required.length;

  return { shoulderVsHip, torsoToLegRatio, confidence };
}

export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
