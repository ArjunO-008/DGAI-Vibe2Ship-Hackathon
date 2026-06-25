import React, { useState } from 'react';
import type { UserProfile, Goal, Task } from '../types';
import { analyzeGoalAndGeneratePlan, classifyGoalCategory } from '../services/gemini';
import { Compass, Target, Hourglass, Calendar, Briefcase, FileText, ChevronRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile, goals: Goal[], tasks: Task[]) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Step 1: User Profile
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('Student');
  const [customProfession, setCustomProfession] = useState('');
  const [dailyHours, setDailyHours] = useState(2);

  // Step 2: First Goal
  const [goalTitle, setGoalTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [goalNotes, setGoalNotes] = useState('');

  const activeProfession = profession === 'Custom' ? customProfession : profession;

  // Calculate days until deadline
  const getDaysToDeadline = (deadlineStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadlineStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        alert('Please enter your name.');
        return;
      }
      if (profession === 'Custom' && !customProfession.trim()) {
        alert('Please specify your profession.');
        return;
      }
      setStep(2);
    }
  };

  const handleStartAnalysis = async () => {
    if (!goalTitle.trim()) {
      alert('Please enter a goal title.');
      return;
    }
    if (!deadline) {
      alert('Please select a deadline date.');
      return;
    }

    const daysToDeadline = getDaysToDeadline(deadline);
    if (daysToDeadline <= 0) {
      alert('Deadline must be in the future.');
      return;
    }

    setLoading(true);
    setLoadingStatus('Connecting to Gemini AI Engine...');
    
    try {
      const userProfile: UserProfile = {
        name: name.trim(),
        profession: activeProfession,
        dailyHours: Number(dailyHours)
      };

      setLoadingStatus('Analyzing goals, deadliness, available capacity...');
      
      // Perform Gemini Goal Analysis
      const category = classifyGoalCategory(goalTitle.trim(), goalNotes.trim());
      const analysis = await analyzeGoalAndGeneratePlan(
        goalTitle.trim(),
        deadline,
        goalNotes.trim(),
        userProfile,
        daysToDeadline,
        category
      );

      setLoadingStatus('Generating daily schedules and risk reasoning maps...');

      // Build objects
      const goalId = `goal-${Date.now()}`;
      const newGoal: Goal = {
        id: goalId,
        title: goalTitle.trim(),
        deadline,
        dailyHours: Number(dailyHours),
        notes: goalNotes.trim(),
        status: 'active',
        successProbability: analysis.successProbability,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendations: analysis.recommendations,
        biggestRisk: analysis.biggestRisk,
        createdAt: new Date().toISOString().split('T')[0],
        category
      };

      // Map dayOffset to absolute date strings YYYY-MM-DD
      const newTasks: Task[] = analysis.tasks.map((t, idx) => {
        const taskDate = new Date();
        // offset from today. dayOffset is 1-indexed.
        // Day 1 = today or tomorrow. Let's make Day 1 = today.
        taskDate.setDate(taskDate.getDate() + (t.dayOffset - 1));
        const dateStr = taskDate.toISOString().split('T')[0];

        return {
          id: `task-${goalId}-${idx}-${Date.now()}`,
          goalId,
          title: t.title,
          description: t.description,
          scheduledDate: dateStr,
          status: 'pending',
          priority: t.priority,
          milestone: t.milestone
        };
      });

      // Done
      setLoadingStatus('Hydrating plan structures into Local Storage...');
      setTimeout(() => {
        onComplete(userProfile, [newGoal], newTasks);
      }, 1000);

    } catch (error) {
      console.error('Error during onboarding analysis:', error);
      alert('An error occurred during AI analysis. Falling back safely.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-panel-glow" style={{
        width: '100%',
        maxWidth: '650px',
        padding: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Step Indicator Header */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={22} style={{ color: 'var(--accent-color)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Guardian Setup Wizard
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{
                width: '30px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: step >= 1 ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'
              }} />
              <div style={{
                width: '30px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: step >= 2 ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'
              }} />
            </div>
          </div>
        )}

        {/* Loading Spinner View */}
        {loading ? (
          <div className="ai-loader-container">
            <div className="ai-pulse-orb" />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-title)' }}>
              Compiling Execution Agent...
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {loadingStatus}
            </p>
          </div>
        ) : (
          <div>
            {step === 1 ? (
              // Step 1: User Profile Configuration
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontFamily: 'var(--font-title)', fontWeight: 800 }} className="gradient-text">
                    Welcome to Deadline Guardian AI
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    To initialize your personal replanning execution agent, we need to calibrate your professional workload baseline.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Compass size={16} /> Your Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Arjun"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Briefcase size={16} /> Profession
                  </label>
                  <select
                    className="form-select"
                    value={profession}
                    onChange={(e) => {
                      setProfession(e.target.value);
                      if (e.target.value !== 'Custom') {
                        setCustomProfession('');
                      }
                    }}
                  >
                    <option value="Student">Student</option>
                    <option value="Software Developer">Software Developer</option>
                    <option value="Job Seeker">Job Seeker</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Entrepreneur">Entrepreneur</option>
                    <option value="Professional">Professional</option>
                    <option value="Custom">Custom / Other</option>
                  </select>
                </div>

                {profession === 'Custom' && (
                  <div className="form-group">
                    <label className="form-label">Specify Custom Profession</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Researcher, Content Creator"
                      value={customProfession}
                      onChange={(e) => setCustomProfession(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Hourglass size={16} /> Daily Available Study / Work Hours
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={1}
                      style={{ flex: 1, accentColor: 'var(--accent-color)', height: '6px', borderRadius: '3px', cursor: 'pointer' }}
                      value={dailyHours}
                      onChange={(e) => setDailyHours(Number(e.target.value))}
                    />
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'right', fontFamily: 'var(--font-title)' }}>
                      {dailyHours}h
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    This specifies how many hours per day you can commit to this specific goal.
                  </p>
                </div>

                <button onClick={handleNextStep} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Set Profile
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              // Step 2: Initial Goal Setup
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>
                    Establish Your First Goal
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    State your target goal. The AI agent will immediately analyze the workload and estimate your probability of completion.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Target size={16} /> Goal or Target Event
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Hackathon Submission, DBMS Examination"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} /> Target Deadline Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} /> Workload Constraints / Optional Notes
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="e.g. Need to build DBMS schemas first. Notes are highly complex."
                    value={goalNotes}
                    onChange={(e) => setGoalNotes(e.target.value)}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Back
                  </button>
                  <button onClick={handleStartAnalysis} className="btn btn-primary" style={{ flex: 2 }}>
                    Generate AI Plan
                    <Check size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
