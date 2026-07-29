import type { BmiClass, PoseTraits, UserProfile } from '../../shared/types';

function classifyBmi(bmi: number): BmiClass {
  if (bmi < 18.5) return '저체중';
  if (bmi < 23) return '표준';
  if (bmi < 25) return '과체중';
  return '비만';
}

/** 키/몸무게 산술 지표 + (선택) MoveNet 포즈 트레이트로 프로필을 만든다. 네트워크 호출 없음. */
export function buildProfile(heightCm: number, weightKg: number, pose: PoseTraits | null): UserProfile {
  const bmi = weightKg / (heightCm / 100) ** 2;

  return {
    metrics: {
      heightCm,
      weightKg,
      bmi: Math.round(bmi * 10) / 10,
      bmiClass: classifyBmi(bmi),
      est어깨너비: Math.round((0.245 * heightCm + 0.3 * (bmi - 22)) * 10) / 10,
      est가슴둘레: Math.round((0.5 * heightCm + 1.85 * (bmi - 22)) * 10) / 10,
      est허리둘레: Math.round((0.42 * heightCm + 2.3 * (bmi - 22)) * 10) / 10,
      est엉덩이둘레: Math.round((0.52 * heightCm + 1.4 * (bmi - 22)) * 10) / 10,
      est허벅지둘레: Math.round((0.3 * heightCm + 1.1 * (bmi - 22)) * 10) / 10,
      estInseam: Math.round(0.45 * heightCm * 10) / 10,
    },
    pose,
    createdAt: Date.now(),
  };
}
