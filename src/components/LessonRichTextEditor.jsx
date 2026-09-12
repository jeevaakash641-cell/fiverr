import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link as LinkIcon, Minus,
  Code, Eye, Eraser, AlertCircle
} from 'lucide-react'
import { sanitizeHtml, stripHtml } from '../utils/sanitizeHtml'

const LessonRichTextEditor = ({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Type lesson content here (guides, explanations, case studies, step-by-step instructions)...',
  minHeight = '180px',
  maxHeight = '360px',
  error = null,
  disabled = false
}) => {
  const editorRef = useRef(null)
  const isInternalUpdate = useRef(false)
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [sourceCode, setSourceCode] = useState(value || '')
  const [activeFormats, setActiveFormats] = useState({})

  // Initialize editor content safely without triggering infinite loops
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      const currentContent = editorRef.current.innerHTML
      // Only set innerHTML if the content has genuinely changed from external source
      if (!isInternalUpdate.current && value !== currentContent) {
        editorRef.current.innerHTML = sanitizeHtml(value || '')
      }
      isInternalUpdate.current = false
    }
    setSourceCode(value || '')
  }, [value, isSourceMode])

  // Update active formatting states for toolbar highlighting
  const updateToolbarStates = useCallback(() => {
    if (typeof document === 'undefined' || isSourceMode) return
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList')
      })
    } catch {
      // Ignore queryCommandState errors in unsupported environments
    }
  }, [isSourceMode])

  // Execute formatting commands with ref existence check
  const applyFormatting = (command, val = null) => {
    if (disabled || isSourceMode) return
    if (editorRef.current) {
      editorRef.current.focus()
    }
    try {
      document.execCommand(command, false, val)
      if (editorRef.current) {
        const updatedHtml = editorRef.current.innerHTML
        isInternalUpdate.current = true
        onChange?.(updatedHtml)
        setSourceCode(updatedHtml)
      }
      updateToolbarStates()
    } catch (err) {
      console.warn('Formatting command error:', err)
    }
  }

  // Handle Heading / Paragraph Block Formatting
  const handleFormatBlock = (tag) => {
    if (disabled || isSourceMode) return
    if (editorRef.current) {
      editorRef.current.focus()
    }
    try {
      document.execCommand('formatBlock', false, `<${tag}>`)
      if (editorRef.current) {
        const updatedHtml = editorRef.current.innerHTML
        isInternalUpdate.current = true
        onChange?.(updatedHtml)
        setSourceCode(updatedHtml)
      }
      updateToolbarStates()
    } catch (err) {
      console.warn('Block format error:', err)
    }
  }

  // Handle Link Insertion
  const handleInsertLink = () => {
    if (disabled || isSourceMode) return
    const url = prompt('Enter web link URL (e.g., https://example.org):')
    if (url && url.trim()) {
      let formattedUrl = url.trim()
      if (!/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith('mailto:')) {
        formattedUrl = `https://${formattedUrl}`
      }
      applyFormatting('createLink', formattedUrl)
    }
  }

  // Safe Input Handler (typing / deleting)
  const handleInput = () => {
    if (!editorRef.current) return
    const currentHtml = editorRef.current.innerHTML
    isInternalUpdate.current = true
    onChange?.(currentHtml)
    setSourceCode(currentHtml)
    updateToolbarStates()
  }

  // Safe Paste Interception — prevents unescaped tags & null ref crashes
  const handlePaste = (e) => {
    e.preventDefault()
    if (disabled || isSourceMode) return

    let pasteContent = ''
    if (e.clipboardData) {
      const htmlData = e.clipboardData.getData('text/html')
      const textData = e.clipboardData.getData('text/plain')

      if (htmlData && htmlData.trim()) {
        pasteContent = sanitizeHtml(htmlData)
      } else if (textData) {
        // Convert multiline plain text to paragraphs / linebreaks safely
        pasteContent = textData
          .split(/\r?\n\r?\n/)
          .map(paragraph => `<p>${paragraph.replace(/\r?\n/g, '<br>')}</p>`)
          .join('')
      }
    }

    if (!pasteContent) return

    try {
      // Use execCommand insertHTML for natural undo/redo stack & caret positioning
      const success = document.execCommand('insertHTML', false, pasteContent)
      if (!success && editorRef.current) {
        // Fallback: append safely to selection
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          range.deleteContents()
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = pasteContent
          const frag = document.createDocumentFragment()
          let node
          while ((node = tempDiv.firstChild)) {
            frag.appendChild(node)
          }
          range.insertNode(frag)
        }
      }
    } catch (pasteErr) {
      console.warn('Paste insertion fallback:', pasteErr)
      if (editorRef.current) {
        editorRef.current.innerHTML += pasteContent
      }
    }

    if (editorRef.current) {
      const updatedHtml = editorRef.current.innerHTML
      isInternalUpdate.current = true
      onChange?.(updatedHtml)
      setSourceCode(updatedHtml)
    }
  }

  // Handle Source Code changes
  const handleSourceCodeChange = (e) => {
    const newCode = e.target.value
    setSourceCode(newCode)
    isInternalUpdate.current = true
    onChange?.(newCode)
  }

  // Switch between Visual and HTML Source Mode
  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switching from Source to Visual: sanitize code before rendering
      const sanitized = sanitizeHtml(sourceCode)
      onChange?.(sanitized)
      setIsSourceMode(false)
    } else {
      // Switching from Visual to Source
      if (editorRef.current) {
        setSourceCode(editorRef.current.innerHTML)
      }
      setIsSourceMode(true)
    }
  }

  // Word count & text statistics
  const plainText = stripHtml(isSourceMode ? sourceCode : (editorRef.current?.innerHTML || value || ''))
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0
  const charCount = plainText.length

  return (
    <div className={`border rounded-lg overflow-hidden bg-white transition-all ${
      error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'
    }`}>
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 select-none">
        {/* Basic Styles */}
        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded border border-gray-200 shadow-sm">
          <button
            type="button"
            onClick={() => applyFormatting('bold')}
            disabled={disabled || isSourceMode}
            className={`p-1.5 rounded text-xs transition-colors ${
              activeFormats.bold ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-700 hover:bg-gray-100'
            } disabled:opacity-40`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('italic')}
            disabled={disabled || isSourceMode}
            className={`p-1.5 rounded text-xs transition-colors ${
              activeFormats.italic ? 'bg-emerald-100 text-emerald-800 italic' : 'text-gray-700 hover:bg-gray-100'
            } disabled:opacity-40`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('underline')}
            disabled={disabled || isSourceMode}
            className={`p-1.5 rounded text-xs transition-colors ${
              activeFormats.underline ? 'bg-emerald-100 text-emerald-800 underline' : 'text-gray-700 hover:bg-gray-100'
            } disabled:opacity-40`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded border border-gray-200 shadow-sm">
          <button
            type="button"
            onClick={() => handleFormatBlock('h2')}
            disabled={disabled || isSourceMode}
            className="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40 flex items-center gap-0.5"
            title="Heading 2"
          >
            <Heading1 className="h-3.5 w-3.5 text-emerald-700" />
            <span>H2</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock('h3')}
            disabled={disabled || isSourceMode}
            className="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40 flex items-center gap-0.5"
            title="Heading 3"
          >
            <Heading2 className="h-3.5 w-3.5 text-emerald-700" />
            <span>H3</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock('p')}
            disabled={disabled || isSourceMode}
            className="px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-40"
            title="Paragraph Text"
          >
            P
          </button>
        </div>

        {/* Lists & Quote */}
        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded border border-gray-200 shadow-sm">
          <button
            type="button"
            onClick={() => applyFormatting('insertUnorderedList')}
            disabled={disabled || isSourceMode}
            className={`p-1.5 rounded text-xs transition-colors ${
              activeFormats.insertUnorderedList ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-gray-100'
            } disabled:opacity-40`}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('insertOrderedList')}
            disabled={disabled || isSourceMode}
            className={`p-1.5 rounded text-xs transition-colors ${
              activeFormats.insertOrderedList ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-gray-100'
            } disabled:opacity-40`}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock('blockquote')}
            disabled={disabled || isSourceMode}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40"
            title="Blockquote / Callout"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Link & Divider */}
        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded border border-gray-200 shadow-sm">
          <button
            type="button"
            onClick={handleInsertLink}
            disabled={disabled || isSourceMode}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40"
            title="Insert Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('insertHorizontalRule')}
            disabled={disabled || isSourceMode}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40"
            title="Insert Horizontal Divider"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('removeFormat')}
            disabled={disabled || isSourceMode}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40"
            title="Clear Formatting"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Source / Visual Toggle */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSourceMode}
            disabled={disabled}
            className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 border transition-colors ${
              isSourceMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
            title={isSourceMode ? 'Switch to Visual Rich Text Editor' : 'Switch to Raw HTML Code View'}
          >
            {isSourceMode ? (
              <>
                <Eye className="h-3.5 w-3.5 text-amber-700" />
                <span>Visual View</span>
              </>
            ) : (
              <>
                <Code className="h-3.5 w-3.5 text-gray-600" />
                <span>HTML Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {isSourceMode ? (
        <textarea
          value={sourceCode}
          onChange={handleSourceCodeChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="Paste or write HTML markup here..."
          className="w-full p-4 font-mono text-xs text-gray-800 bg-gray-50 outline-none resize-y border-0 focus:ring-0"
          style={{ minHeight, maxHeight }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyUp={updateToolbarStates}
          onMouseUp={updateToolbarStates}
          onBlur={onBlur}
          data-placeholder={placeholder}
          className="p-4 outline-none text-sm text-gray-900 overflow-y-auto prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
          style={{ minHeight, maxHeight }}
        />
      )}

      {/* Footer Meta & Stats */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
        <div className="flex items-center gap-3">
          <span><strong>{wordCount}</strong> words</span>
          <span><strong>{charCount}</strong> characters</span>
          {isSourceMode && <span className="text-amber-700 font-semibold">(Editing HTML Source)</span>}
        </div>
        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-red-600 flex items-center gap-1 font-semibold">
              <AlertCircle className="h-3 w-3" />
              {error}
            </span>
          ) : (
            <span className="text-gray-400">Rich text enabled</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default LessonRichTextEditor
