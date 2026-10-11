<script setup lang="ts">
/**
 * Built-in block: `calendar` (Studio UI kit).
 * Month view with events. When the block has a `query`, the renderer injects `rows`; each row is
 * placed on the day of its `dateField` (or the first ISO-date-looking field) and labelled by
 * `labelField` (or `title`/`name`/the first text field). Month paging and day selection are inner
 * UI state; clicking a day emits `select` with its ISO date.
 */
import { computed, ref } from 'vue'
import { cellText, str, type Row } from './blockUtils'

const props = defineProps<{
  title?: string
  rows?: Row[]
  dateField?: string
  labelField?: string
  /** ISO date treated as today (tests / Studio); defaults to the local date. */
  today?: string
}>()

const emit = defineEmits<{ (e: 'select', iso: string): void }>()

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (n: number) => String(n).padStart(2, '0')
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

const todayIso = computed(() => (ISO_DATE.test(str(props.today)) ? str(props.today).slice(0, 10) : isoOf(new Date())))
const offset = ref(0)
const selected = ref<string | null>(null)

const month = computed(() => {
  const [y, m] = todayIso.value.split('-').map(Number)
  const d = new Date(y!, m! - 1 + offset.value, 1)
  return { y: d.getFullYear(), m: d.getMonth() }
})

const cells = computed(() => {
  const { y, m } = month.value
  const first = new Date(y, m, 1).getDay()
  const out: { day: number; inMonth: boolean; iso: string; today: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, i - first + 1)
    const iso = isoOf(d)
    out.push({ day: d.getDate(), inMonth: d.getMonth() === m, iso, today: iso === todayIso.value })
  }
  return out.slice(35).every((c) => !c.inMonth) ? out.slice(0, 35) : out
})

const events = computed(() => {
  const out = new Map<string, string[]>()
  const rows = Array.isArray(props.rows) ? props.rows : []
  const first = rows[0]
  if (!first) return out
  const keys = Object.keys(first)
  const dateKey = str(props.dateField) || keys.find((k) => ISO_DATE.test(str(first[k])))
  if (!dateKey) return out
  const labelKey =
    str(props.labelField) ||
    ['title', 'name', 'label', 'subject'].find((k) => k in first) ||
    keys.find((k) => k !== dateKey && k !== 'id' && typeof first[k] === 'string') ||
    'id'
  for (const row of rows) {
    const iso = str(row[dateKey]).slice(0, 10)
    if (!ISO_DATE.test(iso)) continue
    const arr = out.get(iso) ?? []
    arr.push(cellText(row[labelKey]))
    out.set(iso, arr)
  }
  return out
})

function pick(iso: string) {
  selected.value = iso
  emit('select', iso)
}
</script>

<template>
  <div class="pl-calendar">
    <div class="pl-calendar__head">
      <span class="pl-calendar__title">{{ title }}</span>
      <span class="pl-calendar__month">{{ MONTH_NAMES[month.m] }} {{ month.y }}</span>
      <button type="button" class="pl-calendar__nav" aria-label="Previous month" @click.stop="offset--">‹</button>
      <button type="button" class="pl-calendar__nav" aria-label="Next month" @click.stop="offset++">›</button>
      <button type="button" class="pl-calendar__today" @click.stop="offset = 0">Today</button>
    </div>
    <div class="pl-calendar__grid">
      <div v-for="d in WEEKDAYS" :key="d" class="pl-calendar__weekday">{{ d }}</div>
      <button
        v-for="c in cells"
        :key="c.iso"
        type="button"
        class="pl-calendar__cell"
        :data-iso="c.iso"
        @click.stop="pick(c.iso)"
      >
        <span
          class="pl-calendar__day"
          :class="{
            'pl-calendar__day--out': !c.inMonth,
            'pl-calendar__day--today': c.today,
            'pl-calendar__day--selected': c.iso === selected,
          }"
          >{{ c.day }}</span
        >
        <span v-for="(ev, i) in (events.get(c.iso) ?? []).slice(0, 2)" :key="i" class="pl-calendar__event">{{
          ev
        }}</span>
        <span v-if="(events.get(c.iso)?.length ?? 0) > 2" class="pl-calendar__more"
          >+{{ events.get(c.iso)!.length - 2 }} more</span
        >
      </button>
    </div>
  </div>
</template>

<style scoped>
.pl-calendar {
  overflow: hidden;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-calendar__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
}
.pl-calendar__title {
  font-size: 14px;
  font-weight: 700;
}
.pl-calendar__month {
  min-width: 8rem;
  margin-left: auto;
  text-align: center;
  font-size: 13.5px;
  font-weight: 700;
}
.pl-calendar__nav,
.pl-calendar__today {
  height: 28px;
  min-width: 28px;
  padding: 0 8px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 8px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.pl-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.pl-calendar__weekday {
  padding: 8px 10px;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--pl-fg-muted, #64748b);
}
.pl-calendar__cell {
  min-height: 80px;
  min-width: 0;
  padding: 6px;
  border: 0;
  border-right: 1px solid color-mix(in srgb, var(--pl-border, #e5e7eb) 70%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--pl-border, #e5e7eb) 70%, transparent);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  vertical-align: top;
  cursor: pointer;
}
.pl-calendar__cell:nth-of-type(7n) {
  border-right: 0;
}
.pl-calendar__day {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-size: 12px;
}
.pl-calendar__day--out {
  color: var(--pl-fg-muted, #64748b);
  opacity: 0.6;
}
.pl-calendar__day--today {
  font-weight: 700;
  color: var(--pl-accent, #6366f1);
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 14%, transparent);
}
.pl-calendar__day--selected {
  font-weight: 700;
  color: #ffffff;
  background: var(--pl-accent, #6366f1);
}
.pl-calendar__event,
.pl-calendar__more {
  display: block;
  margin-top: 2px;
  padding: 0 4px;
  overflow: hidden;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pl-calendar__event {
  color: var(--pl-accent, #6366f1);
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 14%, transparent);
}
.pl-calendar__more {
  color: var(--pl-fg-muted, #64748b);
}
</style>
