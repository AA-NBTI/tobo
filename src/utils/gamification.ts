export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  50,     // Level 2
  150,    // Level 3
  300,    // Level 4
  500,    // Level 5
  800,    // Level 6
  1200,   // Level 7
  1700,   // Level 8
  2500,   // Level 9
  4000,   // Level 10
];

export function getLevelFromPoints(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1; // Level is index + 1
    }
  }
  return 1;
}

export function getPointsForNextLevel(points: number): { currentLevel: number, nextThreshold: number | null, progress: number } {
  const currentLevel = getLevelFromPoints(points);
  
  if (currentLevel >= 10) {
    return { currentLevel: 10, nextThreshold: null, progress: 100 };
  }

  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  
  const pointsInLevel = points - currentThreshold;
  const pointsRequired = nextThreshold - currentThreshold;
  
  const progress = Math.min(100, Math.max(0, (pointsInLevel / pointsRequired) * 100));
  
  return { currentLevel, nextThreshold, progress };
}

// Points Constants
export const POINTS = {
  SIGNUP: 10,
  DAILY_LOGIN: 2,
  CREATE_POST: 5,
  CREATE_COMMENT: 1,
  GIVE_REACTION: 1,
  RECEIVE_REACTION: 2,
  RECEIVE_FOLLOW: 3,
  FOLLOW_BOT: 1
};
