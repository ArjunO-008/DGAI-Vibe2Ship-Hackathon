import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Goal, Task, UserProfile, DailyBrief } from '../types';

// Helper to get the API Key
export const getGeminiApiKey = (): string => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('deadline_guardian_gemini_api_key') || '';
};

export const setGeminiApiKey = (key: string): void => {
  localStorage.setItem('deadline_guardian_gemini_api_key', key);
};

export const hasApiKey = (): boolean => {
  return getGeminiApiKey().trim().length > 0;
};

// Goal Category Classifier
export function classifyGoalCategory(title: string, notes: string): Goal['category'] {
  const t = (title + ' ' + notes).toLowerCase();
  
  if (t.includes('exam') || t.includes('test') || t.includes('study') || t.includes('course') || t.includes('syllabus') || t.includes('revision') || t.includes('quiz') || t.includes('midterm') || t.includes('final') || t.includes('chapter')) {
    return 'Exam Preparation';
  }
  if (t.includes('hackathon') || t.includes('hack') || t.includes('devpost')) {
    return 'Hackathon Project';
  }
  if (t.includes('app') || t.includes('website') || t.includes('system') || t.includes('code') || t.includes('software') || t.includes('develop') || t.includes('crud') || t.includes('programming') || t.includes('java') || t.includes('python') || t.includes('javascript') || t.includes('database') || t.includes('dbms') || t.includes('api') || t.includes('git') || t.includes('implementation') || t.includes('module')) {
    return 'Software Project';
  }
  if (t.includes('interview') || t.includes('leet') || t.includes('algo') || t.includes('hiring') || t.includes('prep')) {
    return 'Interview Preparation';
  }
  if (t.includes('job') || t.includes('resume') || t.includes('apply') || t.includes('application') || t.includes('portfolio') || t.includes('career') || t.includes('linkedin') || t.includes('recruiter')) {
    return 'Job Search';
  }
  if (t.includes('research') || t.includes('paper') || t.includes('thesis') || t.includes('academic') || t.includes('write paper') || t.includes('literature')) {
    return 'Research Project';
  }
  if (t.includes('business') || t.includes('startup') || t.includes('marketing') || t.includes('sales') || t.includes('launch product') || t.includes('customer') || t.includes('pitch')) {
    return 'Business Launch';
  }
  if (t.includes('freelance') || t.includes('client') || t.includes('deliverable') || t.includes('contract') || t.includes('handover')) {
    return 'Freelance Deliverable';
  }
  return 'Generic Goal';
}

// Default fallbacks for malformed API responses
const DEFAULT_ANALYSIS = {
  successProbability: 50,
  riskLevel: 'Medium' as 'Low' | 'Medium' | 'High',
  reasons: ['No automated analysis could be completed.'],
  recommendations: ['Review goal scope and adjust daily hours manually.'],
  biggestRisk: 'Incomplete planning parameters.',
  category: 'Generic Goal' as Goal['category'],
  tasks: [] as Array<{ title: string; description: string; dayOffset: number; priority: number; milestone: string | null }>
};

const DEFAULT_REPLAN = {
  successProbability: 50,
  riskLevel: 'Medium' as 'Low' | 'Medium' | 'High',
  reasons: ['Replanning fell back to default structure due to parsing issues.'],
  recommendations: ['Manually adjust tasks to recover lost time.'],
  biggestRisk: 'Replanning calculation fallback.',
  tasks: [] as Array<{ title: string; description: string; dayOffset: number; priority: number; milestone: string | null }>
};

const DEFAULT_BRIEF: DailyBrief = {
  date: new Date().toISOString().split('T')[0],
  priorities: ['Focus on active tasks.'],
  warnings: ['Keep an eye on upcoming deadlines.'],
  recoverySuggestions: ['Review any pending or missed tasks.'],
  motivationalAdvice: 'Stay consistent. One step at a time.'
};

// Safe JSON parser with validation
function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();
    
    const parsed = JSON.parse(cleaned);
    return { ...fallback, ...parsed };
  } catch (e) {
    console.error('Failed to parse Gemini JSON response. Raw output was:', text, e);
    return fallback;
  }
}

// Service Methods
export async function analyzeGoalAndGeneratePlan(
  title: string,
  deadline: string,
  notes: string,
  profile: UserProfile,
  daysToDeadline: number,
  category: Goal['category']
): Promise<typeof DEFAULT_ANALYSIS> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return simulateGoalAnalysis(title, deadline, notes, profile, daysToDeadline, category);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
You are an AI execution agent analyzing a new goal.
Goal Title: "${title}"
Goal Category: ${category}
Deadline Date: ${deadline} (Days available from today: ${daysToDeadline} days)
Daily Committed Hours: ${profile.dailyHours} hours/day
User Profession: ${profile.profession}
User Notes: "${notes || 'None'}"

First priority: You must plan tasks matching the Goal Title and Notes, NOT just the user's profession. The Goal Category is "${category}". The user's profession (${profile.profession}) is only minor context.
For example, if a Student is building a "Library Management System using Java", do NOT generate student study tasks (like revision or syllabus reading). You MUST generate software project tasks (like database schemas, coding CRUD, testing, deployment).
Conversely, if the category is "Exam Preparation", generate study, revision, and mock exam tasks.

Evaluate if this goal is realistically achievable. Calculate the success probability (0-100) and risk level (Low, Medium, High).
Generate a structured day-by-day task schedule starting from Day 1 up to Day ${daysToDeadline} (which is the deadline day).
Your output must be a single JSON object matching this exact TypeScript structure:
{
  "successProbability": number (0 to 100),
  "riskLevel": "Low" | "Medium" | "High",
  "category": "${category}",
  "reasons": string[], // Explain why the success probability and risk level were set (reasoning layer). Make sure to reference the specific goal "${title}" and its category elements.
  "recommendations": string[], // Practical goal-specific advice to increase probability of success
  "biggestRisk": string, // The single largest blocker or risk factor referencing "${title}"
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "dayOffset": number, // Day index (1 to ${daysToDeadline})
      "priority": number, // 1 to 3
      "milestone": "string" | null
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return safeParseJSON(responseText, { ...DEFAULT_ANALYSIS, category });
  } catch (error) {
    console.error('Gemini analyzeGoalAndGeneratePlan failed:', error);
    return simulateGoalAnalysis(title, deadline, notes, profile, daysToDeadline, category);
  }
}

export async function replanWithObstacle(
  goal: Goal,
  tasks: Task[],
  obstacleType: string,
  obstacleDesc: string,
  profile: UserProfile,
  daysRemaining: number
): Promise<typeof DEFAULT_REPLAN> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return simulateReplanning(goal, tasks, obstacleType, obstacleDesc, profile, daysRemaining);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const missedTasks = tasks.filter(t => t.status === 'missed');

    const prompt = `
You are an AI execution agent. The user is pursuing the goal: "${goal.title}" (Category: "${goal.category}", deadline in ${daysRemaining} days).
They have encountered an obstacle:
Obstacle Category: ${obstacleType}
Description: "${obstacleDesc}"

Current Progress:
- Completed Tasks: ${completedTasks.length}
- Missed Tasks: ${missedTasks.length}
- Pending Tasks: ${pendingTasks.length}
- Remaining Days: ${daysRemaining}
- Daily Committed Hours: ${profile.dailyHours} hours/day

We must replan the scheduled remaining tasks to accommodate this obstacle.
First priority: Your analysis, reasons, and recommendations must be goal-specific and reference "${goal.title}" directly. Do not use generic statements like "Reprioritized pending tasks". Use specific recommendations like: "Drop the book reviews feature to focus on database CRUD validation." or "Skip optional study modules, focus on solving past papers."
Suggest specific scope reductions when timelines compress.
Determine if the goal is still achievable, calculate a new success probability (0-100), reassess the risk level (Low, Medium, High), list the reasons, write recommendations, identify the biggest risk, and generate a revised day-by-day task list starting from Day 1 (today/tomorrow) to Day ${daysRemaining} (the deadline).

Your output must be a single JSON object matching this exact TypeScript structure:
{
  "successProbability": number (0 to 100),
  "riskLevel": "Low" | "Medium" | "High",
  "reasons": string[], // Goal-specific reasons referencing "${goal.title}"
  "recommendations": string[], // Goal-specific recovery recommendations (descope, drop specific features, focus on core CRUD/study)
  "biggestRisk": string, // Biggest threat referencing "${goal.title}"
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "dayOffset": number, // Day index from 1 to ${daysRemaining} (Day 1 represents today/tomorrow replanned)
      "priority": number, // 1 to 3
      "milestone": "string" | null
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return safeParseJSON(responseText, DEFAULT_REPLAN);
  } catch (error) {
    console.error('Gemini replanWithObstacle failed:', error);
    return simulateReplanning(goal, tasks, obstacleType, obstacleDesc, profile, daysRemaining);
  }
}

export async function generateDailyAIWeeklyBrief(
  profile: UserProfile,
  goals: Goal[],
  todaysTasks: Task[],
  recentCompletedCount: number,
  recentMissedCount: number
): Promise<DailyBrief> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return simulateDailyBrief(profile, goals, todaysTasks, recentCompletedCount, recentMissedCount);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const goalsSummary = goals.map(g => `- ${g.title}: Deadline ${g.deadline}, Feasibility ${g.successProbability}%, Risk: ${g.riskLevel}`).join('\n');
    const tasksSummary = todaysTasks.map(t => `- [Priority ${t.priority}] ${t.title}: ${t.description}`).join('\n');

    const prompt = `
You are an AI execution coach. Write a personalized daily brief for:
User: ${profile.name} (Profession: ${profile.profession})
Current Date: ${new Date().toISOString().split('T')[0]}

Active Goals Status:
${goalsSummary || 'No active goals.'}

Today's Scheduled Tasks:
${tasksSummary || 'No tasks scheduled for today.'}

Recent Stats (last 2 days):
- Tasks Completed: ${recentCompletedCount}
- Tasks Missed: ${recentMissedCount}

Generate a daily brief behaving like a personal coach. You MUST reference the actual active goal names (e.g. "${goals.map(g => g.title).join(', ')}") and their current milestones or biggest risks. Highlight the most important task scheduled for today. Focus heavily on warning them if they are falling behind and suggest direct, actionable recovery plans.
Your output must be a single JSON object matching this exact TypeScript structure:
{
  "priorities": string[], // Today's critical focus items (referencing specific tasks and goals)
  "warnings": string[], // Goal-specific warnings (e.g., "DBMS Exam Prep is in 2 days but 3 tasks are pending")
  "recoverySuggestions": string[], // Goal-specific recovery tips
  "motivationalAdvice": string // Personal execution advice customized for the active goals and current risks
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return safeParseJSON(responseText, DEFAULT_BRIEF);
  } catch (error) {
    console.error('Gemini generateDailyAIWeeklyBrief failed:', error);
    return simulateDailyBrief(profile, goals, todaysTasks, recentCompletedCount, recentMissedCount);
  }
}

// Local simulation fallback generators
function simulateGoalAnalysis(
  title: string,
  _deadline: string,
  notes: string,
  profile: UserProfile,
  daysToDeadline: number,
  category: Goal['category']
): typeof DEFAULT_ANALYSIS & { category: Goal['category'] } {
  const hoursPerDay = profile.dailyHours;
  const totalHours = daysToDeadline * hoursPerDay;
  const isComplex = ['Software Project', 'Hackathon Project', 'Business Launch', 'Research Project'].includes(category);
  
  let successProbability = 85;
  if (daysToDeadline <= 3) {
    successProbability = 45;
  } else if (daysToDeadline <= 7) {
    successProbability = 68;
  }
  
  if (isComplex) successProbability -= 10;
  if (hoursPerDay < 2) successProbability -= 15;
  if (notes.toLowerCase().includes('hard') || notes.toLowerCase().includes('difficult')) {
    successProbability -= 10;
  }
  successProbability = Math.max(15, Math.min(95, successProbability));

  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  if (successProbability < 50) {
    riskLevel = 'High';
  } else if (successProbability < 75) {
    riskLevel = 'Medium';
  }

  const reasons: string[] = [
    `Analyzing "${title}" under category "${category}".`,
    `Timeline is ${daysToDeadline} days with total committed capacity of ${totalHours} hours.`
  ];
  
  if (daysToDeadline <= 3) {
    reasons.push(`The deadline for "${title}" is extremely close, risking incomplete deliverables.`);
  }
  if (hoursPerDay < 3) {
    reasons.push(`Available time of ${hoursPerDay} hours/day is limited for a project of this nature.`);
  }

  const recommendations: string[] = [];
  let biggestRisk = '';
  let taskTemplates: Array<{ title: string; description: string; milestone: string | null }> = [];

  switch (category) {
    case 'Software Project':
      taskTemplates = [
        { title: 'Requirements & Design Analysis', description: 'Define core specs and design database schema for ' + title, milestone: 'Specs Documented' },
        { title: 'Database Schema & Server Setup', description: 'Configure schemas and setup local developer workspace for ' + title, milestone: 'Workspace Initialized' },
        { title: 'Core Model & CRUD Development', description: 'Implement database CRUD operations and key controllers', milestone: 'Core CRUD Complete' },
        { title: 'Frontend Views & UI Mockups', description: 'Build responsive templates and link with controller endpoints', milestone: 'UI Framework Integrated' },
        { title: 'Integrations & API Testing', description: 'Connect endpoints and test validation states', milestone: null },
        { title: 'System Validation & Bug Fixing', description: 'Test edge cases, fix styling offsets, and check queries', milestone: 'Core MVP Stable' },
        { title: 'Final Handover Bundle Compilation', description: 'Bundle files and publish code repositories', milestone: 'Project Completed' }
      ];
      biggestRisk = `Database structure mapping or schema conflicts in "${title}".`;
      recommendations.push(`For "${title}", complete Model CRUD operations before building complex visual views.`);
      recommendations.push('Descope advanced analytics modules to protect core CRUD.');
      break;

    case 'Hackathon Project':
      taskTemplates = [
        { title: 'Idea Validation & Boilerplate Setup', description: 'Set up app structures, select assets, and define features', milestone: 'Boilerplate Ready' },
        { title: 'MVP Wireframing & Design Tokens', description: 'Build central components and core routing shell', milestone: null },
        { title: 'Core Functional Flow Coding', description: 'Implement primary user pathways and API mock layers', milestone: 'MVP Core Coded' },
        { title: 'Simulations & Edge Cases Polish', description: 'Refine visual feedback and resolve UI offsets', milestone: null },
        { title: 'Demo Recording & Slide Deck Outline', description: 'Record 3-minute working walkthrough and outline pitch', milestone: 'Pitch Materials Ready' },
        { title: 'Devpost Submission & Final Deploy', description: 'Complete text writeups, link repos, and submit', milestone: 'Hackathon Submitted' }
      ];
      biggestRisk = 'Missing crucial submission deadline due to live demo recording delays.';
      recommendations.push('Use static local mockup data for showcase demo checks.');
      recommendations.push('Do not attempt to write authentication logic; use bypass buttons.');
      break;

    case 'Exam Preparation':
      taskTemplates = [
        { title: 'Syllabus Scan & Materials Compilation', description: 'Scan target modules and download notes/books for ' + title, milestone: 'Syllabus Mapped' },
        { title: 'Study Module 1 & 2: Core Concepts', description: 'Read core textbooks and practice elementary solutions', milestone: null },
        { title: 'Study Module 3 & 4: Complex Scenarios', description: 'Review high-weightage chapters and transaction flows', milestone: 'Chapters Studied' },
        { title: 'Formula Sheet & Summary Writeup', description: 'Compile critical equations and definitions', milestone: null },
        { title: 'Past Papers Practice (3-Year sets)', description: 'Solve previous exams under timed mock conditions', milestone: 'Revision Finished' },
        { title: 'Mock Exam Review & Gap Coverage', description: 'Identify weak scoring topics and study gaps', milestone: null },
        { title: 'Final Revision Checklist', description: 'Review formula sheets and rest before exam', milestone: 'Exam Ready' }
      ];
      biggestRisk = 'Insufficient review time for complex final modules.';
      recommendations.push('Solve past paper questions to understand high-weightage topics.');
      recommendations.push('Review weak subjects for at least 30 minutes every morning.');
      break;

    case 'Job Search':
      taskTemplates = [
        { title: 'Resume & Portfolio Review', description: 'Tailor resume bullets, optimize LinkedIn, and check links', milestone: 'Resume Optimized' },
        { title: 'Target Employer Pipeline List', description: 'Map out 10-15 target companies and identify hiring managers', milestone: null },
        { title: 'Target Applications Submission', description: 'Apply to at least 5 target roles via cold outreach', milestone: 'Initial Applications Sent' },
        { title: 'Recruiter Follow-up & Networking', description: 'Message recruiters and schedule brief chat calls', milestone: null },
        { title: 'Behavioral Stories Preparation', description: 'Structure behavioral answers using STAR technique', milestone: 'Behavioral Deck Complete' },
        { title: 'Interview Pipeline Organization', description: 'Track recruiter replies and set schedule markers', milestone: 'Pipeline Calibrated' }
      ];
      biggestRisk = 'Low recruiter response rates due to generic applications.';
      recommendations.push('Tailor resume bullets specifically for your target jobs.');
      recommendations.push('Reach out directly to hiring teams on LinkedIn rather than cold-applying.');
      break;

    case 'Interview Preparation':
      taskTemplates = [
        { title: 'Baseline assessment & Study Log', description: 'Identify target topics (Algorithms, System Design) for ' + title, milestone: 'Baseline Mapped' },
        { title: 'Core Algorithms Study (Data Structures)', description: 'Practice Arrays, HashMaps, Trees, and LinkedLists', milestone: null },
        { title: 'Advanced Algorithms Study (DP, Graphs)', description: 'Practice recursion, BFS, DFS, and dynamic programming', milestone: 'Algorithms Revise' },
        { title: 'System Design Framework Review', description: 'Practice load balancers, caching, CDN, database indexing', milestone: 'Design Mapped' },
        { title: 'Mock Interview Session (Timed)', description: 'Solve problems live while explaining complexity space/time', milestone: 'Mocks Completed' },
        { title: 'Final Cheat Sheet Review', description: 'Review high-level algorithmic templates and complexity sheets', milestone: 'Ready for Interview' }
      ];
      biggestRisk = 'Struggling with timed live coding questions.';
      recommendations.push('Practice explaining your algorithm out loud before writing code.');
      recommendations.push('Review Big-O space and time complexities for all standard structures.');
      break;

    case 'Research Project':
      taskTemplates = [
        { title: 'Topic Selection & Abstract Outline', description: 'Define research questions and sketch outline for ' + title, milestone: 'Abstract Outlined' },
        { title: 'Literature Review & Source gathering', description: 'Read and catalog at least 10 academic papers', milestone: 'Literature Mapped' },
        { title: 'Data Gathering & Analysis Phase', description: 'Assemble raw datasets and run model test checks', milestone: 'Data Collected' },
        { title: 'Drafting: Methodology & Core Body', description: 'Write core text sections outlining methodologies', milestone: null },
        { title: 'Drafting: Results & Conclusion', description: 'Write findings text and draw diagrams', milestone: 'Draft Completed' },
        { title: 'Proofreading & Bibliographic check', description: 'Review citations (APA/MLA) and fix styling anomalies', milestone: 'Paper Finalized' }
      ];
      biggestRisk = 'Inconsistent formatting or incorrect bibliography references.';
      recommendations.push('Structure your paper draft section-by-section to remain organized.');
      break;

    case 'Business Launch':
      taskTemplates = [
        { title: 'Market Research & Product outline', description: 'Identify target customers and define value proposition', milestone: 'Product Defined' },
        { title: 'Landing Page & Brand Identity setup', description: 'Set up basic website and lead collection forms', milestone: 'Landing Page Live' },
        { title: 'Pricing & Merchant Integration', description: 'Configure payment processor links and product options', milestone: null },
        { title: 'Outreach & Marketing Campaign launch', description: 'Create social copy ads and publish promo emails', milestone: 'Campaign Launched' },
        { title: 'Lead Qualification & Customer Sync', description: 'Compile first batch of customer feedback metrics', milestone: null },
        { title: 'Live Release Event & Promotion', description: 'Launch to public directories and announce on channels', milestone: 'Business Launched' }
      ];
      biggestRisk = 'High acquisition cost or lack of initial traffic.';
      recommendations.push('Launch landing page early to collect user emails before coding.');
      break;

    case 'Freelance Deliverable':
      taskTemplates = [
        { title: 'Client Brief & Scope checklist', description: 'Define deliverables and lock milestones with client', milestone: 'Scope Confirmed' },
        { title: 'Initial Design & Asset collection', description: 'Design wireframes and get asset assets from client', milestone: null },
        { title: 'Core Functionality Draft v1', description: 'Develop first working build of deliverables', milestone: 'Draft v1 Delivered' },
        { title: 'Client Feedback session', description: 'Host call to review build and gather requested edits', milestone: null },
        { title: 'Polishing & Final QA session', description: 'Incorporate edits, optimize code, and test endpoints', milestone: 'QA Stable' },
        { title: 'Project Handover & Sign-off', description: 'Deliver files, transfer repos, and request final payout', milestone: 'Handover Completed' }
      ];
      biggestRisk = 'Scope creep delaying the final handover sign-off.';
      recommendations.push('Document exactly what is in scope to prevent client additions.');
      break;

    default:
      taskTemplates = [
        { title: 'Project Research & Kickoff', description: 'Define parameters and outline target outcomes for ' + title, milestone: 'Kickoff Complete' },
        { title: 'Core Execution Phase: Task 1', description: 'Begin implementation of main requirements', milestone: null },
        { title: 'Core Execution Phase: Task 2', description: 'Advance implementation details and review notes', milestone: 'Midpoint Reached' },
        { title: 'Polishing & Validation checks', description: 'Review output criteria and resolve bugs', milestone: null },
        { title: 'Final Handover / Submission', description: 'Complete final checks and submit deliverable', milestone: 'Goal Accomplished' }
      ];
      biggestRisk = 'Lack of structured daily execution steps.';
      recommendations.push('Block off daily hours specifically for this goal execution.');
  }

  // Map task templates to daysToDeadline days
  const tasks = [];
  const totalTemplates = taskTemplates.length;

  for (let i = 1; i <= daysToDeadline; i++) {
    const percentThrough = (i - 1) / Math.max(1, daysToDeadline - 1);
    const templateIndex = Math.min(totalTemplates - 1, Math.floor(percentThrough * totalTemplates));
    const template = taskTemplates[templateIndex];

    let tTitle = template.title;
    let tDesc = template.description;
    let tMilestone = template.milestone;

    if (daysToDeadline > totalTemplates) {
      const prevPercent = (i - 2) / Math.max(1, daysToDeadline - 1);
      const prevIndex = i > 1 ? Math.min(totalTemplates - 1, Math.floor(prevPercent * totalTemplates)) : -1;
      if (prevIndex === templateIndex) {
        tTitle = `${template.title} - Session ${i - templateIndex}`;
        tDesc = `${template.description} (Continued phase ${i - templateIndex})`;
        tMilestone = null;
      }
    }

    tasks.push({
      title: tTitle,
      description: tDesc,
      dayOffset: i,
      priority: templateIndex === 0 || templateIndex === totalTemplates - 1 ? 1 : 2,
      milestone: tMilestone
    });
  }

  return {
    successProbability,
    riskLevel,
    reasons,
    recommendations,
    biggestRisk,
    category,
    tasks
  };
}

function simulateReplanning(
  goal: Goal,
  tasks: Task[],
  obstacleType: string,
  obstacleDesc: string,
  _profile: UserProfile,
  daysRemaining: number
): typeof DEFAULT_REPLAN {
  const category = goal.category;
  
  // Calculate success probability based on obstacle and remaining days
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const missedTasks = tasks.filter(t => t.status === 'missed');
  
  let successProbability = Math.max(10, goal.successProbability - 20);
  if (obstacleType === 'Illness' || obstacleType === 'Personal Emergency') {
    successProbability = Math.max(10, successProbability - 10);
  }
  if (missedTasks.length > 0) {
    successProbability = Math.max(10, successProbability - (missedTasks.length * 5));
  }
  successProbability = Math.max(10, Math.min(90, successProbability));

  let riskLevel: 'Low' | 'Medium' | 'High' = 'High';
  if (successProbability > 70) {
    riskLevel = 'Low';
  } else if (successProbability > 50) {
    riskLevel = 'Medium';
  }

  const reasons = [
    `Obstacle reported: ${obstacleType} (${obstacleDesc}).`,
    `Timeline for "${goal.title}" is compressed to ${daysRemaining} remaining days.`,
    `Target completion probability adjusted to ${successProbability}% due to lost work capacity.`
  ];
  
  const recommendations: string[] = [];
  let biggestRisk = `Lost capacity from "${obstacleType}" causes missed final deadlines for "${goal.title}".`;

  // Goal category-specific descope recommendations
  switch (category) {
    case 'Software Project':
      reasons.push(`"${goal.title}" development and verification cycles are truncated.`);
      recommendations.push(`For "${goal.title}", drop advanced analytics and reporting features. Focus strictly on CRUD controllers.`);
      recommendations.push('Delay unit tests writing; prioritize manual checklist verification.');
      biggestRisk = `Cannot stabilize API endpoints for "${goal.title}" on time.`;
      break;

    case 'Hackathon Project':
      reasons.push(`"${goal.title}" submission window is closing, leaving insufficient time for final video recording.`);
      recommendations.push(`For "${goal.title}", skip user login/registration setup entirely. Use static bypass flags.`);
      recommendations.push('Prioritize recording the working video using local mocks over publishing production packages.');
      biggestRisk = `Failing to submit "${goal.title}" on Devpost before the buzzer.`;
      break;

    case 'Exam Preparation':
      reasons.push(`Study blocks for "${goal.title}" are disrupted, compression risks module coverage.`);
      recommendations.push(`For "${goal.title}", skip optional auxiliary notes. Focus strictly on solving previous years' questions.`);
      recommendations.push('Do active-recall flashcards of formulas rather than re-reading text chapters.');
      biggestRisk = `Underprepared for high-weightage topics in "${goal.title}" exam.`;
      break;

    case 'Job Search':
      reasons.push('Application outreach sequence has lagged.');
      recommendations.push('Reduce cold applications; focus strictly on messaging warm LinkedIn connections.');
      break;

    default:
      recommendations.push(`For "${goal.title}", prioritize core MVP items and descope optional elements.`);
      recommendations.push('Incur a 30-minute study extension tonight to recover progress.');
  }

  const tasksToReschedule = pendingTasks.map((t, idx) => {
    const dayOffset = Math.min(daysRemaining, Math.floor(idx / 2) + 1);
    return {
      title: `[REPLANNED] ${t.title.replace('[REPLANNED] ', '')}`,
      description: `${t.description} (Rescheduled due to ${obstacleType})`,
      dayOffset,
      priority: Math.max(1, t.priority - 1),
      milestone: t.milestone
    };
  });

  return {
    successProbability,
    riskLevel,
    reasons,
    recommendations,
    biggestRisk,
    tasks: tasksToReschedule
  };
}

function simulateDailyBrief(
  profile: UserProfile,
  goals: Goal[],
  todaysTasks: Task[],
  _recentCompletedCount: number,
  recentMissedCount: number
): DailyBrief {
  const priorities: string[] = [];
  const warnings: string[] = [];
  const recoverySuggestions: string[] = [];

  if (todaysTasks.length > 0) {
    todaysTasks.slice(0, 2).forEach(t => {
      const g = goals.find(goal => goal.id === t.goalId);
      const goalPrefix = g ? `[${g.title}] ` : '';
      priorities.push(`${goalPrefix}${t.title}`);
    });
  } else {
    priorities.push('Review pending target schedules in your dashboard.');
  }

  goals.forEach(g => {
    if (g.riskLevel === 'High') {
      warnings.push(`Goal "${g.title}" is in HIGH RISK status (${g.successProbability}% success probability). Biggest risk: ${g.biggestRisk}`);
      recoverySuggestions.push(`For "${g.title}", implement immediate descope: ${g.recommendations[0] || 'Focus on MVP.'}`);
    } else if (g.riskLevel === 'Medium') {
      warnings.push(`Goal "${g.title}" has moderate warnings. Feasibility is at ${g.successProbability}%.`);
    }
  });

  if (recentMissedCount > 0) {
    warnings.push(`You missed ${recentMissedCount} task sessions recently, compressing deadlines.`);
    recoverySuggestions.push('Add an extra 45-minute recovery block today to prevent calendar slippage.');
  }

  if (recoverySuggestions.length === 0) {
    recoverySuggestions.push('Baseline execution looks good. Proceed with today\'s schedule items.');
  }

  let motivationalAdvice = `Focus Arjun. Direct execution beats passive learning. Set a Pomodoro timer.`;
  if (profile.name) {
    const isStudent = profile.profession.toLowerCase().includes('stud');
    if (isStudent) {
      motivationalAdvice = `Keep going, ${profile.name}! Protect your study milestones. Active recall is 10x more effective than highlighting.`;
    } else {
      motivationalAdvice = `Stay focused, ${profile.name}! Build a working MVP skeleton first, then iterate. Perfect is the enemy of shipped.`;
    }
  }

  return {
    date: new Date().toISOString().split('T')[0],
    priorities,
    warnings,
    recoverySuggestions,
    motivationalAdvice
  };
}
