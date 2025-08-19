import { useEffect, useMemo, useState } from 'react'
import './App.css'
import React from 'react'

const LOCAL_STORAGE_KEY = 'expenseTracker.expenses'

function App() {
  const [expenses, setExpenses] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const [formState, setFormState] = useState({
    id: null,
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().slice(0, 10),
  })

  const [formError, setFormError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const [filters, setFilters] = useState({
    query: '',
    category: 'All',
    from: '',
    to: '',
  })

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses))
    } catch {
      // ignore persistence errors
    }
  }, [expenses])

  const categories = useMemo(() => {
    const set = new Set(expenses.map(e => e.category).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    const from = filters.from ? new Date(filters.from) : null
    const to = filters.to ? new Date(filters.to) : null

    return expenses
      .filter(e => {
        if (query && !(`${e.description} ${e.category}`.toLowerCase().includes(query))) return false
        if (filters.category !== 'All' && e.category !== filters.category) return false
        const d = new Date(e.date)
        if (from && d < from) return false
        if (to) {
          const end = new Date(to)
          end.setHours(23, 59, 59, 999)
          if (d > end) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [expenses, filters])

  const totalAll = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [expenses])

  const totalFiltered = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [filteredExpenses])

  function formatAmount(value) {
    const num = Number(value) || 0
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function resetForm() {
    setFormState({
      id: null,
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().slice(0, 10),
    })
    setFormError('')
    setIsEditing(false)
  }

  function validateForm() {
    if (!formState.description.trim()) return 'Description is required.'
    const amountNum = Number(formState.amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) return 'Enter a valid amount greater than 0.'
    if (!formState.date) return 'Date is required.'
    return ''
  }

  function handleSubmit(event) {
    event.preventDefault()
    const error = validateForm()
    if (error) {
      setFormError(error)
      return
    }

    const newExpense = {
      id: formState.id || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now())),
      description: formState.description.trim(),
      amount: Number(formState.amount),
      category: formState.category.trim() || 'Uncategorized',
      date: formState.date,
    }

    setExpenses(prev => {
      if (isEditing) {
        return prev.map(e => (e.id === formState.id ? newExpense : e))
      }
      return [newExpense, ...prev]
    })

    resetForm()
  }

  function handleEdit(expense) {
    setFormState({
      id: expense.id,
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
    })
    setIsEditing(true)
    setFormError('')
  }

  function handleDelete(id) {
    setExpenses(prev => prev.filter(e => e.id !== id))
    if (isEditing && formState.id === id) {
      resetForm()
    }
  }

  return (
    <div className="app-container">
      <div className="page-header">
        <h1>Expense Tracker</h1>
        <p className="subtitle">Track your spending, stay on budget, and gain insight at a glance.</p>
      </div>

      <section className="summary">
        <div>
          <span className="summary-label">Total (all):</span>
          <span className="summary-value">{formatAmount(totalAll)}</span>
        </div>
        <div>
          <span className="summary-label">Total (visible):</span>
          <span className="summary-value">{formatAmount(totalFiltered)}</span>
        </div>
        <div>
          <span className="summary-label">Items:</span>
          <span className="summary-value">{filteredExpenses.length}</span>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
        {formError ? <div className="error" role="alert">{formError}</div> : null}
        <form className="expense-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              placeholder="e.g., Groceries"
              value={formState.description}
              onChange={(e) => setFormState(s => ({ ...s, description: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formState.amount}
              onChange={(e) => setFormState(s => ({ ...s, amount: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              list="categoryOptions"
              placeholder="e.g., Food"
              value={formState.category}
              onChange={(e) => setFormState(s => ({ ...s, category: e.target.value }))}
            />
            <datalist id="categoryOptions">
              {categories.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="form-field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={formState.date}
              onChange={(e) => setFormState(s => ({ ...s, date: e.target.value }))}
            />
          </div>
          <div className="form-actions ">
           <button
  style={{ backgroundColor: '#212121', color: '#fff' }}
  className="font-semibold py-2 px-4 rounded"
  type="submit"
>
  {isEditing ? 'Save' : 'Add'}
</button>

            {isEditing ? (
              <button type="button" className="secondary" onClick={resetForm}>Cancel</button>
            ) : (
              <button type="reset" className="secondary" onClick={resetForm}>Reset</button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Filters</h2>
        <div className="filters">
          <input
            type="text"
            placeholder="Search description/category"
            value={filters.query}
            onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
          />
          <select
            value={filters.category}
            onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
          >
            <option value="All">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))}
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))}
          />
          <button className="secondary" onClick={() => setFilters({ query: '', category: 'All', from: '', to: '' })}>Clear</button>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Expenses</h2>
        {filteredExpenses.length === 0 ? (
          <p className="empty">No expenses found.</p>
        ) : (
          <div className="table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="num">Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{expense.date}</td>
                    <td>{expense.description}</td>
                    <td><span className="category-pill">{expense.category}</span></td>
                    <td className="num">{formatAmount(expense.amount)}</td>
                    <td className="actions">
                      <button style={{ backgroundColor: '#212121', color: '#fff' }} className="small" onClick={() => handleEdit(expense)}>Edit</button>
                      <button style={{ backgroundColor: '#212121', color: '#fff' }} className="small danger" onClick={() => handleDelete(expense.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
