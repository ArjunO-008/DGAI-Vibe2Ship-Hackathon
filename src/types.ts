export interface UserProfile {
  name: string;
  profession: string;
  dailyHours: number;
}

export interface Goal {
  id: string;
  title: string;
  deadline: string;
  dailyHours: number;
  notes: string;
  status: 'active' | 'completed' | 'abandoned';
  successProbability: number; // 0 to 100
  riskLevel: 'Low' | 'Medium' | 'High';
  reasons: string[];
  recommendations: string[];
  biggestRisk: string;
  createdAt: string;
  category: 'Exam Preparation' | 'Software Project' | 'Hackathon Project' | 'Job Search' | 'Interview Preparation' | 'Research Project' | 'Business Launch' | 'Freelance Deliverable' | 'Generic Goal';
}

export interface Task {
  id: string;
  goalId: string;
  title: string;
  description: string;
  scheduledDate: string; // YYYY-MM-DD
  status: 'pending' | 'completed' | 'missed';
  priority: number;
  milestone: string | null;
}

export interface ObstacleLog {
  id: string;
  goalId: string;
  type: 'Illness' | 'Family Event' | 'Extra Work' | 'Unexpected Assignment' | 'Personal Emergency' | 'Custom Obstacle';
  description: string;
  reportedAt: string; // ISO String
}

export interface DailyBrief {
  date: string; // YYYY-MM-DD
  priorities: string[];
  warnings: string[];
  recoverySuggestions: string[];
  motivationalAdvice: string;
}
