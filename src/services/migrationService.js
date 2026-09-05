/**
 * Migration Service - Transfer localStorage data to AWS S3
 * Handles: User profiles, History, Notes, Settings
 */

import { API_BASE_URL } from '../config'

class MigrationService {
  constructor() {
    this.migrationStatus = {
      inProgress: false,
      completed: false,
      errors: [],
      stats: {
        users: 0,
        history: 0,
        notes: 0,
        settings: 0
      }
    }
  }

  /**
   * Main migration function - migrates all localStorage data to S3
   */
  async migrateAllData() {
    console.log('🚀 Starting migration from localStorage to AWS S3...')
    this.migrationStatus.inProgress = true
    this.migrationStatus.errors = []

    try {
      // Step 1: Migrate user profiles
      await this.migrateUserProfiles()

      // Step 2: Migrate history data
      await this.migrateHistoryData()

      // Step 3: Migrate notes
      await this.migrateNotes()

      // Step 4: Migrate uploaded books metadata
      await this.migrateUploadedBooks()

      this.migrationStatus.completed = true
      this.migrationStatus.inProgress = false

      console.log('✅ Migration completed successfully!')
      console.log('📊 Migration Stats:', this.migrationStatus.stats)

      return {
        success: true,
        stats: this.migrationStatus.stats,
        errors: this.migrationStatus.errors
      }
    } catch (error) {
      console.error('❌ Migration failed:', error)
      this.migrationStatus.inProgress = false
      this.migrationStatus.errors.push({
        type: 'FATAL',
        message: error.message
      })

      return {
        success: false,
        stats: this.migrationStatus.stats,
        errors: this.migrationStatus.errors
      }
    }
  }

  /**
   * Migrate user profiles to S3
   */
  async migrateUserProfiles() {
    console.log('👥 Migrating user profiles...')

    try {
      // Get registered users from localStorage
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
      const currentUser = JSON.parse(localStorage.getItem('edulearn_user') || 'null')

      if (registeredUsers.length === 0) {
        console.log('ℹ️  No users to migrate')
        return
      }

      // Migrate each user
      for (const user of registeredUsers) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/migration/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user,
              isCurrent: currentUser && currentUser.email === user.email
            })
          })

          if (response.ok) {
            this.migrationStatus.stats.users++
            console.log(`✓ Migrated user: ${user.email}`)
          } else {
            throw new Error(`Failed to migrate user: ${user.email}`)
          }
        } catch (error) {
          console.error(`✗ Error migrating user ${user.email}:`, error)
          this.migrationStatus.errors.push({
            type: 'USER',
            email: user.email,
            message: error.message
          })
        }
      }

      console.log(`✅ Migrated ${this.migrationStatus.stats.users} users`)
    } catch (error) {
      console.error('Error in user migration:', error)
      throw error
    }
  }

  /**
   * Migrate history data to S3
   */
  async migrateHistoryData() {
    console.log('📚 Migrating history data...')

    try {
      // Get all history data from localStorage
      const allKeys = Object.keys(localStorage)
      const historyKeys = allKeys.filter(key => key.startsWith('history_'))

      if (historyKeys.length === 0) {
        console.log('ℹ️  No history data to migrate')
        return
      }

      for (const key of historyKeys) {
        try {
          const userId = key.replace('history_', '')
          const historyData = JSON.parse(localStorage.getItem(key) || '{}')

          // Migrate books history
          if (historyData.books && historyData.books.length > 0) {
            for (const entry of historyData.books) {
              await this.migrateHistoryEntry(entry, 'book_view')
              this.migrationStatus.stats.history++
            }
          }

          // Migrate quizzes history
          if (historyData.quizzes && historyData.quizzes.length > 0) {
            for (const entry of historyData.quizzes) {
              await this.migrateHistoryEntry(entry, 'quiz_attempt')
              this.migrationStatus.stats.history++
            }
          }

          // Migrate AI chats history
          if (historyData.aiChats && historyData.aiChats.length > 0) {
            for (const entry of historyData.aiChats) {
              await this.migrateHistoryEntry(entry, 'ai_conversation')
              this.migrationStatus.stats.history++
            }
          }

          console.log(`✓ Migrated history for user: ${userId}`)
        } catch (error) {
          console.error(`✗ Error migrating history for ${key}:`, error)
          this.migrationStatus.errors.push({
            type: 'HISTORY',
            key,
            message: error.message
          })
        }
      }

      console.log(`✅ Migrated ${this.migrationStatus.stats.history} history entries`)
    } catch (error) {
      console.error('Error in history migration:', error)
      throw error
    }
  }

  /**
   * Migrate a single history entry
   */
  async migrateHistoryEntry(entry, type) {
    const endpoint = type === 'book_view' ? 'book-view' :
                     type === 'quiz_attempt' ? 'quiz-attempt' :
                     'ai-conversation'

    const response = await fetch(`${API_BASE_URL}/api/history/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    })

    if (!response.ok) {
      throw new Error(`Failed to migrate ${type} entry`)
    }
  }

  /**
   * Migrate notes to S3
   */
  async migrateNotes() {
    console.log('📝 Migrating notes...')

    try {
      const notesData = JSON.parse(localStorage.getItem('edulearn_notes') || '{}')
      const userIds = Object.keys(notesData)

      if (userIds.length === 0) {
        console.log('ℹ️  No notes to migrate')
        return
      }

      for (const userId of userIds) {
        try {
          const userNotes = notesData[userId]

          if (userNotes && userNotes.length > 0) {
            const response = await fetch(`${API_BASE_URL}/api/migration/notes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                notes: userNotes
              })
            })

            if (response.ok) {
              this.migrationStatus.stats.notes += userNotes.length
              console.log(`✓ Migrated ${userNotes.length} notes for user: ${userId}`)
            } else {
              throw new Error(`Failed to migrate notes for user: ${userId}`)
            }
          }
        } catch (error) {
          console.error(`✗ Error migrating notes for user ${userId}:`, error)
          this.migrationStatus.errors.push({
            type: 'NOTES',
            userId,
            message: error.message
          })
        }
      }

      console.log(`✅ Migrated ${this.migrationStatus.stats.notes} notes`)
    } catch (error) {
      console.error('Error in notes migration:', error)
      throw error
    }
  }

  /**
   * Migrate uploaded books metadata
   */
  async migrateUploadedBooks() {
    console.log('📖 Migrating uploaded books metadata...')

    try {
      const uploadedBooks = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')

      if (uploadedBooks.length === 0) {
        console.log('ℹ️  No uploaded books to migrate')
        return
      }

      // Note: This only migrates metadata. Actual PDF files should already be in S3
      // if they were uploaded through the upload feature
      const response = await fetch(`${API_BASE_URL}/api/migration/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: uploadedBooks })
      })

      if (response.ok) {
        this.migrationStatus.stats.settings += uploadedBooks.length
        console.log(`✅ Migrated ${uploadedBooks.length} book metadata entries`)
      } else {
        throw new Error('Failed to migrate uploaded books metadata')
      }
    } catch (error) {
      console.error('Error in books migration:', error)
      this.migrationStatus.errors.push({
        type: 'BOOKS',
        message: error.message
      })
    }
  }

  /**
   * Create backup of localStorage before migration
   */
  createBackup() {
    console.log('💾 Creating localStorage backup...')

    const backup = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      backup[key] = localStorage.getItem(key)
    }

    const backupData = JSON.stringify(backup, null, 2)
    const blob = new Blob([backupData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `localStorage-backup-${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('✅ Backup created and downloaded')
  }

  /**
   * Verify migration - check if data exists in S3
   */
  async verifyMigration() {
    console.log('🔍 Verifying migration...')

    try {
      const response = await fetch(`${API_BASE_URL}/api/migration/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedStats: this.migrationStatus.stats
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Migration verified:', result)
        return result
      } else {
        console.error('❌ Migration verification failed')
        return { success: false }
      }
    } catch (error) {
      console.error('Error verifying migration:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get migration status
   */
  getStatus() {
    return this.migrationStatus
  }

  /**
   * Clear localStorage after successful migration (optional)
   */
  clearLocalStorage() {
    console.log('🗑️  Clearing localStorage...')
    
    const keysToKeep = ['app_version'] // Keep essential keys
    const allKeys = Object.keys(localStorage)
    
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key)
      }
    })

    console.log('✅ localStorage cleared (kept essential keys)')
  }
}

// Export singleton instance
export const migrationService = new MigrationService()

export default MigrationService
