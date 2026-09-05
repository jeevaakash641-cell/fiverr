import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft, Lock, UserPlus, Shield, CheckCircle, 
  AlertTriangle, RefreshCw, LogOut 
} from 'lucide-react'
import { 
  fetchAllUsersList, 
  findUserByEmail, 
  registerNewAdmin, 
  changeUserPassword 
} from '../utils/authStorage'

const AdminSettings = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  const [usersList, setUsersList] = useState([])
  const [loading, setLoading] = useState(true)

  // Add Admin Form
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [addingAdmin, setAddingAdmin] = useState(false)

  // Change Password Form
  const [adminPasswordForm, setAdminPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  // Alert State
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })

  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const users = await fetchAllUsersList()
      setUsersList(users || [])
    } catch (err) {
      console.error('Error loading admin settings data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/admin-login')
      return
    }
    if (user.userType !== 'teacher') {
      alert('Access denied. Administrator privileges required.')
      navigate('/dashboard')
      return
    }
    loadData()
  }, [user, navigate])

  if (!user || user.userType !== 'teacher') {
    return null
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
      showAlert('error', 'Please fill in all required fields.')
      return
    }
    if (newAdminForm.password.length < 6) {
      showAlert('error', 'Password must be at least 6 characters long.')
      return
    }
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      showAlert('error', 'Passwords do not match.')
      return
    }

    const existing = findUserByEmail(newAdminForm.email.trim())
    if (existing) {
      showAlert('error', `A user with email ${newAdminForm.email} already exists.`)
      return
    }

    setAddingAdmin(true)
    try {
      const res = registerNewAdmin({
        name: newAdminForm.name.trim(),
        email: newAdminForm.email.trim(),
        password: newAdminForm.password
      })

      if (res.success) {
        showAlert('success', `Admin account created successfully for ${newAdminForm.email}!`)
        setNewAdminForm({ name: '', email: '', password: '', confirmPassword: '' })
        await loadData()
      } else {
        showAlert('error', res.message || 'Failed to create admin account.')
      }
    } catch (err) {
      showAlert('error', 'Error creating admin: ' + err.message)
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault()
    if (!adminPasswordForm.currentPassword) {
      showAlert('error', 'Please enter your current password to verify.')
      return
    }
    if (!adminPasswordForm.newPassword) {
      showAlert('error', 'Please enter a new password.')
      return
    }
    if (adminPasswordForm.newPassword.length < 6) {
      showAlert('error', 'New password must be at least 6 characters long.')
      return
    }
    if (adminPasswordForm.newPassword !== adminPasswordForm.confirmPassword) {
      showAlert('error', 'New passwords do not match.')
      return
    }

    setChangingPassword(true)
    try {
      const res = changeUserPassword(user.email, adminPasswordForm.newPassword, adminPasswordForm.currentPassword)
      if (res.success) {
        showAlert('success', 'Admin password updated successfully!')
        setAdminPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        showAlert('error', res.message || 'Current password is incorrect. Please verify and try again.')
      }
    } catch (err) {
      showAlert('error', 'Error updating password: ' + err.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const adminUsers = usersList.filter(u => u.userType === 'teacher')

  return (
    <div className="min-h-screen bg-gray-50 pb-16 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/admin-panel">
                <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Admin Settings
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                    Security & Control
                  </span>
                </h1>
                <p className="text-xs text-gray-500">Manage administrator accounts, authentication & security</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to="/admin-panel"
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-semibold shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Admin Portal</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-sm font-semibold border border-red-200"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Notification */}
      {alertInfo.message && (
        <div className="container mx-auto px-4 md:px-6 pt-4 max-w-5xl">
          <div className={`p-4 rounded-xl shadow-md border flex items-center space-x-3 animate-fade-in ${
            alertInfo.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {alertInfo.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{alertInfo.message}</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-5xl space-y-6">
        {/* Admin Profile & Status Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
              {(user.name || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {user.name || 'Administrator'}
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                  Super Administrator
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active Session & Cloud Synced</span>
          </div>
        </div>

        {/* Settings Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Change Administrator Password */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-700" />
              Change Admin Password
            </h3>

            <form onSubmit={handleChangeAdminPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Account</label>
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password *</label>
                <input
                  type="password"
                  value={adminPasswordForm.currentPassword}
                  onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password to verify"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password *</label>
                <input
                  type="password"
                  value={adminPasswordForm.newPassword}
                  onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password *</label>
                <input
                  type="password"
                  value={adminPasswordForm.confirmPassword}
                  onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-2.5 bg-emerald-700 text-white rounded-lg font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {changingPassword ? 'Updating Password...' : 'Update Admin Password'}
              </button>
            </form>
          </div>

          {/* Card 2: Add New Administrator */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-700" />
              Add New Administrator
            </h3>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Full Name *</label>
                <input
                  type="text"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Email Address *</label>
                <input
                  type="email"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  placeholder="admin.new@onecommunityely.com"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                  <input
                    type="password"
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password *</label>
                  <input
                    type="password"
                    value={newAdminForm.confirmPassword}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingAdmin}
                className="w-full py-2.5 bg-emerald-700 text-white rounded-lg font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {addingAdmin ? 'Creating Administrator...' : 'Create Admin Account'}
              </button>
            </form>
          </div>
        </div>

        {/* Active Administrators Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-700" />
              Active Administrators in System ({adminUsers.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {adminUsers.map(adm => (
              <div key={adm.email} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                    {(adm.name || adm.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{adm.name || 'Administrator'}</p>
                      {adm.email === user.email && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          You (Current)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{adm.email}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>Role: <span className="font-semibold text-emerald-700">Administrator</span></div>
                  <div>Registered: {adm.registeredAt ? new Date(adm.registeredAt).toLocaleDateString() : 'Active'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}

export default AdminSettings
