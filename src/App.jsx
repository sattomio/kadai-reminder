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
  }))

const formatDeadlineParts = (year, month, day) =>
  `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

const formatDeadline = (year, month, day, time) =>
  `${formatDeadlineParts(year, month, day)} ${TIME_INPUT_PATTERN.test(time) ? time : DEFAULT_DEADLINE_TIME}`

const getDeadlineDate = (deadline) => new Date(normalizeDeadline(deadline).replace(' ', 'T'))

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
    }

    setAssignmentList((currentAssignments) => [...currentAssignments, newAssignment])
    setTaskTitle('')
    setYear('')
    setMonth('')
    setDay('')
    setTime(DEFAULT_DEADLINE_TIME)
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

  const sortedAssignments = [...assignmentList].sort((leftAssignment, rightAssignment) => {
    const rankDifference =
      getAssignmentSortRank(leftAssignment) - getAssignmentSortRank(rightAssignment)

    if (rankDifference !== 0) {
      return rankDifference
    }

    return getDeadlineDate(leftAssignment.deadline) - getDeadlineDate(rightAssignment.deadline)
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
            <h2 id="pending-title">未提出課題</h2>
            <span className="assignment-count">{assignmentList.length}件</span>
          </div>

          <div className="assignment-list">
            {sortedAssignments.map((assignment) => {
              const alertStatus = getAssignmentAlertStatus(assignment)

              return (
                <article
                  className={`assignment-item${assignment.completed ? ' assignment-item-completed' : ''}${alertStatus === 'urgent' ? ' assignment-item-urgent' : ''}${alertStatus === 'overdue' ? ' assignment-item-overdue' : ''}`}
                  key={assignment.id}
                >
                  <div className="assignment-item-header">
                    <div className="assignment-item-title-group">
                      <h3>{assignment.title}</h3>
                      <div className="assignment-item-badges">
                        {assignment.completed && <span className="completed-badge">提出済み</span>}
                        {alertStatus === 'urgent' && <span className="urgent-badge">締切間近</span>}
                        {alertStatus === 'overdue' && <span className="overdue-badge">期限切れ</span>}
                      </div>
                    </div>
                    <div className="assignment-item-actions">
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
                    </div>
                  </div>
                  <p>締切：{assignment.deadline}</p>
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
