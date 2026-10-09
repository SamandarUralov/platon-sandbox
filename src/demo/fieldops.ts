/**
 * Canonical demo seed — FieldOps "Work orders" / "Job checklist" (SPEC §12).
 *
 * A representative ProjectMeta that exercises the whole foundation: theme tokens,
 * roles, data models (faker-seeded), a menu tree, nested blocks, the three
 * built-in blocks, and query-bound data tables. Rendered in Interface mode on
 * standalone boot (e.g. `ao preview`).
 */

import type { ProjectMeta } from '@/contracts'

export const fieldOpsMeta: ProjectMeta = {
  schemaVersion: 1,
  id: 'fieldops',
  name: 'FieldOps',
  theme: {
    tokens: {
      'pl-fg': '#0f172a',
      'pl-fg-muted': '#64748b',
      'pl-border': '#e2e8f0',
      'pl-surface': '#ffffff',
      'pl-bg': '#f8fafc',
      'pl-accent': '#6366f1',
      'pl-danger': '#dc2626',
      'pl-success': '#16a34a',
    },
  },
  roles: ['admin', 'dispatcher', 'technician', 'customer'],
  data_models: [
    {
      table: 'work_orders',
      columns: [
        { name: 'id', type: 'number' },
        { name: 'title', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'technician', type: 'string' },
        { name: 'created', type: 'date' },
      ],
    },
    {
      table: 'checklist_items',
      columns: [
        { name: 'id', type: 'number' },
        { name: 'task', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'assignee', type: 'string' },
        { name: 'notes', type: 'string' },
      ],
    },
  ],
  custom_components: [],
  global_state: {
    activeDepot: 'North',
  },
  global_hooks: [],
  menu: [
    { id: 'm-dashboard', label: 'Dashboard', page: 'dashboard', icon: 'home' },
    { id: 'm-work-orders', label: 'Work orders', page: 'work_orders', icon: 'clipboard' },
    { id: 'm-checklist', label: 'Job checklist', page: 'job_checklist', icon: 'check' },
  ],
  pages: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      parent: null,
      in_menu: true,
      visible_to: [],
      blocks: [
        {
          id: 'dash-header',
          component: 'page_header',
          props: {
            title: 'Dashboard',
            subtitle: 'Live overview of field operations',
            badge: 'FieldOps',
            actions: [{ label: 'New work order', variant: 'primary' }, { label: 'Export' }],
          },
        },
        {
          id: 'dash-stats',
          component: 'stat_group',
          items: [
            { label: 'Open work orders', value: 12, delta: '+3', deltaType: 'up' },
            { label: 'In progress', value: 7, deltaType: 'neutral' },
            { label: 'Completed today', value: 24, delta: '+8', deltaType: 'up' },
            { label: 'Overdue', value: 3, delta: '-1', deltaType: 'down' },
          ],
        },
        {
          id: 'dash-recent',
          component: 'data_table',
          props: { title: 'Recent work orders' },
          query: { table: 'work_orders' },
        },
      ],
    },
    {
      id: 'work_orders',
      label: 'Work orders',
      path: '/work-orders',
      parent: null,
      in_menu: true,
      visible_to: [],
      blocks: [
        {
          id: 'wo-header',
          component: 'page_header',
          props: {
            title: 'Work orders',
            subtitle: 'Dispatch, assign and track field jobs',
            actions: [{ label: 'New work order', variant: 'primary' }],
          },
        },
        {
          id: 'wo-stats',
          component: 'stat_group',
          items: [
            { label: 'Unassigned', value: 5, deltaType: 'neutral' },
            { label: 'Assigned', value: 7, deltaType: 'neutral' },
            { label: 'Urgent', value: 2, delta: '!', deltaType: 'down' },
          ],
        },
        {
          id: 'wo-table',
          component: 'data_table',
          props: { title: 'All work orders' },
          query: {
            table: 'work_orders',
            columns: ['id', 'title', 'status', 'priority', 'technician', 'created'],
          },
        },
      ],
    },
    {
      id: 'job_checklist',
      label: 'Job checklist',
      path: '/checklist',
      parent: null,
      in_menu: true,
      visible_to: [],
      blocks: [
        {
          id: 'cl-header',
          component: 'page_header',
          props: {
            title: 'Job checklist',
            subtitle: 'Per-visit task completion',
            badge: 'Technician',
            badgeVariant: 'secondary',
          },
        },
        {
          id: 'cl-table',
          component: 'data_table',
          props: { title: 'Checklist items' },
          query: { table: 'checklist_items' },
        },
      ],
    },
  ],
}

export default fieldOpsMeta
