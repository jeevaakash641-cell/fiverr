import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  Save, 
  FileDown, 
  FileText, 
  Copy, 
  Trash2, 
  X, 
  StickyNote,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveNote, getNotesBySource } from '../services/notesStorage';
import { exportToPDF, exportToDOCX, exportToText, copyToClipboard } from '../utils/notesExport';

/**
 * NotesPanel Component
 * Rich text editor for student notes with auto-save and export features
 * 
 * Props:
 * - sourceType: 'book' | 'ai-chat' | 'general'
 * - sourceId: ID of the book or chat session
 * - subject: Subject name (optional)
 * - title: Default title for notes
 */
const NotesPanel = ({ 
  sourceType = 'general', 
  sourceId = 'default',
  subject = '',
  title = 'My Notes',
  onClose
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [noteTitle, setNoteTitle] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const autoSaveTimer = useRef(null);

  // Load existing notes
  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user, sourceType, sourceId]);

  // Auto-save functionality
  useEffect(() => {
    if (content && user) {
      // Clear existing timer
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      // Set new timer for auto-save (3 seconds after last change)
      autoSaveTimer.current = setTimeout(() => {
        handleSave(true);
      }, 3000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [content, noteTitle]);

  const loadNotes = () => {
    const notes = getNotesBySource(user.id || user.email, sourceType, sourceId);
    if (notes && notes.length > 0) {
      const latestNote = notes[notes.length - 1];
      setContent(latestNote.content || '');
      setNoteTitle(latestNote.title || title);
      setLastSaved(latestNote.updatedAt);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!user) {
      alert('Please login to save notes');
      return;
    }

    setIsSaving(true);

    const note = {
      id: `${sourceType}_${sourceId}`,
      title: noteTitle,
      content: content,
      subject: subject,
      sourceType: sourceType,
      sourceId: sourceId,
      studentId: user.id || user.email
    };

    const success = saveNote(user.id || user.email, note);

    if (success) {
      setLastSaved(new Date().toISOString());
      if (!isAutoSave) {
        alert('Notes saved successfully!');
      }
    } else {
      if (!isAutoSave) {
        alert('Failed to save notes');
      }
    }

    setIsSaving(false);
  };

  const handleExportPDF = async () => {
    const result = await exportToPDF(content, noteTitle);
    alert(result.message);
    setShowExportMenu(false);
  };

  const handleExportDOCX = async () => {
    const result = await exportToDOCX(content, noteTitle);
    alert(result.message);
    setShowExportMenu(false);
  };

  const handleExportText = () => {
    const result = exportToText(content, noteTitle);
    alert(result.message);
    setShowExportMenu(false);
  };

  const handleCopyToClipboard = async () => {
    const result = await copyToClipboard(content);
    alert(result.message);
  };

  const handleClear = () => {
    if (confirm('Clear all notes? This cannot be undone.')) {
      setContent('');
      setNoteTitle(title);
    }
  };

  // Quill editor modules
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align',
    'blockquote', 'code-block',
    'link'
  ];

  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-header">
        <div className="notes-header-left">
          <StickyNote className="h-5 w-5 text-indigo-600" />
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="notes-title-input text-black bg-white"
            placeholder="Note title..."
          />
        </div>
        <div className="notes-header-right">
          {lastSaved && (
            <span className="last-saved">
              {isSaving ? 'Saving...' : `Saved ${new Date(lastSaved).toLocaleTimeString()}`}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="notes-close-btn">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="notes-editor-container">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          modules={modules}
          formats={formats}
          placeholder="Start typing your notes here..."
          className="notes-editor"
        />
      </div>

      {/* Actions */}
      <div className="notes-actions">
        <div className="notes-actions-left">
          <button 
            onClick={() => handleSave(false)} 
            className="notes-btn notes-btn-primary"
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            <span>Save Now</span>
          </button>

          <div className="notes-export-dropdown">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="notes-btn notes-btn-secondary"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="notes-export-menu">
                <button onClick={handleExportPDF} className="notes-export-item">
                  <FileDown className="h-4 w-4" />
                  <span>Export as PDF</span>
                </button>
                <button onClick={handleExportDOCX} className="notes-export-item">
                  <FileText className="h-4 w-4" />
                  <span>Export as DOCX</span>
                </button>
                <button onClick={handleExportText} className="notes-export-item">
                  <FileText className="h-4 w-4" />
                  <span>Export as TXT</span>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={handleCopyToClipboard}
            className="notes-btn notes-btn-secondary"
          >
            <Copy className="h-4 w-4" />
            <span>Copy</span>
          </button>
        </div>

        <button 
          onClick={handleClear}
          className="notes-btn notes-btn-danger"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear</span>
        </button>
      </div>

      <style jsx>{`
        .notes-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .notes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
        }

        .notes-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .notes-title-input {
          flex: 1;
          font-size: 18px;
          font-weight: 600;
          border: none;
          background: transparent;
          outline: none;
          color: #1f2937;
        }

        .notes-title-input:focus {
          border-bottom: 2px solid #4F46E5;
        }

        .notes-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .last-saved {
          font-size: 12px;
          color: #6b7280;
        }

        .notes-close-btn {
          padding: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .notes-close-btn:hover {
          background: #e5e7eb;
        }

        .notes-editor-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .notes-editor {
          height: 100%;
        }

        .notes-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-top: 2px solid #e5e7eb;
          background: #f9fafb;
          flex-wrap: wrap;
          gap: 12px;
        }

        .notes-actions-left {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .notes-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notes-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notes-btn-primary {
          background: #4F46E5;
          color: white;
        }

        .notes-btn-primary:hover:not(:disabled) {
          background: #4338ca;
        }

        .notes-btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .notes-btn-secondary:hover {
          background: #d1d5db;
        }

        .notes-btn-danger {
          background: #fee2e2;
          color: #dc2626;
        }

        .notes-btn-danger:hover {
          background: #fecaca;
        }

        .notes-export-dropdown {
          position: relative;
        }

        .notes-export-menu {
          position: absolute;
          bottom: 100%;
          left: 0;
          margin-bottom: 8px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
          min-width: 180px;
          z-index: 10;
        }

        .notes-export-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 14px;
          color: #374151;
        }

        .notes-export-item:hover {
          background: #f3f4f6;
        }

        .notes-export-item:first-child {
          border-radius: 8px 8px 0 0;
        }

        .notes-export-item:last-child {
          border-radius: 0 0 8px 8px;
        }

        @media (max-width: 768px) {
          .notes-header {
            padding: 12px 16px;
          }

          .notes-title-input {
            font-size: 16px;
          }

          .notes-editor-container {
            padding: 16px;
          }

          .notes-actions {
            padding: 12px 16px;
          }

          .notes-btn {
            padding: 6px 12px;
            font-size: 13px;
          }

          .notes-btn span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default NotesPanel;
