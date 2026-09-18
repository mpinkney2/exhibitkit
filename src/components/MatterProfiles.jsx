import { useState } from 'react';
import { FolderHeart, Save, Trash2, Lock } from 'lucide-react';

export default function MatterProfiles({
  isPro,
  currentSettings,
  onApplySettings,
  onShowNotification
}) {
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('exhibitkit_matter_profiles');
    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Failed to parse matter profiles", error);
      return [];
    }
  });
  const [newProfileName, setNewProfileName] = useState('');

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
        background: 'var(--color-surface-2)',
        border: '1px dashed var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        textAlign: 'center'
      }}>
        <Lock size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
          Matter Profiles (Pro Only)
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', lineHeight: '1.4' }}>
          Saved settings profiles are available in ExhibitKIT Pro workstation tiers.
        </span>
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
