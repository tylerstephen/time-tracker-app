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
  const [heatmapRange, setHeatmapRange] = useState({
    start: format(subDays(new Date(), 180), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [isEditing, setIsEditing] = useState(false);
  const [aggregation, setAggregation] = useState('month');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('activities');
    if (stored) setActivities(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFilterChange = (e) => setFilter({ ...filter, [e.target.name]: e.target.value });
  const handleHeatmapChange = (e) => setHeatmapRange({ ...heatmapRange, [e.target.name]: e.target.value });

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

  const filteredActivities = activities.filter(act => {
    if (!filter.start || !filter.end) return true;
    const actDate = parseISO(act.start);
    return actDate >= parseISO(filter.start) && actDate <= parseISO(filter.end);
  });

  const summary = CATEGORIES.map(cat => ({
    name: cat,
    value: filteredActivities.filter(a => a.category === cat).reduce((sum, a) => sum + Number(a.hours || 0), 0),
  }));

  const timeSeries = {};
  filteredActivities.forEach(a => {
    let dateKey;
    if (aggregation === 'week') {
      const startDate = startOfWeek(parseISO(a.start), { weekStartsOn: 0 });
      dateKey = format(startDate, 'yyyy-MM-dd');
    } else {
      dateKey = format(parseISO(a.start), 'yyyy-MM');
    }
    if (!timeSeries[dateKey]) timeSeries[dateKey] = { date: dateKey };
    timeSeries[dateKey][a.category] = (timeSeries[dateKey][a.category] || 0) + Number(a.hours || 0);
  });
  const timeData = Object.values(timeSeries).sort((a, b) => new Date(a.date) - new Date(b.date));

  const calendarMap = {};
  activities.forEach(a => {
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
    const color = CATEGORY_COLOR[topCategory[0]];
    return {
      date: day,
      count: totalHours,
      color,
      category: topCategory[0]
    };
  }).filter(d => {
    const dateObj = parseISO(d.date);
    return dateObj >= parseISO(heatmapRange.start) && dateObj <= parseISO(heatmapRange.end);
  });

  return (
    <div className={darkMode ? 'container dark' : 'container'}>
      <header>
        <h1>Time Tracker</h1>
        <p>Track and analyze how you spend your time</p>
        <button onClick={() => setDarkMode(!darkMode)} style={{ marginTop: '0.5rem' }}>
          Toggle {darkMode ? 'Light' : 'Dark'} Mode
        </button>
      </header>

      <section className="card">
        <h2>Log Activity</h2>
        <div className="form-grid">
          <input type="text" name="title" placeholder="Title" value={form.title} onChange={handleChange} />
          <select name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="date" name="start" value={form.start} onChange={handleChange} />
          <input type="date" name="end" value={form.end} onChange={handleChange} />
          <input type="number" name="hours" placeholder="Hours" value={form.hours} onChange={handleChange} />
          <textarea name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} />
          <button className="primary" onClick={addOrUpdateActivity}>{isEditing ? 'Update' : 'Add'} Activity</button>
        </div>
      </section>

      <section className="card">
        <h2>Filters</h2>
        <div className="form-grid">
          <input type="date" name="start" value={filter.start} onChange={handleFilterChange} />
          <input type="date" name="end" value={filter.end} onChange={handleFilterChange} />
          <select value={aggregation} onChange={e => setAggregation(e.target.value)}>
            <option value="month">Monthly</option>
            <option value="week">Weekly</option>
          </select>
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
        <h2>Line Chart - Time by Period</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {CATEGORIES.map(cat => (
              <Line key={cat} type="monotone" dataKey={cat} stroke={CATEGORY_COLOR[cat]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <h2>Activity Log</h2>
        {filteredActivities.map(a => (
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
      </section>

      <section className="card">
        <h2>Calendar Heatmap</h2>
        <div className="form-grid">
          <input type="date" name="start" value={heatmapRange.start} onChange={handleHeatmapChange} />
          <input type="date" name="end" value={heatmapRange.end} onChange={handleHeatmapChange} />
        </div>
        <CalendarHeatmap
          startDate={heatmapRange.start}
          endDate={heatmapRange.end}
          values={heatmapValues}
          showWeekdayLabels
          gutterSize={3}
          tooltipDataAttrs={(value) => ({ 'data-tip': value?.date ? `${value.date}: ${value.count || 0} hrs` : '' })}
          transformDayElement={(el, value) => {
            const style = {
              ...el.props.style,
              backgroundColor: value?.color || '#e5e7eb',
              opacity: Math.min(value?.count / 8, 1),
              borderRadius: '3px',
              transition: 'all 0.2s ease'
            };
            return React.cloneElement(el, { style });
          }}
        />
        <div className="legend" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: CATEGORY_COLOR[cat], borderRadius: '4px' }}></div>
              <span>{cat}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}