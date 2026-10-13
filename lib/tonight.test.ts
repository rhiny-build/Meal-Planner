import { describe, it, expect } from 'vitest'
import {
  getDinner,
  findPlanForDay,
  getRestOfWeek,
  getWeekdayName,
  formatCookTime,
  type PlanDay,
  type TonightRecipe,
} from './tonight'

const recipe = (id: string, name = id): TonightRecipe => ({
  id,
  name,
  kind: 'full',
  totalTimeMinutes: null,
})

const week: PlanDay[] = [
  { dayOfWeek: 'Monday', proteinRecipe: recipe('sea-bass') },
  { dayOfWeek: 'Tuesday', proteinRecipe: recipe('schnitzel'), carbRecipe: recipe('fries'), vegetableRecipe: recipe('rocket') },
  { dayOfWeek: 'Wednesday', carbRecipe: recipe('pasta') },
  { dayOfWeek: 'Thursday' },
  { dayOfWeek: 'Friday', proteinRecipe: recipe('burgers') },
]

// 13 October 2026 is a Tuesday
const tuesday = new Date(2026, 9, 13)

describe('getWeekdayName', () => {
  it('names the weekday of a local date', () => {
    expect(getWeekdayName(tuesday)).toBe('Tuesday')
    expect(getWeekdayName(new Date(2026, 9, 18))).toBe('Sunday')
  })
})

describe('getDinner', () => {
  it('uses the protein as the main and the carb and vegetable as sides', () => {
    const dinner = getDinner(week[1])
    expect(dinner?.main.id).toBe('schnitzel')
    expect(dinner?.sides.map((side) => side.id)).toEqual(['fries', 'rocket'])
  })

  it('has no sides when only the protein is planned', () => {
    expect(getDinner(week[0])).toEqual({ main: recipe('sea-bass'), sides: [] })
  })

  it('falls back to the carb as the main when there is no protein', () => {
    const dinner = getDinner(week[2])
    expect(dinner?.main.id).toBe('pasta')
    expect(dinner?.sides).toEqual([])
  })

  it('ignores lunch', () => {
    const day = { dayOfWeek: 'Tuesday', lunchRecipe: recipe('soup') } as PlanDay
    expect(getDinner(day)).toBeNull()
  })

  it('is null for an empty day or no day at all', () => {
    expect(getDinner(week[3])).toBeNull()
    expect(getDinner(null)).toBeNull()
  })
})

describe('findPlanForDay', () => {
  it("finds today's row by weekday name", () => {
    expect(findPlanForDay(week, tuesday)?.dayOfWeek).toBe('Tuesday')
  })

  it('returns null when the week has no row for today', () => {
    expect(findPlanForDay(week, new Date(2026, 9, 17))).toBeNull() // Saturday
  })
})

describe('getRestOfWeek', () => {
  it('lists the days after today in plan order', () => {
    expect(getRestOfWeek(week, tuesday).map((day) => day.dayOfWeek)).toEqual([
      'Wednesday',
      'Thursday',
      'Friday',
    ])
  })

  it('is empty on the last day of the plan or when today is not in it', () => {
    expect(getRestOfWeek(week, new Date(2026, 9, 16))).toEqual([]) // Friday: last row
    expect(getRestOfWeek(week, new Date(2026, 9, 17))).toEqual([]) // Saturday: no row
  })
})

describe('formatCookTime', () => {
  it('formats minutes and hours', () => {
    expect(formatCookTime(40)).toBe('40 min')
    expect(formatCookTime(60)).toBe('1 h')
    expect(formatCookTime(75)).toBe('1 h 15 min')
  })

  it('is null when unknown', () => {
    expect(formatCookTime(null)).toBeNull()
    expect(formatCookTime(0)).toBeNull()
  })
})
