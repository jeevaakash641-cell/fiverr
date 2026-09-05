// Auto-generated books database with real books
// Updated on: 2026-02-05T09:40:39.132Z

export const booksDatabase = {
  "tamilnadu": {
    "class1": {
      "tamil": [],
      "english": [],
      "maths": [],
      "evs": []
    }
  }
}

// Helper functions remain the same...
export const getBooksByClass = (classNum, stateName = null) => {
  if (stateName) {
    const stateKey = stateName.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and')
    const classKey = `class${classNum}`
    return booksDatabase[stateKey]?.[classKey] || {}
  }
  
  const allBooks = {}
  for (const stateData of Object.values(booksDatabase)) {
    const classKey = `class${classNum}`
    if (stateData[classKey]) {
      for (const [subject, books] of Object.entries(stateData[classKey])) {
        if (!allBooks[subject]) allBooks[subject] = []
        allBooks[subject].push(...books)
      }
    }
  }
  return allBooks
}

export const getBooksBySubject = (subject, classNum, stateName = null) => {
  const classBooks = getBooksByClass(classNum, stateName)
  const subjectKey = subject.toLowerCase().replace(/\s+/g, '')
  return classBooks[subjectKey] || []
}

export const getBookById = (bookId) => {
  // First check the main database
  for (const stateData of Object.values(booksDatabase)) {
    for (const classData of Object.values(stateData)) {
      for (const subjectBooks of Object.values(classData)) {
        if (Array.isArray(subjectBooks)) {
          const book = subjectBooks.find(book => book.id === bookId)
          if (book) return book
        }
      }
    }
  }
  
  // Then check uploaded books in localStorage
  try {
    const uploadedBooks = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
    const uploadedBook = uploadedBooks.find(book => book.id === bookId)
    if (uploadedBook) return uploadedBook
  } catch (error) {
    console.error('Error loading uploaded books:', error)
  }
  
  return null
}

export const getAllBooks = () => {
  const allBooks = []
  for (const stateData of Object.values(booksDatabase)) {
    for (const classData of Object.values(stateData)) {
      for (const subjectBooks of Object.values(classData)) {
        if (Array.isArray(subjectBooks)) {
          allBooks.push(...subjectBooks)
        }
      }
    }
  }
  return allBooks
}

export const filterBooksByStateAndMedium = (book, selectedState, selectedMedium, stateLanguage) => {
  if (!selectedState || !selectedMedium) {
    return true
  }

  // First check if book matches the selected state
  if (book.state !== selectedState) {
    return false
  }

  // For books with term information, bundle ALL books of the same term together
  // Do NOT apply subject language filtering inside the term - show complete term bundle
  if (book.term) {
    // Include ALL books from the same term regardless of individual book language/medium
    // This ensures Tamil, English, Maths, EVS etc. are all shown together for each term
    // For Tamil Medium: show Tamil books (medium: "state") + English books (medium: "english") + Maths/EVS (medium: "both")
    // For English Medium: show all books as they should all be available
    if (selectedMedium === 'state') {
      // Tamil Medium: include state medium, english medium (for English subject), and both medium books
      return book.medium === 'state' || book.medium === 'english' || book.medium === 'both'
    } else if (selectedMedium === 'english') {
      // English Medium: include english medium and both medium books
      return book.medium === 'english' || book.medium === 'both'
    }
    return true
  }

  // For non-term books, apply regular medium filtering
  if (selectedMedium === 'english') {
    return book.medium === 'english' || book.medium === 'both'
  } else if (selectedMedium === 'state') {
    return book.medium === 'state' || book.medium === 'both'
  }

  return false
}

export const searchBooks = (query, filters = {}) => {
  const allBooks = getAllBooks()
  
  return allBooks.filter(book => {
    const matchesQuery = !query || 
      book.title.toLowerCase().includes(query.toLowerCase()) ||
      book.author.toLowerCase().includes(query.toLowerCase()) ||
      book.subject.toLowerCase().includes(query.toLowerCase()) ||
      book.description.toLowerCase().includes(query.toLowerCase())
    
    const matchesClass = !filters.class || book.class === filters.class
    const matchesSubject = !filters.subject || book.subject === filters.subject
    const matchesType = !filters.type || book.type === filters.type
    const matchesBoard = !filters.board || book.board === filters.board
    const matchesStateAndMedium = filterBooksByStateAndMedium(book, filters.state, filters.medium, filters.stateLanguage)
    
    return matchesQuery && matchesClass && matchesSubject && matchesType && matchesBoard && matchesStateAndMedium
  })
}

export const getFilteredBooks = (userPreferences = {}) => {
  const { selectedState, selectedMedium, stateLanguage, class: userClass, board } = userPreferences
  
  const filters = {
    state: selectedState,
    medium: selectedMedium,
    stateLanguage: stateLanguage,
    class: userClass,
    board: board
  }
  
  return searchBooks('', filters)
}

export const getBooksByClassFiltered = (classNum, userPreferences = {}) => {
  const classBooks = getBooksByClass(classNum, userPreferences.selectedState)
  const filteredBooks = {}
  
  for (const [subject, books] of Object.entries(classBooks)) {
    if (Array.isArray(books)) {
      filteredBooks[subject] = books.filter(book => 
        filterBooksByStateAndMedium(book, userPreferences.selectedState, userPreferences.selectedMedium, userPreferences.stateLanguage)
      )
    }
  }
  
  return filteredBooks
}