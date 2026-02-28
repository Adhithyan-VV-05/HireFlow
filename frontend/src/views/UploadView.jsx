import React, { useState, useRef } from 'react';
import CandidateCard from '../components/CandidateCard';
import { api } from '../api/client';

export default function UploadView() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDragOver = (e) => { e.preventDefault(); };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) uploadFile(files[0]);
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files.length > 0) uploadFile(files[0]);
    };

    const uploadFile = async (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'doc'].includes(ext)) {
            setError('Please upload a PDF or DOCX file.');
            return;
        }

        setIsUploading(true);
        setError('');
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const data = await api.uploadResume(formData);
            setResult(data);
        } catch (err) {
            setError(err.message || 'Failed to upload resume. Is the backend running?');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Upload Resume</h1>
                <p className="page-subtitle">
                    Drop a PDF or DOCX resume to extract skills, entities, and generate embeddings
                </p>
            </div>

            {/* Upload Zone */}
            <div
                className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {isUploading ? (
                    <>
                        <div className="upload-icon"><span className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} /></div>
                        <h3>Processing Resume<span className="loading-dots"></span></h3>
                        <p>Running NER extraction, chunking, and embedding generation</p>
                    </>
                ) : (
                    <>
                        <div className="upload-icon">📄</div>
                        <h3>Drag & Drop Resume</h3>
                        <p>Supports PDF and DOCX files • Click to browse</p>
                    </>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)',
                    background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: 'var(--rose-400)', fontSize: '0.9rem'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{ marginTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>
                        ✅ Resume Processed Successfully
                    </h2>
                    <CandidateCard candidate={result} />

                    {/* Candidate ID for reference */}
                    <div style={{
                        marginTop: '1rem', padding: '0.75rem 1rem',
                        background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem', color: 'var(--gray-400)',
                        border: '1px solid var(--border-subtle)',
                        fontFamily: 'monospace'
                    }}>
                        Candidate ID: {result.candidate_id}
                    </div>
                </div>
            )}
        </div>
    );
}
