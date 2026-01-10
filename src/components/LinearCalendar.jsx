const LinearCalendar = ({ year = new Date().getFullYear() }) => {
  const [currentYear, setCurrentYear] = useState(year);
  
  // Generate all months data
  const generateLinearMonths = () => {
    const months = [];
    
    for (let month = 0; month < 12; month++) {
      const monthData = {
        name: new Date(currentYear, month).toLocaleString('default', { month: 'long' }),
        days: [],
        startDay: new Date(currentYear, month, 1).getDay() // 0 = Sunday, 1 = Monday, etc.
      };
      
      // Get number of days in month
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      
      // Add days
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
        const isToday = date.toDateString() === new Date().toDateString();
        
        monthData.days.push({
          date,
          day,
          dayOfWeek,
          isWeekend,
          isToday,
          dayName: date.toLocaleString('default', { weekday: 'short' })
        });
      }
      
      months.push(monthData);
    }
    
    return months;
  };
  
  const months = generateLinearMonths();
  
  // Navigation
  const goToPrevYear = () => setCurrentYear(prev => prev - 1);
  const goToNextYear = () => setCurrentYear(prev => prev + 1);
  const goToCurrentYear = () => setCurrentYear(new Date().getFullYear());
  
  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="linear-calendar">
      {/* Calendar Header */}
      <div className="calendar-header">
        <button onClick={goToPrevYear} className="nav-btn">← Previous Year</button>
        <h2 className="year-title">{currentYear}</h2>
        <div className="header-right">
          <button onClick={goToCurrentYear} className="current-btn">Current Year</button>
          <button onClick={goToNextYear} className="nav-btn">Next Year →</button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="color-box normal-day"></div>
          <span>Weekday</span>
        </div>
        <div className="legend-item">
          <div className="color-box weekend-day"></div>
          <span>Weekend</span>
        </div>
        <div className="legend-item">
          <div className="color-box today-day"></div>
          <span>Today</span>
        </div>
      </div>
      
      {/* Months Grid */}
      <div className="months-grid">
        {months.map((month, monthIndex) => (
          <div key={monthIndex} className="month-container">
            <div className="month-header">
              <h3 className="month-name">{month.name}</h3>
              <span className="month-days-count">{month.days.length} days</span>
            </div>
            
            {/* Weekday Headers */}
            <div className="weekdays-row">
              {weekdays.map((day, index) => (
                <div 
                  key={index} 
                  className={`weekday-header ${index === 0 || index === 6 ? 'weekend' : ''}`}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Days Grid */}
            <div className="days-grid">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: month.startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="day-cell empty"></div>
              ))}
              
              {/* Actual days */}
              {month.days.map((day, dayIndex) => (
                <div 
                  key={dayIndex}
                  className={`day-cell ${
                    day.isWeekend ? 'weekend' : ''
                  } ${day.isToday ? 'today' : ''}`}
                  title={`${day.dayName}, ${month.name} ${day.day}, ${currentYear}`}
                >
                  <span className="day-number">{day.day}</span>
                  <span className="day-name">{day.dayName}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinearCalendar;