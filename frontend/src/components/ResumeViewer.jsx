import React from 'react';

/**
 * A proper Resume Viewer modal that supports PDF and fallback for other formats.
 */
export default function ResumeViewer({ isOpen, onClose, resumeUrl, fileName, entities, onUpdate }) {
    const [localEntities, setLocalEntities] = React.useState(entities || {});
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        setLocalEntities(entities || {});
    }, [entities]);

    if (!isOpen) return null;

    const isPdf = fileName?.toLowerCase().endsWith('.pdf');

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (onUpdate) {
                await onUpdate(localEntities);
            }
            setIsEditing(false);
        } catch (err) {
            alert('Failed to save updates: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay resume-viewer-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div
                className="modal-content glass-card resume-viewer-content"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '95%',
                    maxWidth: '1200px',
                    height: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <div className="resume-viewer-header" style={{
                    padding: '1rem 1.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{isPdf ? '📕' : '📄'}</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>{fileName || 'Resume Document'}</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                {entities ? 'AI Enhanced Analysis Active' : 'Secure AI-powered Preview'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <a
                            href={resumeUrl}
                            download={fileName}
                            className="action-btn ghost-btn small-btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        >
                            ⬇️ Download
                        </a>
                        <button
                            onClick={onClose}
                            className="close-btn"
                            style={{
                                position: 'static',
                                background: 'rgba(255,255,255,0.1)',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="resume-viewer-main" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div className="resume-viewer-body" style={{ flex: 1, background: '#1a1a1a', position: 'relative' }}>
                        {isPdf ? (
                            <iframe
                                src={`${resumeUrl}#toolbar=0`}
                                title="Resume Preview"
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'var(--gray-400)',
                                textAlign: 'center',
                                padding: '2rem'
                            }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📂</div>
                                <h3>Preview not available for this format</h3>
                                <p style={{ maxWidth: '400px' }}>
                                    This file is a DOCX or other format that cannot be previewed directly in the browser safely.
                                    Please download it to view the content.
                                </p>
                                <a
                                    href={resumeUrl}
                                    download={fileName}
                                    className="action-btn primary-btn"
                                    style={{ marginTop: '1.5rem', padding: '0.75rem 2rem' }}
                                >
                                    Download {fileName}
                                </a>
                            </div>
                        )}
                    </div>

                    {entities && (
                        <div className="resume-ai-sidebar" style={{
                            width: '350px',
                            background: 'rgba(255,255,255,0.02)',
                            borderLeft: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    ⚡ AI Extracted Info
                                </h4>
                                {onUpdate && !isEditing && (
                                    <button
                                        className="action-btn ghost-btn small-btn"
                                        onClick={() => setIsEditing(true)}
                                        style={{ fontSize: '0.7rem' }}
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                                {Object.entries(localEntities).map(([key, value]) => {
                                    if (!value || (Array.isArray(value) && value.length === 0)) return null;

                                    return (
                                        <div key={key} style={{ marginBottom: '1.5rem' }}>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '0.65rem',
                                                color: 'var(--gray-500)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em',
                                                marginBottom: '0.5rem'
                                            }}>
                                                {key.replace('_', ' ')}
                                            </label>

                                            {isEditing ? (
                                                Array.isArray(value) ? (
                                                    <textarea
                                                        className="form-input small-input"
                                                        value={value.join(', ')}
                                                        onChange={(e) => {
                                                            const newVals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                            setLocalEntities({ ...localEntities, [key]: newVals });
                                                        }}
                                                        style={{ minHeight: '80px', fontSize: '0.8rem' }}
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="form-input small-input"
                                                        value={value}
                                                        onChange={(e) => setLocalEntities({ ...localEntities, [key]: e.target.value })}
                                                    />
                                                )
                                            ) : (
                                                <div style={{ fontSize: '0.9rem', color: 'white' }}>
                                                    {Array.isArray(value) ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                            {value.map((item, i) => (
                                                                <span key={i} style={{
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                                }}>
                                                                    {item}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        value
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {isEditing && (
                                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="action-btn primary-btn"
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                        onClick={handleSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Meta'}
                                    </button>
                                    <button
                                        className="action-btn ghost-btn"
                                        onClick={() => { setIsEditing(false); setLocalEntities(entities); }}
                                        disabled={isSaving}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .resume-viewer-overlay {
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                }
                .resume-viewer-content {
                    animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes modalPop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
