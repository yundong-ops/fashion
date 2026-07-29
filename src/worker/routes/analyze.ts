import { Hono } from 'hono';
import type { BmiClass, UserProfile } from '../../shared/types';

export const analyzeRoute = new Hono<{ Bindings: Env }>();

function classifyBmi(bmi: number): BmiClass {
  if (bmi < 18.5) return '저체중';
  if (bmi < 23) return '표준';
  if (bmi < 25) return '과체중';
  return '비만';
}

/**
 * 마일스톤1: 키/몸무게로 산술 지표만 계산하고, 비전 특성은 고정값을 반환한다.
 * 실제 Gemini 비전 호출은 마일스톤4에서 이 자리를 대체한다.
 */
analyzeRoute.post('/', async (c) => {
  const form = await c.req.formData();
  const heightCm = Number(form.get('height'));
  const weightKg = Number(form.get('weight'));

  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return c.json({ error: 'invalid height or weight' }, 400);
  }

  const bmi = weightKg / (heightCm / 100) ** 2;

  const profile: UserProfile = {
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
    traits: {
      bodyType: '스트레이트',
      shoulderVsHip: 'balanced',
      torsoToLegRatio: 'balanced',
      personalColor: '중성톤',
      faceShape: '계란형',
      shoulderSlope: 'straight',
      neckLength: 'average',
      confidence: 0,
    },
    degraded: true,
    createdAt: Date.now(),
  };

  return c.json(profile);
});
