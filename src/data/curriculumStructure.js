/**
 * Tamil Nadu State Board Curriculum Structure
 * Organized by class levels with proper subject hierarchy
 */

export const curriculumStructure = {
  // Classes 1-5: Primary Education
  primary: {
    classes: [1, 2, 3, 4, 5],
    subjects: [
      { id: 'regional', name: 'Regional Language', order: 1, required: true, isMotherTongue: true },
      { id: 'english', name: 'English', order: 2, required: true },
      { id: 'mathematics', name: 'Mathematics', order: 3, required: true },
      { id: 'evs', name: 'Environmental Science (EVS)', order: 4, required: true }
    ]
  },

  // Classes 6-8: Upper Primary
  upperPrimary: {
    classes: [6, 7, 8],
    subjects: [
      { id: 'regional', name: 'Regional Language', order: 1, required: true, isMotherTongue: true },
      { id: 'english', name: 'English', order: 2, required: true },
      { id: 'mathematics', name: 'Mathematics', order: 3, required: true },
      { id: 'science', name: 'Science', order: 4, required: true },
      { id: 'social', name: 'Social Science', order: 5, required: true }
    ]
  },

  // Classes 9-10: Secondary Education (SSLC)
  secondary: {
    classes: [9, 10],
    subjects: [
      { id: 'language1', name: 'Language I (Regional)', order: 1, required: true, isMotherTongue: true },
      { id: 'language2', name: 'English', order: 2, required: true },
      { id: 'mathematics', name: 'Mathematics', order: 3, required: true },
      { id: 'science', name: 'Science', order: 4, required: true, subSubjects: ['Physics', 'Chemistry', 'Biology'] },
      { id: 'social', name: 'Social Science', order: 5, required: true, subSubjects: ['History', 'Geography', 'Civics', 'Economics'] }
    ]
  },

  // Classes 11-12: Higher Secondary (HSC)
  higherSecondary: {
    classes: [11, 12],
    commonSubjects: [
      { id: 'regional', name: 'Regional Language', order: 1, required: true, isMotherTongue: true },
      { id: 'english', name: 'English', order: 2, required: true }
    ],
    streams: {
      pureScience: {
        id: 'pure-science',
        name: 'Pure Science Stream',
        subjects: [
          { id: 'physics', name: 'Physics', order: 3, required: true },
          { id: 'chemistry', name: 'Chemistry', order: 4, required: true },
          { id: 'biology', name: 'Biology', order: 5, required: true, subSubjects: ['Botany', 'Zoology'] }
        ]
      },
      computerScience: {
        id: 'computer-science',
        name: 'Computer Science Stream',
        subjects: [
          { id: 'mathematics', name: 'Mathematics', order: 3, required: true },
          { id: 'physics', name: 'Physics', order: 4, required: true },
          { id: 'chemistry', name: 'Chemistry', order: 5, required: true },
          { id: 'computer', name: 'Computer Science', order: 6, required: true }
        ]
      },
      biologyMaths: {
        id: 'biology-maths',
        name: 'Biology with Mathematics',
        subjects: [
          { id: 'mathematics', name: 'Mathematics', order: 3, required: true },
          { id: 'physics', name: 'Physics', order: 4, required: true },
          { id: 'chemistry', name: 'Chemistry', order: 5, required: true },
          { id: 'biology', name: 'Biology', order: 6, required: true, subSubjects: ['Botany', 'Zoology'] }
        ]
      },
      commerce: {
        id: 'commerce',
        name: 'Commerce Stream',
        subjects: [
          { id: 'accountancy', name: 'Accountancy', order: 3, required: true },
          { id: 'commerce', name: 'Commerce', order: 4, required: true },
          { id: 'economics', name: 'Economics', order: 5, required: true },
          { id: 'mathematics', name: 'Mathematics', order: 6, required: false },
          { id: 'computer', name: 'Computer Applications', order: 6, required: false }
        ]
      },
      arts: {
        id: 'arts',
        name: 'Arts Stream',
        subjects: [
          { id: 'history', name: 'History', order: 3, required: true },
          { id: 'geography', name: 'Geography', order: 4, required: true },
          { id: 'political', name: 'Political Science', order: 5, required: true },
          { id: 'economics', name: 'Economics', order: 6, required: false },
          { id: 'nursing', name: 'Nursing', order: 6, required: false },
          { id: 'homeScience', name: 'Home Science', order: 6, required: false }
        ]
      }
    }
  }
}

/**
 * Get subjects for a specific class with actual regional language name
 */
export const getSubjectsForClass = (classNum, stream = null, stateLanguage = 'Tamil') => {
  // Helper to replace "Regional Language" with actual language name
  const replaceRegionalLanguage = (subjects) => {
    return subjects.map(subject => {
      if (subject.id === 'regional' || subject.id === 'language1') {
        // If stateLanguage is English, keep as "Regional Language" to avoid duplicate with English subject
        if (!stateLanguage || stateLanguage === 'English') return subject
        return { ...subject, name: stateLanguage }
      }
      // Normalize legacy "Language II (English)" to just "English"
      if (subject.id === 'language2') {
        return { ...subject, name: 'English' }
      }
      return subject
    })
  }

  if (classNum >= 1 && classNum <= 5) {
    return replaceRegionalLanguage(curriculumStructure.primary.subjects)
  } else if (classNum >= 6 && classNum <= 8) {
    return replaceRegionalLanguage(curriculumStructure.upperPrimary.subjects)
  } else if (classNum >= 9 && classNum <= 10) {
    return replaceRegionalLanguage(curriculumStructure.secondary.subjects)
  } else if (classNum >= 11 && classNum <= 12) {
    const common = replaceRegionalLanguage(curriculumStructure.higherSecondary.commonSubjects)
    if (stream) {
      // Find stream by ID (supports both camelCase and kebab-case)
      const streamKey = Object.keys(curriculumStructure.higherSecondary.streams).find(key => {
        const streamObj = curriculumStructure.higherSecondary.streams[key]
        return streamObj.id === stream || key === stream
      })
      
      if (streamKey) {
        return [...common, ...curriculumStructure.higherSecondary.streams[streamKey].subjects]
      }
    }
    return common
  }
  return []
}

/**
 * Get all available streams for higher secondary
 */
export const getHigherSecondaryStreams = () => {
  return Object.values(curriculumStructure.higherSecondary.streams)
}

/**
 * Check if a class requires stream selection
 */
export const requiresStreamSelection = (classNum) => {
  return classNum >= 11 && classNum <= 12
}

/**
 * Get class level name
 */
export const getClassLevel = (classNum) => {
  if (classNum >= 1 && classNum <= 5) return 'Primary Education'
  if (classNum >= 6 && classNum <= 8) return 'Upper Primary'
  if (classNum >= 9 && classNum <= 10) return 'Secondary Education (SSLC)'
  if (classNum >= 11 && classNum <= 12) return 'Higher Secondary (HSC)'
  return 'Unknown'
}

/**
 * Map old subject names to new curriculum structure
 */
export const subjectMapping = {
  // Old name -> New name
  'Tamil': 'Regional Language',
  'EVS': 'Environmental Science (EVS)',
  'Social Studies': 'Social Science',
  'Social Science': 'Social Science'
}

/**
 * Normalize subject name
 */
export const normalizeSubjectName = (subjectName) => {
  return subjectMapping[subjectName] || subjectName
}

export default curriculumStructure
