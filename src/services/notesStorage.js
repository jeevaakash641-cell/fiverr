/**
 * Notes Storage Service — DynamoDB backed via studentDataService
 */
import { getData, saveData } from './studentDataService.js'

const DATA_TYPE = 'notes'

export const getStudentNotes = async (studentId) => {
  try {
    return await getData(studentId, DATA_TYPE, [])
  } catch { return [] }
}

export const saveNote = async (studentId, note) => {
  try {
    const notes = await getStudentNotes(studentId)
    const idx = notes.findIndex(n => n.id === note.id)
    const now = new Date().toISOString()
    if (idx !== -1) {
      notes[idx] = { ...note, updatedAt: now }
    } else {
      notes.push({ ...note, id: note.id || Date.now().toString(), createdAt: now, updatedAt: now })
    }
    saveData(studentId, DATA_TYPE, notes)
    return true
  } catch { return false }
}

export const getNote = async (studentId, noteId) => {
  const notes = await getStudentNotes(studentId)
  return notes.find(n => n.id === noteId)
}

export const getNotesBySource = async (studentId, sourceType, sourceId) => {
  const notes = await getStudentNotes(studentId)
  return notes.filter(n => n.sourceType === sourceType && n.sourceId === sourceId)
}

export const deleteNote = async (studentId, noteId) => {
  try {
    const notes = await getStudentNotes(studentId)
    saveData(studentId, DATA_TYPE, notes.filter(n => n.id !== noteId))
    return true
  } catch { return false }
}

export const getNotesBySubject = async (studentId, subject) => {
  const notes = await getStudentNotes(studentId)
  return notes.filter(n => n.subject === subject)
}
