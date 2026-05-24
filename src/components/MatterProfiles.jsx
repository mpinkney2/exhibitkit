import React, { useState, useEffect } from 'react';
import { FolderHeart, Save, Trash2, Lock, Check } from 'lucide-react';

export default function MatterProfiles({
  isPro,
  currentSettings,
  onApplySettings,
  onShowNotification,
  theme
}) {
  const [profiles, setProfiles] = useState([]);
  const [newProfileName, setNewProfileName] = useState('');

  // Load profiles on mount
  useEffect(() => {
    const saved = localStorage.getItem('exhibitkit_matter_profiles');
    if (saved) {
      try {
        setProfiles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse matter profiles", e);
      }
    }
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!isPro) return;

    const name = newProfileName.trim();
    if (!name) {
      onShowNotification("⚠️ Profile name cannot be empty.", "warning");
      return;
    }

    const newProfile = {
      id: Date.now().toString(),
      name,
      settings: { ...currentSettings }
    };

    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('exhibitkit_matter_profiles', JSON.stringify(updated));
    setNewProfileName('');
    onShowNotification(`✨ Matter Profile "${name}" saved successfully.`, "success");
  };

  const handleDeleteProfile = (id, name) => {
    if (!isPro) return;

    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    localStorage.setItem('exhibitkit_matter_profiles', JSON.stringify(updated));
    onShowNotification(`🗑️ Matter Profile "${name}" removed.`, "success");
  };

  const handleApplyProfile = (profile) => {
    if (!isPro) return;
    onApplySettings(profile.settings);
    onShowNotification(`🎯 Applied "${profile.name}" settings profile.`, "success");
  };

  if (!isPro) {
    return (
      <div className="sidebar-section" style={{
        position: 'relative',
        background: 'var(--bg-tertiary)',
        border: '1px dashed var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '12px'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme === 'light' ? 'rgba(241, 245, 249, 0.95)' : 'rgba(10, 14, 23, 0.85)',
          backdropFilter: 'blur(3px)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px',
          textAlign: 'center',
          zIndex: 5
        }}>
          <Lock size={18} className="text-warning" />
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Matter Profiles (Pro Only)
          </span>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Saved Matter Profiles are available in ExhibitKIT Pro.
          </span>
        </div>

        {/* Dummy layout for visual aesthetics */}
        <div style={{ opacity: 0.15, pointerEvents: 'none' }}>
          <div className="sidebar-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderHeart size={12} />
            Saved Matter Profiles
          </div>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <input type="text" placeholder="e.g., Jones Patent Trial" disabled />
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', padding: '6px 12px' }} disabled>
            Save Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-section" style={{
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '12px'
    }}>
      <div className="sidebar-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc', marginBottom: '12px' }}>
        <FolderHeart size={13} />
        Saved Matter Profiles
      </div>

      {/* Save Current Settings Form */}
      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <input 
            type="text" 
            value={newProfileName} 
            onChange={(e) => setNewProfileName(e.target.value)} 
            placeholder="e.g., Smith Patent Trial"
            style={{ fontSize: '12.5px', padding: '8px 12px' }}
          />
        </div>
        <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', background: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
          <Save size={12} />
          Save Current Settings
        </button>
      </form>

      {/* Profiles list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
        {profiles.length === 0 ? (
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
            No saved profiles. Save above to store this configuration.
          </span>
        ) : (
          profiles.map(profile => (
            <div 
              key={profile.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                transition: 'all var(--transition-fast)'
              }}
            >
              <button 
                onClick={() => handleApplyProfile(profile)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  flex: 1,
                  padding: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={`Apply settings from ${profile.name}`}
              >
                {profile.name}
              </button>
              
              <button 
                onClick={() => handleDeleteProfile(profile.id, profile.name)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-danger)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                title="Delete profile"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
