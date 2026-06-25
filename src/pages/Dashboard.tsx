import React, { useState, useEffect } from 'react';
import type { UserProfile, Goal, Task, DailyBrief } from '../types';
import { generateDailyAIWeeklyBrief, analyzeGoalAndGeneratePlan, classifyGoalCategory } from '../services/gemini';
import { Plus, Target, CheckSquare, AlertTriangle, Lightbulb, Sparkles, TrendingUp, Calendar, ChevronRight, Check, X, Loader } from 'lucide-react';

interface DashboardProps {
  profile: UserProfile;
  goals: Goal[];
  tasks: Task[];
  onSelectGoal: (goalId: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'pending' | 'completed' | 'missed') => void;
  onCreateGoal: (goal: Goal, tasks: Task[]) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  goals,
  tasks,
  onSelectGoal,
  onUpdateTaskStatus,
  onCreateGoal
}) => {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalNotes, setNewGoalNotes] = useState('');

  // Fetch / Generate Daily Brief on load or when task statuses change
  useEffect(() => {
    const fetchBrief = async () => {
      setLoadingBrief(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Find tasks scheduled for today
        const todaysTasks = tasks.filter(t => t.scheduledDate === todayStr);

        // Find recent completion stats (last 2 days)
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
        
        const recentTasks = tasks.filter(t => t.scheduledDate >= twoDaysAgoStr && t.scheduledDate < todayStr);
        const recentCompleted = recentTasks.filter(t => t.status === 'completed').length;
        const recentMissed = recentTasks.filter(t => t.status === 'missed').length;

        const aiBrief = await generateDailyAIWeeklyBrief(
          profile,
          goals.filter(g => g.status === 'active'),
          todaysTasks,
          recentCompleted,
          recentMissed
        );
        setBrief(aiBrief);
      } catch (err) {
        console.error('Failed to generate AI brief:', err);
      } finally {
        setLoadingBrief(false);
      }
    };

    if (goals.length > 0) {
      fetchBrief();
    }
  }, [profile, goals, tasks]);

  // Date handlers
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter(t => t.scheduledDate === todayStr);

  const getGoalProgress = (goalId: string) => {
    const goalTasks = tasks.filter(t => t.goalId === goalId);
    if (goalTasks.length === 0) return 0;
    const completed = goalTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / goalTasks.length) * 100);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalDeadline) return;

    // Calculate days to deadline
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(newGoalDeadline);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    const daysToDeadline = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    setCreatingGoal(true);
    try {
      const category = classifyGoalCategory(newGoalTitle.trim(), newGoalNotes.trim());
      const analysis = await analyzeGoalAndGeneratePlan(
        newGoalTitle.trim(),
        newGoalDeadline,
        newGoalNotes.trim(),
        profile,
        daysToDeadline,
        category
      );

      const goalId = `goal-${Date.now()}`;
      const newGoal: Goal = {
        id: goalId,
        title: newGoalTitle.trim(),
        deadline: newGoalDeadline,
        dailyHours: profile.dailyHours,
        notes: newGoalNotes.trim(),
        status: 'active',
        successProbability: analysis.successProbability,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendations: analysis.recommendations,
        biggestRisk: analysis.biggestRisk,
        createdAt: new Date().toISOString().split('T')[0],
        category
      };

      const newTasks: Task[] = analysis.tasks.map((t, idx) => {
        const taskDate = new Date();
        taskDate.setDate(taskDate.getDate() + (t.dayOffset - 1));
        return {
          id: `task-${goalId}-${idx}-${Date.now()}`,
          goalId,
          title: t.title,
          description: t.description,
          scheduledDate: taskDate.toISOString().split('T')[0],
          status: 'pending',
          priority: t.priority,
          milestone: t.milestone
        };
      });

      await onCreateGoal(newGoal, newTasks);
      
      // Reset form
      setNewGoalTitle('');
      setNewGoalDeadline('');
      setNewGoalNotes('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to analyze new goal.');
    } finally {
      setCreatingGoal(false);
    }
  };

  // Reusable radial progress component
  const RadialProgress: React.FC<{ percent: number; size?: number; risk?: 'Low' | 'Medium' | 'High' }> = ({ percent, size = 60, risk = 'Low' }) => {
    const radius = 24;
    const circ = 2 * Math.PI * radius;
    const strokePct = ((100 - percent) * circ) / 100;
    
    let color = 'var(--risk-low)';
    if (risk === 'Medium') color = 'var(--risk-medium)';
    if (risk === 'High') color = 'var(--risk-high)';

    return (
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          <circle r={radius} cx={size/2} cy={size/2} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="5" />
          <circle
            r={radius}
            cx={size/2}
            cy={size/2}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circ}
            strokeDashoffset={strokePct}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <span style={{ position: 'absolute', fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '0.85rem' }}>
          {percent}%
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Greeting and Overview Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={14} /> AI Guardian Active
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-title)', marginTop: '0.25rem' }}>
            Systems Panel: Good Day, {profile.name}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Calibration baseline: <strong>{profile.profession}</strong> working <strong>{profile.dailyHours}h/day</strong>.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={18} />
          Create Execution Goal
        </button>
      </div>

      {/* Daily AI Brief (Highlighted) */}
      <div className="glass-panel-glow daily-brief-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-color)' }} />
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)' }}>Guardian AI Strategic Briefing</h3>
          </div>
          {loadingBrief && <Loader size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-color)' }} />}
        </div>

        {brief ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TODAY'S STRATEGIC FOCUS</h4>
                <div className="brief-priorities">
                  {brief.priorities.map((p, i) => (
                    <div key={i} className="brief-priority-item">
                      <span style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{i + 1}</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>{p}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {brief.warnings.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--risk-medium)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={15} /> System Warnings
                    </h4>
                    <ul className="brief-warnings-list">
                      {brief.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {brief.recoverySuggestions.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--risk-low)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <TrendingUp size={15} /> Recovery Recommendations
                    </h4>
                    <ul className="brief-recovery-list">
                      {brief.recoverySuggestions.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <Lightbulb size={18} style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                "{brief.motivationalAdvice}"
              </p>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Calibrating strategic parameters...</p>
        )}
      </div>

      {/* Main Grid: Today's Tasks + Active Goals */}
      <div className="dashboard-grid">
        
        {/* Left Side: Today's Schedule */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)' }}>Today's Tasks & Execution Items</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {todaysTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Calendar size={32} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.05)' }} />
              <p style={{ fontSize: '0.95rem' }}>No execution items scheduled for today.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Create a goal or report an obstacle to generate a schedule.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {todaysTasks.map(task => {
                const goal = goals.find(g => g.id === task.goalId);
                return (
                  <div key={task.id} className="task-item">
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        title="Mark Completed"
                        onClick={() => onUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        className={`task-checkbox-container ${task.status === 'completed' ? 'completed' : ''}`}
                      >
                        {task.status === 'completed' && <Check size={12} strokeWidth={3} />}
                      </button>
                      <button
                        title="Mark Missed"
                        onClick={() => onUpdateTaskStatus(task.id, task.status === 'missed' ? 'pending' : 'missed')}
                        className={`task-checkbox-container ${task.status === 'missed' ? 'missed' : ''}`}
                        style={{ borderStyle: 'dotted' }}
                      >
                        {task.status === 'missed' && <X size={12} strokeWidth={3} />}
                      </button>
                    </div>

                    <div className="task-info">
                      <p className={`task-title ${task.status === 'completed' ? 'completed' : ''} ${task.status === 'missed' ? 'missed' : ''}`}>
                        {task.title}
                      </p>
                      <p className="task-desc">{task.description}</p>
                      
                      <div className="task-meta">
                        {goal && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: '600', textTransform: 'uppercase' }}>
                            {goal.title}
                          </span>
                        )}
                        {task.milestone && (
                          <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Sparkles size={11} /> {task.milestone}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                          P{task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Active Goals Monitor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} style={{ color: 'var(--accent-color)' }} />
              Active Goals Monitor
            </h3>

            {goals.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem' }}>
                No active execution goals. Setup a goal to begin monitoring.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {goals.map(goal => {
                  const progress = getGoalProgress(goal.id);
                  let riskBadgeClass = 'badge-risk-low';
                  if (goal.riskLevel === 'Medium') riskBadgeClass = 'badge-risk-medium';
                  if (goal.riskLevel === 'High') riskBadgeClass = 'badge-risk-high';

                  return (
                    <div
                      key={goal.id}
                      onClick={() => onSelectGoal(goal.id)}
                      className="glass-panel goal-card"
                      style={{ border: '1px solid var(--border-color)' }}
                    >
                      <div className="goal-card-header">
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: '600', fontFamily: 'var(--font-title)' }}>
                            {goal.title}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Deadline: {goal.deadline}
                          </span>
                        </div>
                        <span className={`badge ${riskBadgeClass}`}>
                          {goal.riskLevel} Risk
                        </span>
                      </div>

                      <div className="goal-card-body">
                        <div className="goal-card-meta">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Success Probability:
                          </span>
                          <span style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'var(--font-title)', color: goal.successProbability > 70 ? 'var(--risk-low)' : goal.successProbability > 50 ? 'var(--risk-medium)' : 'var(--risk-high)' }}>
                            {goal.successProbability}% Achievable
                          </span>
                          
                          {/* Mini Progress bar */}
                          <div style={{ width: '120px', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '0.25rem', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {progress}% tasks completed
                          </span>
                        </div>

                        <RadialProgress percent={goal.successProbability} size={50} risk={goal.riskLevel} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-glow">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-color)' }} />
                New AI Calibrated Goal
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost btn-icon-only">
                <X size={18} />
              </button>
            </div>

            {creatingGoal ? (
              <div className="ai-loader-container">
                <div className="ai-pulse-orb" />
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>
                  Analyzing Goal Feasibility...
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Gemini is estimating effort hours and building a structured schedule baseline.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateGoal}>
                <div className="form-group">
                  <label className="form-label">Goal Title / Milestone Target</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Launch Marketing Site"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Technical Parameters (Optional)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="e.g. Focus on UI details, descope secondary features, lock mock assets."
                    value={newGoalNotes}
                    onChange={(e) => setNewGoalNotes(e.target.value)}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>
                    Initialize Plan
                    <ChevronRight size={18} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
