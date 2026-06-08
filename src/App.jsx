import { useEffect, useState } from 'react'
import './App.css'

const assignments = [
  { title: '経済学レポート', deadline: '2026-06-20' },
  { title: '英語課題', deadline: '2026-06-15' },
]
const ASSIGNMENTS_STORAGE_KEY = 'assignmentList'
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const normalizeDeadline = (deadline) => {
  if (DATE_INPUT_PATTERN.test(deadline)) {
    return deadline
  }

  const duplicatedDateMatch = deadline.match(/^(\d{4})\d{2}(-\d{2}-\d{2})$/)

  if (duplicatedDateMatch) {
    return `${duplicatedDateMatch[1]}${duplicatedDateMatch[2]}`
  }

  return deadline
}

const normalizeAssignments = (items) =>
  items.map((assignment) => ({
    ...assignment,
    deadline: normalizeDeadline(assignment.deadline),
  }))

const formatDeadlineParts = (year, month, day) =>
  `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

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

  const handleAddAssignment = () => {
    if (!taskTitle.trim() || !year || !month || !day) {
      return
    }

    const newAssignment = {
      title: taskTitle.trim(),
      deadline: formatDeadlineParts(year, month, day),
    }

    setAssignmentList((currentAssignments) => [...currentAssignments, newAssignment])
    setTaskTitle('')
    setYear('')
    setMonth('')
    setDay('')
  }

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
            {assignmentList.map((assignment) => (
              <article className="assignment-item" key={`${assignment.title}-${assignment.deadline}`}>
                <h3>{assignment.title}</h3>
                <p>締切：{assignment.deadline}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
