import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { RecurrencePattern, RecurrenceRule } from '../types/task';

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: RecurrenceRule) => void;
  initialRule?: RecurrenceRule | null;
}

const PATTERNS: { value: RecurrencePattern; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const ORDINALS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: '5th' },
];

// Generate ordinals for yearly (1st-53rd)
const YEARLY_ORDINALS = Array.from({ length: 53 }, (_, i) => {
  const n = i + 1;
  const suffix = ['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4)] || 'th';
  return { value: n, label: `${n}${suffix}` };
});

type MonthlyMode = 'day-of-month' | 'nth-weekday';

export function RecurrenceModal({ isOpen, onClose, onSave, initialRule }: RecurrenceModalProps) {
  const [pattern, setPattern] = useState<RecurrencePattern>(initialRule?.pattern || 'weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>(initialRule?.weekdays || [1]); // Default to Monday
  const [monthlyMode, setMonthlyMode] = useState<MonthlyMode>('nth-weekday');
  const [dayOfMonth, setDayOfMonth] = useState(initialRule?.dayOfMonth || 1);
  const [nthWeek, setNthWeek] = useState(initialRule?.nthWeek || 1);
  const [nthWeekday, setNthWeekday] = useState(initialRule?.weekdays?.[0] || 1);

  useEffect(() => {
    if (initialRule) {
      setPattern(initialRule.pattern);
      setSelectedDays(initialRule.weekdays || [1]);
      setDayOfMonth(initialRule.dayOfMonth || 1);
      setNthWeek(initialRule.nthWeek || 1);
      setNthWeekday(initialRule.weekdays?.[0] || 1);
      
      // Determine monthly mode
      if (initialRule.pattern === 'monthly' || initialRule.pattern === 'quarterly' || initialRule.pattern === 'yearly') {
        if (initialRule.nthWeek) {
          setMonthlyMode('nth-weekday');
        } else if (initialRule.dayOfMonth) {
          setMonthlyMode('day-of-month');
        }
      }
    }
  }, [initialRule]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const handleSave = () => {
    const rule: RecurrenceRule = { pattern };

    switch (pattern) {
      case 'weekly':
      case 'biweekly':
        rule.weekdays = selectedDays;
        break;

      case 'monthly':
        if (monthlyMode === 'day-of-month') {
          rule.dayOfMonth = dayOfMonth;
        } else {
          rule.pattern = 'nth-weekday';
          rule.nthWeek = nthWeek;
          rule.weekdays = [nthWeekday];
          rule.scope = 'month';
        }
        break;

      case 'quarterly':
        if (monthlyMode === 'day-of-month') {
          rule.dayOfMonth = dayOfMonth;
        } else {
          rule.pattern = 'nth-weekday';
          rule.nthWeek = nthWeek;
          rule.weekdays = [nthWeekday];
          rule.scope = 'quarter';
        }
        break;

      case 'yearly':
        if (monthlyMode === 'day-of-month') {
          // Same date each year - no extra config needed
        } else {
          rule.pattern = 'nth-weekday';
          rule.nthWeek = nthWeek;
          rule.weekdays = [nthWeekday];
          rule.scope = 'year';
        }
        break;
    }

    onSave(rule);
    onClose();
  };

  if (!isOpen) return null;

  const getScopeLabel = () => {
    switch (pattern) {
      case 'monthly': return 'month';
      case 'quarterly': return 'quarter';
      case 'yearly': return 'year';
      default: return 'month';
    }
  };

  const getOrdinalsForPattern = () => {
    return pattern === 'yearly' ? YEARLY_ORDINALS : ORDINALS;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-board-surface border border-board-border rounded-xl shadow-2xl w-full max-w-md mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-board-border">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-accent-gold" />
            <h2 className="text-lg font-medium text-white">Recurrence Pattern</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-board-elevated transition-colors"
          >
            <X size={18} className="text-board-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Pattern Selection */}
          <div>
            <label className="block text-sm text-board-muted mb-2">Repeat</label>
            <div className="grid grid-cols-3 gap-2">
              {PATTERNS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPattern(value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    pattern === value
                      ? 'bg-accent-gold/20 border-accent-gold text-accent-gold'
                      : 'bg-board-elevated border-board-border text-gray-300 hover:border-board-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly/Biweekly: Day Selection */}
          {(pattern === 'weekly' || pattern === 'biweekly') && (
            <div>
              <label className="block text-sm text-board-muted mb-2">On these days</label>
              <div className="flex gap-1">
                {DAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleDay(value)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                      selectedDays.includes(value)
                        ? 'bg-accent-gold/20 border-accent-gold text-accent-gold'
                        : 'bg-board-elevated border-board-border text-gray-400 hover:border-board-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly/Quarterly/Yearly: Mode Selection */}
          {(pattern === 'monthly' || pattern === 'quarterly' || pattern === 'yearly') && (
            <div className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMonthlyMode('nth-weekday')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                    monthlyMode === 'nth-weekday'
                      ? 'bg-accent-gold/20 border-accent-gold text-accent-gold'
                      : 'bg-board-elevated border-board-border text-gray-300 hover:border-board-muted'
                  }`}
                >
                  Nth Weekday
                </button>
                <button
                  onClick={() => setMonthlyMode('day-of-month')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                    monthlyMode === 'day-of-month'
                      ? 'bg-accent-gold/20 border-accent-gold text-accent-gold'
                      : 'bg-board-elevated border-board-border text-gray-300 hover:border-board-muted'
                  }`}
                >
                  {pattern === 'yearly' ? 'Same Date' : 'Day of Month'}
                </button>
              </div>

              {/* Nth Weekday Config */}
              {monthlyMode === 'nth-weekday' && (
                <div>
                  <label className="block text-sm text-board-muted mb-2">
                    The {getOrdinalsForPattern().find(o => o.value === nthWeek)?.label} {DAYS.find(d => d.value === nthWeekday)?.label} of each {getScopeLabel()}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={nthWeek}
                      onChange={(e) => setNthWeek(Number(e.target.value))}
                      className="flex-1 bg-board-elevated border border-board-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-gold"
                    >
                      {getOrdinalsForPattern().map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={nthWeekday}
                      onChange={(e) => setNthWeekday(Number(e.target.value))}
                      className="flex-1 bg-board-elevated border border-board-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-gold"
                    >
                      {DAYS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label === 'Sun' ? 'Sunday' : label === 'Mon' ? 'Monday' : label === 'Tue' ? 'Tuesday' : label === 'Wed' ? 'Wednesday' : label === 'Thu' ? 'Thursday' : label === 'Fri' ? 'Friday' : 'Saturday'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Day of Month Config */}
              {monthlyMode === 'day-of-month' && pattern !== 'yearly' && (
                <div>
                  <label className="block text-sm text-board-muted mb-2">Day of {getScopeLabel()}</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full bg-board-elevated border border-board-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-gold"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Yearly same date - just show info */}
              {monthlyMode === 'day-of-month' && pattern === 'yearly' && (
                <p className="text-sm text-board-muted">
                  Task will repeat on the same date each year based on the due date you set.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-board-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-board-muted hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-accent-gold text-black rounded-lg hover:bg-accent-warm transition-colors"
          >
            Save Pattern
          </button>
        </div>
      </div>
    </div>
  );
}
