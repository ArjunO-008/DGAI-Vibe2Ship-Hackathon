import type { Goal, Task, UserProfile } from '../types';

// Helper to get formatted dates relative to today
const getRelativeDate = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

export const getDemoStudentData = (): {
  profile: UserProfile;
  goals: Goal[];
  tasks: Task[];
} => {
  const profile: UserProfile = {
    name: 'Arjun',
    profession: 'Student',
    dailyHours: 2
  };

  const goals: Goal[] = [
    {
      id: 'demo-dbms-exam',
      title: 'DBMS Exam Prep',
      deadline: getRelativeDate(4),
      dailyHours: 2,
      notes: 'Need to pass with a grade A. Focus heavily on Normalization and transaction management.',
      status: 'active',
      successProbability: 62,
      riskLevel: 'Medium',
      reasons: [
        'Only 4 days remaining until exam.',
        'Limited study time (2 hours/day).',
        '2 study modules are still unreviewed.'
      ],
      recommendations: [
        'Solve 3 years of past papers immediately.',
        'Dedicate an extra 45 minutes tonight to review DBMS Normalization rules.',
        'Skip optional reading; focus on SQL commands and BCNF concepts.'
      ],
      biggestRisk: 'SQL Join optimization and Normalization questions carry 40% weight.',
      createdAt: getRelativeDate(-2),
      category: 'Exam Preparation'
    },
    {
      id: 'demo-hackathon',
      title: 'Hackathon Submission',
      deadline: getRelativeDate(2),
      dailyHours: 2,
      notes: 'Building Deadline Guardian AI. MVP needs to be ready for presentation.',
      status: 'active',
      successProbability: 45,
      riskLevel: 'High',
      reasons: [
        'Only 2 days remaining.',
        'Gemini integration task was missed yesterday.',
        'Frontend styles need polished alignment.',
        'Illness obstacle reported yesterday reduced work capacity.'
      ],
      recommendations: [
        'Strip out complex charts; use neat HTML cards and simple progress rings.',
        'Implement static JSON fallbacks for Gemini APIs to guarantee demo capability.',
        'Lock the features scope right now. Do not add new pages.'
      ],
      biggestRisk: 'Gemini API token limit or rate errors during live judging presentation.',
      createdAt: getRelativeDate(-3),
      category: 'Hackathon Project'
    }
  ];

  const tasks: Task[] = [
    // DBMS Tasks
    {
      id: 'student-dbms-1',
      goalId: 'demo-dbms-exam',
      title: 'Study Database Normalization (1NF, 2NF, 3NF, BCNF)',
      description: 'Review rules, functional dependencies, and lossy/lossless decompositions.',
      scheduledDate: getRelativeDate(-1),
      status: 'completed',
      priority: 1,
      milestone: 'Database Normalization Mastered'
    },
    {
      id: 'student-dbms-2',
      goalId: 'demo-dbms-exam',
      title: 'Revise SQL Queries & Relational Algebra',
      description: 'Practice nested queries, aggregates, group-by, and relational algebra joins.',
      scheduledDate: getRelativeDate(0), // Today
      status: 'pending',
      priority: 1,
      milestone: null
    },
    {
      id: 'student-dbms-3',
      goalId: 'demo-dbms-exam',
      title: 'Attempt DBMS Past Papers (2024 - 2025)',
      description: 'Complete past papers under 3-hour exam conditions and self-grade.',
      scheduledDate: getRelativeDate(1),
      status: 'pending',
      priority: 2,
      milestone: 'Mock Exam Completed'
    },
    {
      id: 'student-dbms-4',
      goalId: 'demo-dbms-exam',
      title: 'Quick Revision of Transaction & Concurrency Control',
      description: 'Review ACID properties, serializability, and 2-Phase Locking (2PL).',
      scheduledDate: getRelativeDate(2),
      status: 'pending',
      priority: 2,
      milestone: null
    },
    {
      id: 'student-dbms-5',
      goalId: 'demo-dbms-exam',
      title: 'Final Examination',
      description: 'Take the DBMS physical exam at the campus hall.',
      scheduledDate: getRelativeDate(4),
      status: 'pending',
      priority: 1,
      milestone: 'Exam Submitted'
    },

    // Hackathon Tasks
    {
      id: 'student-hack-1',
      goalId: 'demo-hackathon',
      title: 'Design Database Schema & Mock Service',
      description: 'Create the local state storage structures and define mock data payloads.',
      scheduledDate: getRelativeDate(-2),
      status: 'completed',
      priority: 1,
      milestone: 'Data Layer Ready'
    },
    {
      id: 'student-hack-2',
      goalId: 'demo-hackathon',
      title: 'Build Dashboard Layout & Onboarding Wizard',
      description: 'Implement navigation shell and step-by-step user profiling form.',
      scheduledDate: getRelativeDate(-1),
      status: 'completed',
      priority: 2,
      milestone: 'Layout Visuals Completed'
    },
    {
      id: 'student-hack-3',
      goalId: 'demo-hackathon',
      title: 'Integrate Gemini API and Replanning Logic',
      description: 'Hook up generative model calls to fetch schedules and parse JSON outputs.',
      scheduledDate: getRelativeDate(0), // Today
      status: 'missed',
      priority: 1,
      milestone: null
    },
    {
      id: 'student-hack-4',
      goalId: 'demo-hackathon',
      title: 'Assemble Pitch Deck & Record Demo Video',
      description: 'Outline slides (Problem, Solution, Architecture) and screen-record working replanning flow.',
      scheduledDate: getRelativeDate(1),
      status: 'pending',
      priority: 2,
      milestone: 'Pitch Ready'
    },
    {
      id: 'student-hack-5',
      goalId: 'demo-hackathon',
      title: 'Submit Project on Devpost',
      description: 'Write final description, add GitHub repository link, and click Submit.',
      scheduledDate: getRelativeDate(2),
      status: 'pending',
      priority: 1,
      milestone: 'Project Submitted'
    }
  ];

  return { profile, goals, tasks };
};

export const getDemoDeveloperData = (): {
  profile: UserProfile;
  goals: Goal[];
  tasks: Task[];
} => {
  const profile: UserProfile = {
    name: 'Jane',
    profession: 'Software Developer',
    dailyHours: 5
  };

  const goals: Goal[] = [
    {
      id: 'demo-mvp-launch',
      title: 'MVP Launch',
      deadline: getRelativeDate(5),
      dailyHours: 5,
      notes: 'Launch the mobile application MVP on the App Store. Code must compile cleanly.',
      status: 'active',
      successProbability: 80,
      riskLevel: 'Low',
      reasons: [
        'Timeline of 5 days is highly achievable.',
        'High daily available hours (5 hours/day).',
        'All database and design foundations are complete.'
      ],
      recommendations: [
        'Complete final integration testing early.',
        'Review the Apple/Android store deployment requirements to avoid rejection.',
        'Focus on polishing the navigation headers.'
      ],
      biggestRisk: 'App Store review latency could delay launch day past the deadline.',
      createdAt: getRelativeDate(-1),
      category: 'Software Project'
    },
    {
      id: 'demo-client-deadline',
      title: 'Client Deadline',
      deadline: getRelativeDate(3),
      dailyHours: 5,
      notes: 'Hand over completed dashboard with Stripe payments and live webhooks to client.',
      status: 'active',
      successProbability: 55,
      riskLevel: 'Medium',
      reasons: [
        'Tight timeline of 3 days.',
        '2 complex client requests outstanding.',
        'Reported internet outage obstacle вчера caused backlog.'
      ],
      recommendations: [
        'Ask client to defer secondary customization requests to version 1.1.',
        'Use pre-built component layouts for the transactions details panel.'
      ],
      biggestRisk: 'Stripe webhook security validation may fail on client\'s server.',
      createdAt: getRelativeDate(-3),
      category: 'Freelance Deliverable'
    }
  ];

  const tasks: Task[] = [
    // MVP Launch Tasks
    {
      id: 'dev-mvp-1',
      goalId: 'demo-mvp-launch',
      title: 'Configure Environment Variables & Certificates',
      description: 'Set up prod APIs, push secrets to safe vault, and generate signing profiles.',
      scheduledDate: getRelativeDate(-1),
      status: 'completed',
      priority: 1,
      milestone: 'Env Configured'
    },
    {
      id: 'dev-mvp-2',
      goalId: 'demo-mvp-launch',
      title: 'Implement Core Global State Machine',
      description: 'Connect navigation, offline data persistence, and caching mechanisms.',
      scheduledDate: getRelativeDate(0), // Today
      status: 'pending',
      priority: 1,
      milestone: 'State Machine Ready'
    },
    {
      id: 'dev-mvp-3',
      goalId: 'demo-mvp-launch',
      title: 'Write Jest Unit Tests & Validate Forms',
      description: 'Cover auth form validation edge cases and clean up debug console logs.',
      scheduledDate: getRelativeDate(1),
      status: 'pending',
      priority: 2,
      milestone: null
    },
    {
      id: 'dev-mvp-4',
      goalId: 'demo-mvp-launch',
      title: 'Compile Production Native Bundle',
      description: 'Run production compiler command and verify app size optimization.',
      scheduledDate: getRelativeDate(2),
      status: 'pending',
      priority: 2,
      milestone: 'Production Build Finished'
    },
    {
      id: 'dev-mvp-5',
      goalId: 'demo-mvp-launch',
      title: 'Submit App Bundle to Review Console',
      description: 'Complete product info form, upload screenshots, and submit.',
      scheduledDate: getRelativeDate(5),
      status: 'pending',
      priority: 1,
      milestone: 'MVP Submitted'
    },

    // Client Deadline Tasks
    {
      id: 'dev-client-1',
      goalId: 'demo-client-deadline',
      title: 'Integrate Stripe SDK & Webhooks listener',
      description: 'Write webhook endpoint, configure local listener, and verify successful checkout.',
      scheduledDate: getRelativeDate(-2),
      status: 'completed',
      priority: 1,
      milestone: 'Stripe Connected'
    },
    {
      id: 'dev-client-2',
      goalId: 'demo-client-deadline',
      title: 'Fix Chart Visual Lag Bug',
      description: 'Optimize canvas rendering loops and add loading states to graph components.',
      scheduledDate: getRelativeDate(-1),
      status: 'completed',
      priority: 3,
      milestone: null
    },
    {
      id: 'dev-client-3',
      goalId: 'demo-client-deadline',
      title: 'Refactor Dashboard API Endpoint Latency',
      description: 'Add indices to DB collection queries and compress response payload.',
      scheduledDate: getRelativeDate(0), // Today
      status: 'pending',
      priority: 1,
      milestone: null
    },
    {
      id: 'dev-client-4',
      goalId: 'demo-client-deadline',
      title: 'Staging Demo Run-through with Client',
      description: 'Host video call, demo checkout flow, and answer final configuration questions.',
      scheduledDate: getRelativeDate(1),
      status: 'pending',
      priority: 2,
      milestone: 'Demo Approved'
    },
    {
      id: 'dev-client-5',
      goalId: 'demo-client-deadline',
      title: 'Handover Repository and Credentials to Client',
      description: 'Transfer ownership, deploy live credentials, and obtain signed delivery receipt.',
      scheduledDate: getRelativeDate(3),
      status: 'pending',
      priority: 1,
      milestone: 'Handover Completed'
    }
  ];

  return { profile, goals, tasks };
};
