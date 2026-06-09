import { useEffect, useState } from 'react'
import './App.css'

const assignments = [
  { id: 'initial-assignment-1', title: '経済学レポート', deadline: '2026-06-20 23:59' },
  { id: 'initial-assignment-2', title: '英語課題', deadline: '2026-06-15 23:59' },
]
const ASSIGNMENTS_STORAGE_KEY = 'assignmentList'
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/
const DEFAULT_DEADLINE_TIME = '23:59'

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
  }))

const formatDeadlineParts = (year, month, day) =>
  `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

const formatDeadline = (year, month, day, time) =>
  `${formatDeadlineParts(year, month, day)} ${TIME_INPUT_PATTERN.test(time) ? time : DEFAULT_DEADLINE_TIME}`

const getDeadlineDate = (deadline) => new Date(normalizeDeadline(deadline).replace(' ', 'T'))
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

function App() {
  const [assignmentList, setAssignmentList] = useState(() => {
    const savedAssignments = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY)

    if (!savedAssignments) {
      return assignments
    }

    try {
      return normalizeAssignments(JSON.parse(savedAssignments))
    } catch {
      return assignments
    }
  })
  const [taskTitle, setTaskTitle] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState(DEFAULT_DEADLINE_TIME)
  const [detail, setDetail] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingAssignmentId, setEditingAssignmentId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDetail, setEditingDetail] = useState('')
  const [editingYear, setEditingYear] = useState('')
  const [editingMonth, setEditingMonth] = useState('')
  const [editingDay, setEditingDay] = useState('')
  const [editingTime, setEditingTime] = useState(DEFAULT_DEADLINE_TIME)

  useEffect(() => {
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignmentList))
  }, [assignmentList])

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
    }

    setAssignmentList((currentAssignments) => [...currentAssignments, newAssignment])
    setTaskTitle('')
    setYear('')
    setMonth('')
    setDay('')
    setTime(DEFAULT_DEADLINE_TIME)
    setDetail('')
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

    setEditingAssignmentId(assignment.id)
    setEditingTitle(assignment.title)
    setEditingDetail(assignment.detail)
    setEditingYear(year)
    setEditingMonth(month)
    setEditingDay(day)
    setEditingTime(time)
  }

  const handleCancelEditing = () => {
    setEditingAssignmentId(null)
    setEditingTitle('')
    setEditingDetail('')
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

  const filteredAssignments = sortedAssignments.filter((assignment) => {
    if (filter === 'active') {
      return !assignment.completed
    }

    if (filter === 'completed') {
      return assignment.completed
    }

    return true
  })

  return (
    <main className="app">
      <section className="app-card">
        <header className="app-header">
          <div>
            <p className="app-label">課題管理</p>
            <h1>課題リマインダー</h1>
          </div>
        </header>

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
          </div>

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
