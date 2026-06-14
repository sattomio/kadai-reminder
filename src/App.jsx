import { useEffect, useRef, useState } from 'react'
import './App.css'

const assignments = [
  { id: 'initial-assignment-1', title: '経済学レポート', deadline: '2026-06-20 23:59' },
  { id: 'initial-assignment-2', title: '英語課題', deadline: '2026-06-15 23:59' },
]
const ASSIGNMENTS_STORAGE_KEY = 'assignmentList'
const CURRENT_USER_STORAGE_KEY = 'currentUserEmail'
const LOCAL_USERS_STORAGE_KEY = 'localUsers'
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/
const DEFAULT_DEADLINE_TIME = '23:59'
const SUBJECT_TAG_OPTIONS = ['経済学', '英語', '中国語', '統計学']
const CALENDAR_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const createAssignmentId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const normalizeDeadline = (deadline) => {
  if (DATE_TIME_PATTERN.test(deadline)) {
    return deadline
  }

  if (DATE_INPUT_PATTERN.test(deadline)) {
    return `${deadline} ${DEFAULT_DEADLINE_TIME}`
  }

  const duplicatedDateTimeMatch = deadline.match(/^(\d{4})\d{2}(-\d{2}-\d{2})(?: (\d{2}:\d{2}))?$/)

  if (duplicatedDateTimeMatch) {
    return `${duplicatedDateTimeMatch[1]}${duplicatedDateTimeMatch[2]} ${duplicatedDateTimeMatch[3] ?? DEFAULT_DEADLINE_TIME}`
  }

  return deadline
}

const normalizeAssignments = (items) =>
  items.map((assignment) => ({
    id: assignment.id ?? createAssignmentId(),
    ...assignment,
    deadline: normalizeDeadline(assignment.deadline),
    completed: assignment.completed ?? false,
    detail: assignment.detail ?? '',
    subjectTag: assignment.subjectTag ?? '',
  }))

const formatDeadlineParts = (year, month, day) =>
  `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

const formatDeadline = (year, month, day, time) =>
  `${formatDeadlineParts(year, month, day)} ${TIME_INPUT_PATTERN.test(time) ? time : DEFAULT_DEADLINE_TIME}`

const getDeadlineDate = (deadline) => new Date(normalizeDeadline(deadline).replace(' ', 'T'))
const getDeadlineDateKey = (deadline) => normalizeDeadline(deadline).split(' ')[0]
const splitDeadline = (deadline) => {
  const normalizedDeadline = normalizeDeadline(deadline)
  const [datePart, timePart = DEFAULT_DEADLINE_TIME] = normalizedDeadline.split(' ')
  const [year, month, day] = datePart.split('-')

  return {
    year,
    month,
    day,
    time: TIME_INPUT_PATTERN.test(timePart) ? timePart : DEFAULT_DEADLINE_TIME,
  }
}

const getAssignmentAlertStatus = (assignment) => {
  if (assignment.completed) {
    return 'normal'
  }

  const today = new Date()
  const deadline = getDeadlineDate(assignment.deadline)
  const millisecondsUntilDeadline = deadline - today
  const millisecondsPerDay = 1000 * 60 * 60 * 24

  if (millisecondsUntilDeadline < 0) {
    return 'overdue'
  }

  if (millisecondsUntilDeadline <= millisecondsPerDay * 3) {
    return 'urgent'
  }

  return 'normal'
}

const getAssignmentSortRank = (assignment) => {
  if (assignment.completed) {
    return 3
  }

  const alertStatus = getAssignmentAlertStatus(assignment)

  if (alertStatus === 'overdue') {
    return 0
  }

  if (alertStatus === 'urgent') {
    return 1
  }

  return 2
}

const parseSubjectTag = (subjectTag) => {
  if (!subjectTag) {
    return {
      option: '',
      customValue: '',
    }
  }

  if (SUBJECT_TAG_OPTIONS.includes(subjectTag)) {
    return {
      option: subjectTag,
      customValue: '',
    }
  }

  return {
    option: 'その他',
    customValue: subjectTag,
  }
}

const buildSubjectTag = (selectedOption, customValue) => {
  if (!selectedOption) {
    return ''
  }

  if (selectedOption === 'その他') {
    return customValue.trim()
  }

  return selectedOption
}

const getAssignmentsStorageKey = (email) => `assignments:${email}`

const getStoredLoginEmail = () => localStorage.getItem(CURRENT_USER_STORAGE_KEY) ?? ''

const getLocalUsers = () => {
  const savedUsers = localStorage.getItem(LOCAL_USERS_STORAGE_KEY)

  if (!savedUsers) {
    return {}
  }

  try {
    return JSON.parse(savedUsers)
  } catch {
    return {}
  }
}

const saveLocalUsers = (users) => {
  localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users))
}

const loadAssignmentsForEmail = (email) => {
  if (!email) {
    return []
  }

  const userAssignmentsKey = getAssignmentsStorageKey(email)
  const savedAssignments = localStorage.getItem(userAssignmentsKey)

  if (savedAssignments) {
    try {
      return normalizeAssignments(JSON.parse(savedAssignments))
    } catch {
      return assignments
    }
  }

  const legacyAssignments = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY)

  if (legacyAssignments) {
    try {
      const normalizedLegacyAssignments = normalizeAssignments(JSON.parse(legacyAssignments))
      localStorage.setItem(userAssignmentsKey, JSON.stringify(normalizedLegacyAssignments))
      return normalizedLegacyAssignments
    } catch {
      return assignments
    }
  }

  return assignments
}

function App() {
  const assignmentsLoadedRef = useRef(false)
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof Notification === 'undefined') {
      return 'unsupported'
    }

    return Notification.permission
  })
  const [currentUserEmail, setCurrentUserEmail] = useState(() => getStoredLoginEmail())
  const [authMode, setAuthMode] = useState('login')
  const [loginEmail, setLoginEmail] = useState(() => getStoredLoginEmail())
  const [loginPassword, setLoginPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [authError, setAuthError] = useState('')
  const [assignmentList, setAssignmentList] = useState(() => loadAssignmentsForEmail(getStoredLoginEmail()))
  const [taskTitle, setTaskTitle] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState(DEFAULT_DEADLINE_TIME)
  const [detail, setDetail] = useState('')
  const [subjectTagOption, setSubjectTagOption] = useState('')
  const [customSubjectTag, setCustomSubjectTag] = useState('')
  const [filter, setFilter] = useState('all')
  const [subjectTagFilter, setSubjectTagFilter] = useState('all')
  const [editingAssignmentId, setEditingAssignmentId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDetail, setEditingDetail] = useState('')
  const [editingSubjectTagOption, setEditingSubjectTagOption] = useState('')
  const [editingCustomSubjectTag, setEditingCustomSubjectTag] = useState('')
  const [editingYear, setEditingYear] = useState('')
  const [editingMonth, setEditingMonth] = useState('')
  const [editingDay, setEditingDay] = useState('')
  const [editingTime, setEditingTime] = useState(DEFAULT_DEADLINE_TIME)

  useEffect(() => {
    assignmentsLoadedRef.current = false
    setAssignmentList(loadAssignmentsForEmail(currentUserEmail))
  }, [currentUserEmail])

  useEffect(() => {
    if (!currentUserEmail) {
      return
    }

    if (!assignmentsLoadedRef.current) {
      assignmentsLoadedRef.current = true
      return
    }

    localStorage.setItem(
      getAssignmentsStorageKey(currentUserEmail),
      JSON.stringify(assignmentList)
    )
  }, [assignmentList, currentUserEmail])

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }

    const overdueAssignments = assignmentList.filter(
      (assignment) => getAssignmentAlertStatus(assignment) === 'overdue'
    )

    if (overdueAssignments.length > 0) {
      new Notification('課題リマインダー', {
        body: `期限切れ課題が${overdueAssignments.length}件あります`,
      })
      return
    }

    const urgentAssignments = assignmentList.filter(
      (assignment) => getAssignmentAlertStatus(assignment) === 'urgent'
    )

    if (urgentAssignments.length > 0) {
      new Notification('課題リマインダー', {
        body: `締切間近の課題が${urgentAssignments.length}件あります`,
      })
    }
  }, [])

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  const handleSendTestNotification = () => {
    if (notificationPermission !== 'granted' || typeof Notification === 'undefined') {
      return
    }

    new Notification('課題リマインダー', {
      body: '通知機能のテストです',
    })
  }

  const handleLogin = () => {
    const normalizedEmail = loginEmail.trim().toLowerCase()
    const trimmedPassword = loginPassword.trim()

    if (!normalizedEmail || !trimmedPassword) {
      setAuthError('メールアドレスとパスワードを入力してください')
      return
    }

    const users = getLocalUsers()

    if (!users[normalizedEmail] || users[normalizedEmail].password !== trimmedPassword) {
      setAuthError('メールアドレスまたはパスワードが正しくありません')
      return
    }

    localStorage.setItem(CURRENT_USER_STORAGE_KEY, normalizedEmail)
    setCurrentUserEmail(normalizedEmail)
    setLoginEmail(normalizedEmail)
    setLoginPassword('')
    setAuthError('')
    handleCancelEditing()
  }

  const handleRegister = () => {
    const normalizedEmail = registerEmail.trim().toLowerCase()
    const trimmedPassword = registerPassword.trim()
    const trimmedPasswordConfirm = registerPasswordConfirm.trim()

    if (!normalizedEmail || !trimmedPassword || !trimmedPasswordConfirm) {
      setAuthError('メールアドレスとパスワードをすべて入力してください')
      return
    }

    if (trimmedPassword !== trimmedPasswordConfirm) {
      setAuthError('パスワード確認が一致しません')
      return
    }

    const users = getLocalUsers()

    if (users[normalizedEmail]) {
      setAuthError('このメールアドレスは既に登録されています')
      return
    }

    saveLocalUsers({
      ...users,
      [normalizedEmail]: {
        password: trimmedPassword,
      },
    })

    localStorage.setItem(CURRENT_USER_STORAGE_KEY, normalizedEmail)
    setCurrentUserEmail(normalizedEmail)
    setLoginEmail(normalizedEmail)
    setLoginPassword('')
    setRegisterEmail('')
    setRegisterPassword('')
    setRegisterPasswordConfirm('')
    setAuthError('')
    handleCancelEditing()
  }

  const handleLogout = () => {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    setCurrentUserEmail('')
    setLoginEmail('')
    setLoginPassword('')
    setRegisterEmail('')
    setRegisterPassword('')
    setRegisterPasswordConfirm('')
    setAuthError('')
    setAuthMode('login')
    setAssignmentList([])
    setTaskTitle('')
    setYear('')
    setMonth('')
    setDay('')
    setTime(DEFAULT_DEADLINE_TIME)
    setDetail('')
    setFilter('all')
    setSubjectTagFilter('all')
    handleCancelEditing()
  }

  const handleYearChange = (event) => {
    setYear(event.target.value.replace(/\D/g, '').slice(0, 4))
  }

  const handleMonthChange = (event) => {
    setMonth(event.target.value.replace(/\D/g, '').slice(0, 2))
  }

  const handleDayChange = (event) => {
    setDay(event.target.value.replace(/\D/g, '').slice(0, 2))
  }

  const handleTimeChange = (event) => {
    setTime(event.target.value)
  }

  const handleAddAssignment = () => {
    if (!taskTitle.trim() || !year || !month || !day) {
      return
    }

    const newAssignment = {
      id: createAssignmentId(),
      title: taskTitle.trim(),
      deadline: formatDeadline(year, month, day, time),
      completed: false,
      detail: detail.trim(),
      subjectTag: buildSubjectTag(subjectTagOption, customSubjectTag),
    }

    setAssignmentList((currentAssignments) => [...currentAssignments, newAssignment])
    setTaskTitle('')
    setYear('')
    setMonth('')
    setDay('')
    setTime(DEFAULT_DEADLINE_TIME)
    setDetail('')
    setSubjectTagOption('')
    setCustomSubjectTag('')
  }

  const handleDeleteAssignment = (assignmentToDelete) => {
    setAssignmentList((currentAssignments) =>
      currentAssignments.filter((assignment) => assignment.id !== assignmentToDelete.id)
    )
  }

  const handleToggleCompleted = (assignmentToToggle) => {
    setAssignmentList((currentAssignments) =>
      currentAssignments.map((assignment) => {
        if (assignment.id === assignmentToToggle.id) {
          return {
            ...assignment,
            completed: !assignment.completed,
          }
        }

        return assignment
      })
    )
  }

  const handleStartEditing = (assignment) => {
    const { year, month, day, time } = splitDeadline(assignment.deadline)
    const { option, customValue } = parseSubjectTag(assignment.subjectTag)

    setEditingAssignmentId(assignment.id)
    setEditingTitle(assignment.title)
    setEditingDetail(assignment.detail)
    setEditingSubjectTagOption(option)
    setEditingCustomSubjectTag(customValue)
    setEditingYear(year)
    setEditingMonth(month)
    setEditingDay(day)
    setEditingTime(time)
  }

  const handleCancelEditing = () => {
    setEditingAssignmentId(null)
    setEditingTitle('')
    setEditingDetail('')
    setEditingSubjectTagOption('')
    setEditingCustomSubjectTag('')
    setEditingYear('')
    setEditingMonth('')
    setEditingDay('')
    setEditingTime(DEFAULT_DEADLINE_TIME)
  }

  const handleSaveEditing = (assignmentId) => {
    if (!editingTitle.trim() || !editingYear || !editingMonth || !editingDay) {
      return
    }

    setAssignmentList((currentAssignments) =>
      currentAssignments.map((assignment) => {
        if (assignment.id === assignmentId) {
          return {
            ...assignment,
            title: editingTitle.trim(),
            detail: editingDetail.trim(),
            subjectTag: buildSubjectTag(editingSubjectTagOption, editingCustomSubjectTag),
            deadline: formatDeadline(editingYear, editingMonth, editingDay, editingTime),
          }
        }

        return assignment
      })
    )

    handleCancelEditing()
  }

  const sortedAssignments = [...assignmentList].sort((leftAssignment, rightAssignment) => {
    const rankDifference =
      getAssignmentSortRank(leftAssignment) - getAssignmentSortRank(rightAssignment)

    if (rankDifference !== 0) {
      return rankDifference
    }

    return getDeadlineDate(leftAssignment.deadline) - getDeadlineDate(rightAssignment.deadline)
  })

  const matchesSubjectTagFilter = (assignment) => {
    if (subjectTagFilter === 'all') {
      return true
    }

    if (subjectTagFilter === 'その他') {
      return assignment.subjectTag !== '' && !SUBJECT_TAG_OPTIONS.includes(assignment.subjectTag)
    }

    return assignment.subjectTag === subjectTagFilter
  }

  const filteredAssignments = sortedAssignments.filter((assignment) => {
    if (!matchesSubjectTagFilter(assignment)) {
      return false
    }

    if (filter === 'active') {
      return !assignment.completed
    }

    if (filter === 'completed') {
      return assignment.completed
    }

    return true
  })

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()
  const todayDateKey = formatDeadlineParts(
    String(currentYear),
    String(currentMonthIndex + 1),
    String(now.getDate())
  )
  const monthStartDate = new Date(currentYear, currentMonthIndex, 1)
  const daysInCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate()
  const leadingBlankDays = monthStartDate.getDay()
  const calendarAssignmentsByDate = assignmentList
    .filter((assignment) => {
      if (assignment.completed) {
        return false
      }

      const deadlineDate = getDeadlineDate(assignment.deadline)

      return (
        deadlineDate.getFullYear() === currentYear &&
        deadlineDate.getMonth() === currentMonthIndex
      )
    })
    .sort((leftAssignment, rightAssignment) => {
      return getDeadlineDate(leftAssignment.deadline) - getDeadlineDate(rightAssignment.deadline)
    })
    .reduce((assignmentMap, assignment) => {
      const dateKey = getDeadlineDateKey(assignment.deadline)

      if (!assignmentMap[dateKey]) {
        assignmentMap[dateKey] = []
      }

      assignmentMap[dateKey].push(assignment)
      return assignmentMap
    }, {})

  const calendarCellCount = Math.ceil((leadingBlankDays + daysInCurrentMonth) / 7) * 7
  const calendarDays = Array.from({ length: calendarCellCount }, (_, index) => {
    const dayNumber = index - leadingBlankDays + 1

    if (dayNumber < 1 || dayNumber > daysInCurrentMonth) {
      return {
        key: `empty-${index}`,
        isCurrentMonth: false,
      }
    }

    const dateKey = formatDeadlineParts(
      String(currentYear),
      String(currentMonthIndex + 1),
      String(dayNumber)
    )

    return {
      key: dateKey,
      dayNumber,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayDateKey,
      assignments: calendarAssignmentsByDate[dateKey] ?? [],
    }
  })

  if (!currentUserEmail) {
    return (
      <main className="app">
        <section className="app-card login-card">
          <header className="app-header">
            <div>
              <p className="app-label">課題管理</p>
              <h1>課題リマインダー</h1>
            </div>
          </header>

          <section className="login-section" aria-labelledby="login-title">
            <div className="section-heading login-heading">
              <div className="login-heading-content">
                <h2 id="login-title">{authMode === 'register' ? '新規登録' : 'ログイン'}</h2>
                <div className="auth-mode-actions">
                  <button
                    type="button"
                    className={`filter-button${authMode === 'login' ? ' filter-button-active' : ''}`}
                    onClick={() => {
                      setAuthMode('login')
                      setAuthError('')
                    }}
                  >
                    ログイン
                  </button>
                  <button
                    type="button"
                    className={`filter-button${authMode === 'register' ? ' filter-button-active' : ''}`}
                    onClick={() => {
                      setAuthMode('register')
                      setAuthError('')
                    }}
                  >
                    新規登録
                  </button>
                </div>
              </div>
            </div>
            <div className="login-form">
              {authMode === 'register' ? (
                <>
                  <label className="form-field">
                    <span>メールアドレス</span>
                    <input
                      type="email"
                      name="registerEmail"
                      placeholder="satto@example.com"
                      value={registerEmail}
                      onChange={(event) => setRegisterEmail(event.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>パスワード</span>
                    <input
                      type="password"
                      name="registerPassword"
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>パスワード確認</span>
                    <input
                      type="password"
                      name="registerPasswordConfirm"
                      value={registerPasswordConfirm}
                      onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                    />
                  </label>
                  {authError && <p className="auth-error">{authError}</p>}
                  <button type="button" className="add-button login-button" onClick={handleRegister}>
                    新規登録
                  </button>
                </>
              ) : (
                <>
                  <label className="form-field">
                    <span>メールアドレス</span>
                    <input
                      type="email"
                      name="loginEmail"
                      placeholder="satto@example.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>パスワード</span>
                    <input
                      type="password"
                      name="loginPassword"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                    />
                  </label>
                  {authError && <p className="auth-error">{authError}</p>}
                  <button type="button" className="add-button login-button" onClick={handleLogin}>
                    ログイン
                  </button>
                </>
              )}
              <p className="auth-note">
                このログインは端末内だけで使う簡易機能です。本物の安全な認証ではありません。
              </p>
            </div>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <section className="app-card">
        <header className="app-header">
          <div className="app-header-content">
            <div>
              <p className="app-label">課題管理</p>
              <h1>課題リマインダー</h1>
            </div>
            <div className="session-info">
              <p className="session-email">{currentUserEmail}</p>
              <button type="button" className="logout-button" onClick={handleLogout}>
                ログアウト
              </button>
            </div>
          </div>
        </header>

        <section className="notification-section" aria-labelledby="notification-title">
          <div className="section-heading notification-heading">
            <h2 id="notification-title">通知設定</h2>
          </div>
          <div className="notification-panel">
            <p
              className={`notification-status${
                notificationPermission === 'granted'
                  ? ' notification-status-granted'
                  : notificationPermission === 'denied'
                    ? ' notification-status-denied'
                    : notificationPermission === 'unsupported'
                      ? ' notification-status-unsupported'
                      : ''
              }`}
            >
              {notificationPermission === 'granted' && '通知は許可されています'}
              {notificationPermission === 'denied' && '通知は拒否されています'}
              {notificationPermission === 'default' && '通知はまだ許可されていません'}
              {notificationPermission === 'unsupported' && 'このブラウザでは通知を利用できません'}
            </p>
            <div className="notification-actions">
              <button
                type="button"
                className="notification-button"
                onClick={handleRequestNotificationPermission}
              >
                通知を許可
              </button>
              <button
                type="button"
                className="notification-button notification-button-secondary"
                onClick={handleSendTestNotification}
                disabled={notificationPermission !== 'granted'}
              >
                テスト通知
              </button>
            </div>
          </div>
        </section>

        <section className="assignment-form-section" aria-labelledby="assignment-form-title">
          <div className="section-heading assignment-form-heading">
            <h2 id="assignment-form-title">課題を追加</h2>
          </div>

          <form className="assignment-form">
            <label className="form-field">
              <span>課題名</span>
              <input
                type="text"
                name="title"
                placeholder="例：情報科学レポート"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
            </label>

            <label className="form-field">
              <span>締切日</span>
              <div className="date-fields" role="group" aria-label="締切日">
                <input
                  type="text"
                  inputMode="numeric"
                  name="year"
                  placeholder="2026"
                  value={year}
                  onChange={handleYearChange}
                />
                <span className="date-field-unit">年</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name="month"
                  placeholder="07"
                  value={month}
                  onChange={handleMonthChange}
                />
                <span className="date-field-unit">月</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name="day"
                  placeholder="10"
                  value={day}
                  onChange={handleDayChange}
                />
                <span className="date-field-unit">日</span>
              </div>
            </label>

            <label className="form-field time-field">
              <span>締切時間</span>
              <input type="time" name="time" value={time} onChange={handleTimeChange} />
            </label>

            <label className="form-field subject-tag-field">
              <span>教科タグ</span>
              <select
                name="subjectTag"
                value={subjectTagOption}
                onChange={(event) => setSubjectTagOption(event.target.value)}
              >
                <option value="">未選択</option>
                {SUBJECT_TAG_OPTIONS.map((tagOption) => (
                  <option key={tagOption} value={tagOption}>
                    {tagOption}
                  </option>
                ))}
                <option value="その他">その他</option>
              </select>
              {subjectTagOption === 'その他' && (
                <input
                  type="text"
                  name="customSubjectTag"
                  placeholder="教科タグを入力"
                  value={customSubjectTag}
                  onChange={(event) => setCustomSubjectTag(event.target.value)}
                />
              )}
            </label>

            <label className="form-field detail-field">
              <span>詳細</span>
              <textarea
                name="detail"
                placeholder="提出先、課題内容、メモなど"
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="add-button assignment-form-button"
              onClick={handleAddAssignment}
            >
              追加
            </button>
          </form>
        </section>

        <section className="assignment-section" aria-labelledby="pending-title">
          <div className="section-heading">
            <div className="assignment-section-title">
              <h2 id="pending-title">課題一覧</h2>
              <span className="assignment-count">{filteredAssignments.length}件</span>
            </div>
            <div className="filter-panel">
              <div className="filter-actions" aria-label="課題フィルター">
                <button
                  type="button"
                  className={`filter-button${filter === 'all' ? ' filter-button-active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  すべて
                </button>
                <button
                  type="button"
                  className={`filter-button${filter === 'active' ? ' filter-button-active' : ''}`}
                  onClick={() => setFilter('active')}
                >
                  未提出
                </button>
                <button
                  type="button"
                  className={`filter-button${filter === 'completed' ? ' filter-button-active' : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  提出済み
                </button>
              </div>
              <div className="filter-actions" aria-label="教科タグフィルター">
                <button
                  type="button"
                  className={`filter-button${subjectTagFilter === 'all' ? ' filter-button-active' : ''}`}
                  onClick={() => setSubjectTagFilter('all')}
                >
                  すべて
                </button>
                {SUBJECT_TAG_OPTIONS.map((tagOption) => (
                  <button
                    key={tagOption}
                    type="button"
                    className={`filter-button${subjectTagFilter === tagOption ? ' filter-button-active' : ''}`}
                    onClick={() => setSubjectTagFilter(tagOption)}
                  >
                    {tagOption}
                  </button>
                ))}
                <button
                  type="button"
                  className={`filter-button${subjectTagFilter === 'その他' ? ' filter-button-active' : ''}`}
                  onClick={() => setSubjectTagFilter('その他')}
                >
                  その他
                </button>
              </div>
            </div>
          </div>

          <section className="calendar-section" aria-labelledby="calendar-title">
            <div className="calendar-section-header">
              <div>
                <h3 id="calendar-title">{currentYear}年{currentMonthIndex + 1}月の締切</h3>
                <p className="calendar-caption">未提出の課題だけを表示しています</p>
              </div>
            </div>
            <div className="calendar-grid" role="grid" aria-label="今月の課題カレンダー">
              {CALENDAR_WEEKDAYS.map((weekday) => (
                <div key={weekday} className="calendar-weekday" role="columnheader">
                  {weekday}
                </div>
              ))}
              {calendarDays.map((calendarDay) => (
                <div
                  key={calendarDay.key}
                  className={`calendar-day${calendarDay.isCurrentMonth ? '' : ' calendar-day-empty'}${calendarDay.isToday ? ' calendar-day-today' : ''}`}
                  role="gridcell"
                >
                  {calendarDay.isCurrentMonth && (
                    <>
                      <div className="calendar-day-heading">
                        <span className="calendar-day-number">{calendarDay.dayNumber}</span>
                        {calendarDay.isToday && <span className="calendar-today-badge">今日</span>}
                      </div>
                      <div className="calendar-day-assignments">
                        {calendarDay.assignments.map((assignment) => (
                          <span
                            key={assignment.id}
                            className="calendar-assignment-chip"
                            title={assignment.title}
                          >
                            {assignment.title}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="assignment-list">
            {filteredAssignments.map((assignment) => {
              const alertStatus = getAssignmentAlertStatus(assignment)
              const isEditing = editingAssignmentId === assignment.id

              return (
                <article
                  className={`assignment-item${assignment.completed ? ' assignment-item-completed' : ''}${alertStatus === 'urgent' ? ' assignment-item-urgent' : ''}${alertStatus === 'overdue' ? ' assignment-item-overdue' : ''}`}
                  key={assignment.id}
                >
                  <div className="assignment-item-header">
                    <div className="assignment-item-title-group">
                      {isEditing ? (
                        <div className="assignment-edit-fields">
                          <label className="assignment-edit-field">
                            <span>課題名</span>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                            />
                          </label>
                          <label className="assignment-edit-field">
                            <span>締切日</span>
                            <div className="date-fields" role="group" aria-label="編集用締切日">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editingYear}
                                onChange={(event) =>
                                  setEditingYear(event.target.value.replace(/\D/g, '').slice(0, 4))
                                }
                              />
                              <span className="date-field-unit">年</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editingMonth}
                                onChange={(event) =>
                                  setEditingMonth(event.target.value.replace(/\D/g, '').slice(0, 2))
                                }
                              />
                              <span className="date-field-unit">月</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editingDay}
                                onChange={(event) =>
                                  setEditingDay(event.target.value.replace(/\D/g, '').slice(0, 2))
                                }
                              />
                              <span className="date-field-unit">日</span>
                            </div>
                          </label>
                          <label className="assignment-edit-field">
                            <span>締切時間</span>
                            <input
                              type="time"
                              value={editingTime}
                              onChange={(event) => setEditingTime(event.target.value)}
                            />
                          </label>
                          <label className="assignment-edit-field">
                            <span>教科タグ</span>
                            <select
                              value={editingSubjectTagOption}
                              onChange={(event) => setEditingSubjectTagOption(event.target.value)}
                            >
                              <option value="">未選択</option>
                              {SUBJECT_TAG_OPTIONS.map((tagOption) => (
                                <option key={tagOption} value={tagOption}>
                                  {tagOption}
                                </option>
                              ))}
                              <option value="その他">その他</option>
                            </select>
                            {editingSubjectTagOption === 'その他' && (
                              <input
                                type="text"
                                placeholder="教科タグを入力"
                                value={editingCustomSubjectTag}
                                onChange={(event) => setEditingCustomSubjectTag(event.target.value)}
                              />
                            )}
                          </label>
                          <label className="assignment-edit-field">
                            <span>詳細</span>
                            <textarea
                              value={editingDetail}
                              onChange={(event) => setEditingDetail(event.target.value)}
                              placeholder="提出先、課題内容、メモなど"
                            />
                          </label>
                        </div>
                      ) : (
                        <h3>{assignment.title}</h3>
                      )}
                      <div className="assignment-item-badges">
                        {assignment.subjectTag && <span className="subject-tag-badge">{assignment.subjectTag}</span>}
                        {assignment.completed && <span className="completed-badge">提出済み</span>}
                        {alertStatus === 'urgent' && <span className="urgent-badge">締切間近</span>}
                        {alertStatus === 'overdue' && <span className="overdue-badge">期限切れ</span>}
                      </div>
                    </div>
                    <div className="assignment-item-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="save-button"
                            onClick={() => handleSaveEditing(assignment.id)}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            className="cancel-button"
                            onClick={handleCancelEditing}
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => handleStartEditing(assignment)}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className={`toggle-button${assignment.completed ? ' toggle-button-completed' : ''}`}
                            onClick={() => handleToggleCompleted(assignment)}
                          >
                            {assignment.completed ? '未提出に戻す' : '提出済みにする'}
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleDeleteAssignment(assignment)}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="assignment-deadline">
                    <span className="assignment-deadline-label">締切：</span>
                    <span className="assignment-deadline-value">{assignment.deadline}</span>
                  </p>
                  {!isEditing && assignment.detail && (
                    <p className="assignment-detail">{assignment.detail}</p>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
