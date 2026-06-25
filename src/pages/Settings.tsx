import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { getGeminiApiKey, setGeminiApiKey } from '../services/gemini';
import { getDemoStudentData, getDemoDeveloperData } from '../services/demoData';
import { Key, Eye, EyeOff, Save, Trash2, ShieldAlert, Sparkles, RefreshCw, Sun, Moon } from 'lucide-react';

interface SettingsProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
  onLoadDemoData: (data: { profile: UserProfile; goals: any[]; tasks: any[] }) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  profile,
  onUpdateProfile,
  onResetData,
  onLoadDemoData,
  isDarkMode,
  onToggleTheme
}) => {
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [showKey, setShowKey] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [profession, setProfession] = useState(profile?.profession || 'Student');
  const [customProfession, setCustomProfession] = useState('');
  const [dailyHours, setDailyHours] = useState(profile?.dailyHours || 2);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeProfession = profession === 'Custom' ? customProfession : profession;

  const handleSaveApiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(apiKey);
    
    // Save profile if edit fields have values
    if (name.trim()) {
      onUpdateProfile({
        name: name.trim(),
        profession: activeProfession,
        dailyHours: Number(dailyHours)
      });
    }
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const loadDemo = (type: 'student' | 'developer') => {
    if (confirm(`This will overwrite your current progress. Load Demo ${type === 'student' ? 'Student (Arjun)' : 'Developer (Jane)'} data?`)) {
      const data = type === 'student' ? getDemoStudentData() : getDemoDeveloperData();
      onLoadDemoData(data);
      setName(data.profile.name);
      setProfession(data.profile.profession);
      setDailyHours(data.profile.dailyHours);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>
          System Settings & Control Panel
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your AI intelligence parameters, developer integration keys, and execution profile.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* API Configuration Card */}
        <div className="glass-panel-glow" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Key size={24} style={{ color: 'var(--accent-color)' }} />
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)' }}>AI Engine Configurations</h3>
          </div>

          <form onSubmit={handleSaveApiSettings}>
            <div className="form-group">
              <label className="form-label">Gemini API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your Gemini API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="btn-ghost"
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '2rem',
                    width: '2rem',
                    padding: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your key is stored strictly on your local browser storage and is never uploaded.
              </p>
            </div>

            {/* Profile Configurations inside settings */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-color)' }} />
                Execution Profile
              </h4>

              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Profession</label>
                <select
                  className="form-select"
                  value={['Student', 'Software Developer', 'Job Seeker', 'Entrepreneur', 'Freelancer', 'Professional'].includes(profession) ? profession : 'Custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfession(val);
                    if (val !== 'Custom') {
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
                    value={customProfession}
                    onChange={(e) => setCustomProfession(e.target.value)}
                    placeholder="e.g. Researcher, Designer"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Daily Available Committed Hours</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={24}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Save size={18} />
              Save Configurations
            </button>

            {saveSuccess && (
              <p style={{ color: 'var(--risk-low)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.75rem', fontWeight: '500' }}>
                Configurations updated successfully!
              </p>
            )}
          </form>
        </div>

        {/* Demo Mode & Theme Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Hackathon Demo Deck */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Sparkles size={22} style={{ color: '#a855f7' }} />
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)' }}>Hackathon Demo Mode</h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Instantly populate the agent dashboard with pre-loaded mock goals, tasks, warnings, and schedules to inspect features.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => loadDemo('student')} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <RefreshCw size={16} />
                Load Student Demo (Arjun)
              </button>
              <button onClick={() => loadDemo('developer')} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <RefreshCw size={16} />
                Load Developer Demo (Jane)
              </button>
            </div>
          </div>

          {/* Theme & Reset Controls */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', marginBottom: '1.25rem' }}>General Utilities</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={onToggleTheme} className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                {isDarkMode ? <Sun size={16} style={{ color: '#f59e0b' }} /> : <Moon size={16} style={{ color: '#4f46e5' }} />}
                Toggle Theme ({isDarkMode ? 'Light Mode' : 'Dark Mode'})
              </button>

              <button
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to clear all execution profiles, active goals, and stored schedules?')) {
                    onResetData();
                  }
                }}
                className="btn btn-danger"
                style={{ justifyContent: 'flex-start', width: '100%', borderStyle: 'dashed' }}
              >
                <Trash2 size={16} />
                Reset System (Clear Storage)
              </button>
            </div>
          </div>

          {/* Key missing notice warning */}
          {!apiKey && (
            <div className="glass-panel" style={{ border: '1px solid var(--risk-medium-border)', background: 'rgba(245, 158, 11, 0.05)', padding: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <ShieldAlert size={20} style={{ color: 'var(--risk-medium)', flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--risk-medium)', fontWeight: '600', marginBottom: '0.25rem' }}>Simulator Active</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  No API key detected. The execution agent will automatically simulate Gemini responses so you can experience full workflow mechanics instantly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
