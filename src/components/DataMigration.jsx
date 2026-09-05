import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Cloud, Database, Download, Upload, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react'
import { migrationService } from '../services/migrationService'

const DataMigration = () => {
  const navigate = useNavigate()
  const [migrationState, setMigrationState] = useState({
    status: 'idle', // idle, backing-up, migrating, verifying, completed, error
    progress: 0,
    stats: {
      users: 0,
      history: 0,
      notes: 0,
      settings: 0
    },
    errors: [],
    backupCreated: false
  })

  const handleCreateBackup = () => {
    setMigrationState(prev => ({ ...prev, status: 'backing-up' }))
    
    try {
      migrationService.createBackup()
      setMigrationState(prev => ({ 
        ...prev, 
        status: 'idle',
        backupCreated: true 
      }))
      alert('✅ Backup created and downloaded successfully!')
    } catch (error) {
      console.error('Backup error:', error)
      alert('❌ Failed to create backup: ' + error.message)
      setMigrationState(prev => ({ ...prev, status: 'idle' }))
    }
  }

  const handleStartMigration = async () => {
    if (!migrationState.backupCreated) {
      const confirm = window.confirm(
        '⚠️ You haven\'t created a backup yet. It\'s highly recommended to create a backup before migration.\n\nDo you want to proceed without backup?'
      )
      if (!confirm) return
    }

    const finalConfirm = window.confirm(
      '🚀 This will migrate all your localStorage data to AWS S3.\n\n' +
      'Data to be migrated:\n' +
      '• User profiles and settings\n' +
      '• Learning history (books, quizzes, AI chats)\n' +
      '• Study notes\n' +
      '• Uploaded books metadata\n\n' +
      'Continue with migration?'
    )

    if (!finalConfirm) return

    setMigrationState(prev => ({ 
      ...prev, 
      status: 'migrating',
      progress: 10
    }))

    try {
      // Start migration
      const result = await migrationService.migrateAllData()

      if (result.success) {
        setMigrationState(prev => ({ 
          ...prev, 
          status: 'verifying',
          progress: 80,
          stats: result.stats,
          errors: result.errors
        }))

        // Verify migration
        const verification = await migrationService.verifyMigration()

        if (verification.success) {
          setMigrationState(prev => ({ 
            ...prev, 
            status: 'completed',
            progress: 100
          }))

          alert('✅ Migration completed and verified successfully!')
        } else {
          throw new Error('Migration verification failed')
        }
      } else {
        throw new Error('Migration failed')
      }
    } catch (error) {
      console.error('Migration error:', error)
      setMigrationState(prev => ({ 
        ...prev, 
        status: 'error',
        errors: [...prev.errors, { type: 'FATAL', message: error.message }]
      }))
      alert('❌ Migration failed: ' + error.message)
    }
  }

  const handleClearLocalStorage = () => {
    const confirm = window.confirm(
      '⚠️ WARNING: This will clear all localStorage data!\n\n' +
      'Make sure migration is completed and verified before proceeding.\n\n' +
      'This action cannot be undone. Continue?'
    )

    if (!confirm) return

    const finalConfirm = window.confirm(
      '🚨 FINAL WARNING!\n\n' +
      'Are you absolutely sure you want to clear localStorage?\n\n' +
      'All local data will be permanently deleted!'
    )

    if (!finalConfirm) return

    try {
      migrationService.clearLocalStorage()
      alert('✅ localStorage cleared successfully!')
      window.location.reload()
    } catch (error) {
      console.error('Clear error:', error)
      alert('❌ Failed to clear localStorage: ' + error.message)
    }
  }

  const getStatusIcon = () => {
    switch (migrationState.status) {
      case 'backing-up':
      case 'migrating':
      case 'verifying':
        return <Loader className="h-8 w-8 text-blue-600 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />
      default:
        return <Cloud className="h-8 w-8 text-indigo-600" />
    }
  }

  const getStatusMessage = () => {
    switch (migrationState.status) {
      case 'backing-up':
        return 'Creating backup...'
      case 'migrating':
        return 'Migrating data to AWS S3...'
      case 'verifying':
        return 'Verifying migration...'
      case 'completed':
        return 'Migration completed successfully!'
      case 'error':
        return 'Migration failed!'
      default:
        return 'Ready to migrate'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <div className="flex items-center space-x-2 md:space-x-3">
              <Cloud className="h-6 w-6 md:h-8 md:w-8 text-indigo-600" />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-800">Data Migration</h1>
                <p className="text-xs md:text-sm text-gray-600">Transfer localStorage to AWS S3</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-4xl">
        {/* Status Card */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {getStatusIcon()}
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{getStatusMessage()}</h2>
                <p className="text-sm text-gray-600">
                  {migrationState.status === 'idle' && 'Click "Start Migration" to begin'}
                  {migrationState.status === 'migrating' && 'Please wait, this may take a few minutes...'}
                  {migrationState.status === 'completed' && 'All data has been safely migrated to AWS S3'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(migrationState.status === 'migrating' || migrationState.status === 'verifying') && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${migrationState.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                {migrationState.progress}% Complete
              </p>
            </div>
          )}

          {/* Migration Stats */}
          {migrationState.stats.users > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <Database className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{migrationState.stats.users}</p>
                <p className="text-sm text-blue-700">Users</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Database className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{migrationState.stats.history}</p>
                <p className="text-sm text-green-700">History</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <Database className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-900">{migrationState.stats.notes}</p>
                <p className="text-sm text-purple-700">Notes</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <Database className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-900">{migrationState.stats.settings}</p>
                <p className="text-sm text-orange-700">Settings</p>
              </div>
            </div>
          )}

          {/* Errors */}
          {migrationState.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Migration Errors</h3>
                  <ul className="space-y-1">
                    {migrationState.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700">
                        [{error.type}] {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Step 1: Create Backup */}
          <div className="card">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  migrationState.backupCreated ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {migrationState.backupCreated ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-lg font-bold text-gray-600">1</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Create Backup (Recommended)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Download a backup of all your localStorage data before migration. This ensures you can restore your data if needed.
                </p>
                <button
                  onClick={handleCreateBackup}
                  disabled={migrationState.status !== 'idle' || migrationState.backupCreated}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-5 w-5" />
                  <span>{migrationState.backupCreated ? 'Backup Created' : 'Create Backup'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Start Migration */}
          <div className="card">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  migrationState.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {migrationState.status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-lg font-bold text-gray-600">2</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Start Migration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Transfer all your data from localStorage to AWS S3 cloud storage. This includes user profiles, history, notes, and settings.
                </p>
                <button
                  onClick={handleStartMigration}
                  disabled={migrationState.status !== 'idle' && migrationState.status !== 'error'}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-5 w-5" />
                  <span>
                    {migrationState.status === 'completed' ? 'Migration Completed' : 'Start Migration'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Clear localStorage (Optional) */}
          {migrationState.status === 'completed' && (
            <div className="card border-2 border-red-200">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-red-600">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Clear localStorage (Optional)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    After successful migration, you can optionally clear localStorage to free up space. Your data will be loaded from S3 going forward.
                  </p>
                  <button
                    onClick={handleClearLocalStorage}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <AlertTriangle className="h-5 w-5" />
                    <span>Clear localStorage</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Migration is a one-time process to move your data to cloud storage</li>
                <li>• Your data will be securely stored in AWS S3</li>
                <li>• After migration, data will be automatically synced with S3</li>
                <li>• You can access your data from any device after migration</li>
                <li>• Creating a backup before migration is highly recommended</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DataMigration
