export interface UserProfile {
  uid: string;
  email: string;
  points: number;
  totalEarned: number;
  wishNumber?: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  pointsReward: number;
  videoUrl: string;
}

export interface Game {
  id: string;
  title: string;
  thumbnail: string;
  pointsReward: number;
  gameUrl: string;
  category: string;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  estimatedTime: string;
  questions: number;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  points: number;
  status: 'pending' | 'completed' | 'rejected';
  wishNumber: string;
  timestamp: any;
}
