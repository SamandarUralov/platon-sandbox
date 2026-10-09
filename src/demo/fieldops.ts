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
  // Explicit, studio-managed menu tree (SPEC §2 MenuNode). `visible_to` mirrors
  // the pages so the Preview sidebar filters live per role; the "Operations"
  // group node demonstrates nested rendering + empty-group dropping.
  menu: [
    {
      id: 'm-dashboard',
      label: 'Dashboard',
      page: 'dashboard',
      icon: 'home',
      visible_to: ['admin', 'dispatcher'],
    },
    {
      id: 'm-ops',
      label: 'Operations',
      icon: 'layers',
      children: [
        {
          id: 'm-work-orders',
          label: 'Work orders',
          page: 'work_orders',
          icon: 'clipboard',
          visible_to: ['admin', 'dispatcher', 'technician'],
        },
        {
          id: 'm-checklist',
          label: 'Job checklist',
          page: 'job_checklist',
          icon: 'check',
          visible_to: ['admin', 'technician', 'customer'],
        },
      ],
    },
  ],
  pages: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      parent: null,
      in_menu: true,
      // Operational overview — managers only (SPEC §7 page-level visible_to).
      visible_to: ['admin', 'dispatcher'],
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
          // Block-level filter: KPIs are admin-only (dispatcher sees the page
          // but not these stats).
          visible_to: ['admin'],
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
      visible_to: ['admin', 'dispatcher', 'technician'],
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
          // Dispatch KPIs — hidden from technicians (they only work the table).
          visible_to: ['admin', 'dispatcher'],
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
          // Visual CRUD matrix (SPEC §7): dispatchers can create/edit, only
          // admins can delete, technicians read-only.
          permissions: {
            create: ['admin', 'dispatcher'],
            update: ['admin', 'dispatcher'],
            delete: ['admin'],
          },
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
      visible_to: ['admin', 'technician', 'customer'],
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
          // Technicians complete items (create/edit); customers read-only;
          // only admins delete.
          permissions: {
            create: ['admin', 'technician'],
            update: ['admin', 'technician'],
            delete: ['admin'],
          },
          query: { table: 'checklist_items' },
        },
      ],
    },
  ],
}

export default fieldOpsMeta
