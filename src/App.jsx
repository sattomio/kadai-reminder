import { useState } from 'react'
import './App.css'

const assignments = [
  { title: '経済学レポート', deadline: '2026-06-20' },
  { title: '英語課題', deadline: '2026-06-15' },
]

function App() {
  const [assignmentList, setAssignmentList] = useState(assignments)
  const [taskTitle, setTaskTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const formatDeadline = (deadline) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return deadline
    }

    const duplicatedDateMatch = deadline.match(/^(\d{4})\d{2}(-\d{2}-\d{2})$/)

    if (duplicatedDateMatch) {
      return `${duplicatedDateMatch[1]}${duplicatedDateMatch[2]}`
    }

    return deadline
  }

  const handleAddAssignment = () => {
    if (!taskTitle.trim() || !dueDate) {
      return
    }

    const newAssignment = {
      title: taskTitle.trim(),
      deadline: dueDate,
    }

    setAssignmentList((currentAssignments) => [...currentAssignments, newAssignment])
    setTaskTitle('')
    setDueDate('')
  }

  return (
    <main className="app">
      <section className="app-card">
        <header className="app-header">
          <div>
            <p className="app-label">課題管理</p>
            <h1>課題リマインダー</h1>
          </div>
          <button type="button" className="add-button">
            ＋課題を追加
          </button>
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
              <input
                type="date"
                name="deadline"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
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
            <h2 id="pending-title">未提出課題</h2>
            <span className="assignment-count">{assignmentList.length}件</span>
          </div>

          <div className="assignment-list">
            {assignmentList.map((assignment) => (
              <article className="assignment-item" key={`${assignment.title}-${assignment.deadline}`}>
                <h3>{assignment.title}</h3>
                <p>締切：{formatDeadline(assignment.deadline)}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
