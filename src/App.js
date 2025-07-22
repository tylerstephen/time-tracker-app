// Full App.js — corrected, clean, and complete
import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  format, parseISO, startOfWeek, addDays, subDays, differenceInCalendarDays
} from 'date-fns';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import './App.css';

const CATEGORY_COLOR = {
  family: '#6366F1',
  friends: '#10B981',
  couple: '#F59E0B',
  personal: '#EF4444'
};
const CATEGORIES = Object.keys(CATEGORY_COLOR);

export default function App() {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState({ id: null, title: '', category: 'family', start: '', end: '', hours: '', notes: '' });
  const [filter, setFilter] = useState({ start: '', end: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const itemsPerPage = 10;

  useEffect(() => {
    const stored = localStorage.getItem('activities');
    if (stored) setActivities(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFilterChange = (e) => setFilter({ ...filter, [e.target.name]: e.target.value });
  const handleResetFilters = () => {
    setFilter({ start: '', end: '' });
    setSearchTerm('');
    setFilterCategory('all');
    setCurrentPage(1);
  };

  const addOrUpdateActivity = () => {
    if (isEditing) {
      setActivities(activities.map(a => a.id === form.id ? form : a));
      setIsEditing(false);
    } else {
      setActivities([...activities, { ...form, id: Date.now() }]);
    }
    setForm({ id: null, title: '', category: 'family', start: '', end: '', hours: '', notes: '' });
  };

  const editActivity = (act) => {
    setForm(act);
    setIsEditing(true);
  };

  const deleteActivity = (id) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const filtered = activities.filter(act => {
    const inDateRange = (!filter.start || !filter.end) || (parseISO(act.start) >= parseISO(filter.start) && parseISO(act.start) <= parseISO(filter.end));
    const matchesSearch = act.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || act.category === filterCategory;
    return inDateRange && matchesSearch && matchesCategory;
  });

  const sorted = [...filtered].sort((a, b) => sortOrder === 'asc' ? parseISO(a.start) - parseISO(b.start) : parseISO(b.start) - parseISO(a.start));
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  const summary = CATEGORIES.map(cat => ({
    name: cat,
    value: filtered.filter(a => a.category === cat).reduce((sum, a) => sum + Number(a.hours || 0), 0),
  }));

  const timeSeries = {};
  filtered.forEach(a => {
    const dateKey = format(parseISO(a.start), 'yyyy-MM');
    if (!timeSeries[dateKey]) timeSeries[dateKey] = { date: dateKey };
    timeSeries[dateKey][a.category] = (timeSeries[dateKey][a.category] || 0) + Number(a.hours || 0);
  });
  const timeData = Object.values(timeSeries).sort((a, b) => new Date(a.date) - new Date(b.date));

  const calendarMap = {};
  filtered.forEach(a => {
    const startDate = parseISO(a.start);
    const endDate = parseISO(a.end || a.start);
    const days = differenceInCalendarDays(endDate, startDate);
    const hoursPerDay = Number(a.hours || 0) / (days + 1);
    for (let i = 0; i <= days; i++) {
      const day = format(addDays(startDate, i), 'yyyy-MM-dd');
      if (!calendarMap[day]) calendarMap[day] = {};
      calendarMap[day][a.category] = (calendarMap[day][a.category] || 0) + hoursPerDay;
    }
  });
  const heatmapValues = Object.entries(calendarMap).map(([day, categoryData]) => {
    const topCategory = Object.entries(categoryData).sort((a, b) => b[1] - a[1])[0];
    const totalHours = Object.values(categoryData).reduce((sum, h) => sum + h, 0);
    return {
      date: day,
      count: totalHours,
      color: CATEGORY_COLOR[topCategory[0]]
    };
  });

  return (
    <div className={darkMode ? 'container dark' : 'container'} style={{ maxWidth: '100%', padding: '1rem' }}>
      <header>
        <h1>Time Tracker</h1>
        <p>Track and analyze how you spend your time</p>
        <button onClick={() => setDarkMode(!darkMode)}>Toggle {darkMode ? 'Light' : 'Dark'} Mode</button>
      </header>

      <section className="card">
        <h2>Log Activity</h2>
        <div className="form-grid">
          <input type="text" name="title" placeholder="Title" value={form.title} onChange={handleChange} />
          <select name="category" value={form.category} onChange={handleChange}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          <input type="date" name="start" value={form.start} onChange={handleChange} />
          <input type="date" name="end" value={form.end} onChange={handleChange} />
          <input type="number" name="hours" placeholder="Hours" value={form.hours} onChange={handleChange} />
          <textarea name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} />
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <button className="primary" onClick={addOrUpdateActivity} style={{ width: '100%' }}>{isEditing ? 'Update' : 'Add'} Activity</button>
        </div>
      </section>

      <section className="card">
        <h2>Filters</h2>
        <div className="form-grid">
          <input type="date" name="start" value={filter.start} onChange={handleFilterChange} />
          <input type="date" name="end" value={filter.end} onChange={handleFilterChange} />
          <input type="text" placeholder="Search title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
          <button onClick={handleResetFilters}>Reset Filters</button>
        </div>
      </section>

      <section className="card">
        <h2>Pie Chart - Time Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={summary} dataKey="value" nameKey="name" outerRadius={100}>
              {summary.map((entry, index) => (
                <Cell key={index} fill={CATEGORY_COLOR[entry.name]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <h2>Line Chart - Time by Month</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeData}>
            <XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
            {CATEGORIES.map(cat => (
              <Line key={cat} type="monotone" dataKey={cat} stroke={CATEGORY_COLOR[cat]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <h2>Calendar Heatmap</h2>
        <CalendarHeatmap
          startDate={filter.start || format(subDays(new Date(), 180), 'yyyy-MM-dd')}
          endDate={filter.end || format(new Date(), 'yyyy-MM-dd')}
          values={heatmapValues}
          showWeekdayLabels
          gutterSize={3}
          tooltipDataAttrs={(value) => ({ 'data-tip': value?.date ? `${value.date}: ${value.count || 0} hrs` : '' })}
          transformDayElement={(el, value) => {
            const style = {
              ...el.props.style,
              backgroundColor: value?.color || '#e5e7eb',
              opacity: value?.color ? 1 : 0.1,
              borderRadius: '3px',
              transition: 'all 0.2s ease'
            };
            return React.cloneElement(el, { style });
          }}
        />
      </section>

      <section className="card">
        <h2 style={{ position: 'sticky', top: 0, background: darkMode ? '#1f2937' : '#fff', zIndex: 1, padding: '0.5rem 0' }}>Activity Log</h2>
        {paginated.map(a => (
          <div key={a.id} className="log-entry">
            <div>
              <strong>{a.title}</strong> ({a.category})<br />
              {a.start} to {a.end} — {a.hours} hrs
              <br />{a.notes}
            </div>
            <div className="log-buttons">
              <button onClick={() => editActivity(a)}>Edit</button>
              <button onClick={() => deleteActivity(a.id)}>Delete</button>
            </div>
          </div>
        ))}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} style={{ opacity: currentPage === 1 ? 0.5 : 1 }}>Prev</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} style={{ fontWeight: currentPage === i + 1 ? 'bold' : 'normal' }}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
}