import React, { useState } from 'react';
import type { Goal, Task, UserProfile } from '../types';
import { replanWithObstacle } from '../services/gemini';
import { ArrowLeft, Sparkles, AlertOctagon, RefreshCw, X, ShieldAlert, HeartPulse, ShieldEllipsis, Users, Briefcase, FileCode2, Info, Check } from 'lucide-react';

interface GoalDetailProps {
  goal: Goal;
  tasks: Task[];
  profile: UserProfile;
  onBack: () => void;
  onUpdateTaskStatus: (taskId: string, status: 'pending' | 'completed' | 'missed') => void;
  onReplanGoal: (goalId: string, updatedGoalFields: Partial<Goal>, updatedTasks: Task[]) => void;
}

export const GoalDetail: React.FC<GoalDetailProps> = ({
  goal,
  tasks,
  profile,
  onBack,
  onUpdateTaskStatus,
  onReplanGoal
}) => {
  const [replanning, setReplanning] = useState(false);
  const [replanningStatus, setReplanningStatus] = useState('');
  const [showObstacleModal, setShowObstacleModal] = useState(false);
  const [obstacleType, setObstacleType] = useState('Illness');
  const [obstacleDesc, setObstacleDesc] = useState('');

  // Group tasks by scheduled date
  const goalTasks = [...tasks].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  
  const tasksByDate = goalTasks.reduce((acc, task) => {
    if (!acc[task.scheduledDate]) {
      acc[task.scheduledDate] = [];
    }
    acc[task.scheduledDate].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Stats
  const totalTasks = goalTasks.length;
  const completedTasks = goalTasks.filter(t => t.status === 'completed').length;
  const missedTasks = goalTasks.filter(t => t.status === 'missed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Replan triggered by obstacle reporting
  const handleReportObstacle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obstacleDesc.trim()) return;

    setReplanning(true);
    setReplanningStatus(`Initializing replanning schema...`);
    setShowObstacleModal(false);

    // Calculate remaining days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(goal.deadline);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    try {
      setReplanningStatus(`Gemini is re-evaluating risk matrices based on "${obstacleType}"...`);
      
      const analysis = await replanWithObstacle(
        goal,
        goalTasks,
        obstacleType,
        obstacleDesc.trim(),
        profile,
        daysRemaining
      );

      setReplanningStatus('Compiling adjusted work schedule baseline...');

      const updatedGoalFields: Partial<Goal> = {
        successProbability: analysis.successProbability,
        riskLevel: analysis.riskLevel,
        reasons: analysis.reasons,
        recommendations: analysis.recommendations,
        biggestRisk: analysis.biggestRisk
      };

      // Map new/adjusted tasks. We want to update pending tasks.
      // We will keep completed and missed tasks as they are, and replace pending tasks with the replanned ones.
      const pastTasks = goalTasks.filter(t => t.status !== 'pending');
      
      const newPlannedTasks: Task[] = analysis.tasks.map((t, idx) => {
        const taskDate = new Date();
        taskDate.setDate(taskDate.getDate() + (t.dayOffset - 1));
        return {
          id: `task-replanned-${goal.id}-${idx}-${Date.now()}`,
          goalId: goal.id,
          title: t.title,
          description: t.description,
          scheduledDate: taskDate.toISOString().split('T')[0],
          status: 'pending',
          priority: t.priority,
          milestone: t.milestone
        };
      });

      const updatedTasks = [...pastTasks, ...newPlannedTasks];
      onReplanGoal(goal.id, updatedGoalFields, updatedTasks);

    } catch (err) {
      console.error(err);
      alert('Replanning failed.');
    } finally {
      setReplanning(false);
      setObstacleDesc('');
    }
  };

  const getObstacleIcon = (type: string) => {
    switch (type) {
      case 'Illness': return <HeartPulse size={20} />;
      case 'Family Event': return <Users size={20} />;
      case 'Extra Work': return <Briefcase size={20} />;
      case 'Unexpected Assignment': return <FileCode2 size={20} />;
      case 'Personal Emergency': return <ShieldAlert size={20} />;
      default: return <ShieldEllipsis size={20} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Back button */}
      <div>
        <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} />
          Back to Systems Panel
        </button>
      </div>

      {replanning ? (
        <div className="glass-panel-glow" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="ai-loader-container">
            <div className="ai-pulse-orb" />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-title)' }}>
              Replanning Execution Schedule...
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {replanningStatus}
            </p>
          </div>
        </div>
      ) : (
        <div className="detail-grid">
          
          {/* Left Side: Tasks Timeline */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              Dynamic Task Timeline
            </h3>

            {Object.keys(tasksByDate).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No tasks associated with this goal schedule.
              </p>
            ) : (
              Object.keys(tasksByDate).sort().map(dateStr => {
                const dateTasks = tasksByDate[dateStr];
                const dateObj = new Date(dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div key={dateStr} className="timeline-day-section">
                    <div className="timeline-day-header">
                      <span style={{ fontWeight: '700', color: isToday ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                        {isToday ? "Today's Tasks" : dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="timeline-day-date">{dateStr}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {dateTasks.map(task => (
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
                              {task.milestone && (
                                <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Sparkles size={11} /> {task.milestone}
                                </span>
                              )}
                              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                Priority P{task.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Side: AI Execution & Obstacle Calibrator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Feasibility Analyzer Card */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                AI Feasibility Calibrator
              </h3>

              {/* Progress Ring */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  border: '4px solid rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-title)',
                  fontSize: '1.15rem',
                  fontWeight: 'bold',
                  borderColor: goal.successProbability > 70 ? 'var(--risk-low-border)' : goal.successProbability > 50 ? 'var(--risk-medium-border)' : 'var(--risk-high-border)',
                  color: goal.successProbability > 70 ? 'var(--risk-low)' : goal.successProbability > 50 ? 'var(--risk-medium)' : 'var(--risk-high)'
                }}>
                  {goal.successProbability}%
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Success Probability</span>
                  <div style={{ marginTop: '0.15rem' }}>
                    <span className={`badge ${goal.riskLevel === 'High' ? 'badge-risk-high' : goal.riskLevel === 'Medium' ? 'badge-risk-medium' : 'badge-risk-low'}`}>
                      {goal.riskLevel} Risk
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasoning list */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                  Explainable Reasons:
                </span>
                {goal.reasons.map((r, i) => (
                  <div key={i} className="reason-item" style={{ color: 'var(--text-primary)' }}>
                    <Info size={14} style={{ color: 'var(--accent-color)', marginTop: '0.15rem' }} />
                    <p style={{ fontSize: '0.85rem' }}>{r}</p>
                  </div>
                ))}
              </div>

              {/* Biggest Risk */}
              <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid var(--risk-high-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--risk-high)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '0.15rem' }}>
                  Biggest Threat Vector:
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {goal.biggestRisk}
                </p>
              </div>

              {/* Recommendations */}
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                  Recovery Action Items:
                </span>
                {goal.recommendations.map((r, i) => (
                  <div key={i} className="reason-item" style={{ color: 'var(--text-primary)' }}>
                    <Sparkles size={14} style={{ color: '#a855f7', marginTop: '0.15rem' }} />
                    <p style={{ fontSize: '0.85rem' }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal Statistics */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-title)', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                Goal Completion Parameters
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>COMPLETED</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--risk-low)' }}>{completedTasks}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>MISSED</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--risk-high)' }}>{missedTasks}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Progress Completion</span>
                <span style={{ fontWeight: 'bold' }}>{completionRate}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${completionRate}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Report Obstacle Button */}
            <button onClick={() => setShowObstacleModal(true)} className="btn btn-danger" style={{ width: '100%' }}>
              <AlertOctagon size={18} />
              Report Obstacle & Replan
            </button>
          </div>
        </div>
      )}

      {/* Report Obstacle Modal */}
      {showObstacleModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-glow">
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon size={22} style={{ color: 'var(--risk-high)' }} />
                Report Execution Blockage
              </h3>
              <button onClick={() => setShowObstacleModal(false)} className="btn-ghost btn-icon-only">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReportObstacle}>
              <div className="form-group">
                <label className="form-label">Obstacle Category</label>
                <div className="obstacle-grid" style={{ marginBottom: '1.25rem' }}>
                  {['Illness', 'Family Event', 'Extra Work', 'Unexpected Assignment', 'Personal Emergency', 'Custom Obstacle'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setObstacleType(type)}
                      className="obstacle-btn"
                      style={{
                        borderColor: obstacleType === type ? 'var(--accent-color)' : 'var(--border-color)',
                        background: obstacleType === type ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.01)'
                      }}
                    >
                      {getObstacleIcon(type)}
                      <span style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: obstacleType === type ? '600' : '400' }}>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Describe Impact & Obstacle Details</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="e.g. Diagnosed with food poisoning, cannot study today. Will require 24 hours recovery."
                  value={obstacleDesc}
                  onChange={(e) => setObstacleDesc(e.target.value)}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowObstacleModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ flex: 1.5 }}>
                  Trigger AI Replanning
                  <RefreshCw size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
