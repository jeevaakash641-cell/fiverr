// Book Import Utility
// Use this to import bulk uploaded books into the application

export const importBooksFromJSON = (jsonData) => {
  try {
    // Get existing uploaded books
    const existingBooks = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
    
    // Add new books
    const newBooks = jsonData.uploadedBooks || []
    const combinedBooks = [...existingBooks, ...newBooks]
    
    // Remove duplicates based on originalFileName
    const uniqueBooks = combinedBooks.filter((book, index, self) => 
      index === self.findIndex(b => b.originalFileName === book.originalFileName)
    )
    
    // Save to localStorage
    localStorage.setItem('uploadedBooks', JSON.stringify(uniqueBooks))
    
    return {
      success: true,
      imported: newBooks.length,
      total: uniqueBooks.length,
      message: `Successfully imported ${newBooks.length} books. Total books: ${uniqueBooks.length}`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to import books'
    }
  }
}

export const clearAllUploadedBooks = () => {
  localStorage.removeItem('uploadedBooks')
  return { success: true, message: 'All uploaded books cleared' }
}

export const exportUploadedBooks = () => {
  const books = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
  return {
    uploadedBooks: books,
    exportDate: new Date().toISOString(),
    totalBooks: books.length
  }
}