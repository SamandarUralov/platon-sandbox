/**
 * Event contract (SPEC §2 `events`): interactive blocks must emit the documented
 * Vue events the action pipeline binds to. Wrappers map the underlying ui-kit
 * atom's event to a stable semantic event (`change`, `click`, …) and forward
 * `update:modelValue` for `v-model`.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  DatePicker,
  FileUpload,
  TablePagination,
} from '@platon-rs/platon-ui-kit'

import ButtonBlock from '@/blocks/ButtonBlock.vue'
import ImageBlock from '@/blocks/ImageBlock.vue'
import TableBlock from '@/blocks/TableBlock.vue'
import FormBlock from '@/blocks/FormBlock.vue'
import Pagination from '@/blocks/Pagination.vue'
import TextInput from '@/blocks/TextInput.vue'
import TextArea from '@/blocks/TextArea.vue'
import SelectInput from '@/blocks/SelectInput.vue'
import CheckboxInput from '@/blocks/CheckboxInput.vue'
import RadioGroup from '@/blocks/RadioGroup.vue'
import SwitchInput from '@/blocks/SwitchInput.vue'
import DatePickerInput from '@/blocks/DatePickerInput.vue'
import FileUploadInput from '@/blocks/FileUploadInput.vue'

describe('button emits click', () => {
  it('fires click when the button is pressed', async () => {
    const wrapper = mount(ButtonBlock, { props: { label: 'Go' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not fire click when disabled', async () => {
    const wrapper = mount(ButtonBlock, { props: { label: 'Go', disabled: true } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})

describe('image emits click', () => {
  it('fires click on the image', async () => {
    const wrapper = mount(ImageBlock, { props: { src: 'x.png' } })
    await wrapper.find('img').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

describe('text_input maps atom input to change + v-model', () => {
  it('re-emits update:modelValue and change', () => {
    const wrapper = mount(TextInput)
    wrapper.findComponent(Input).vm.$emit('update:modelValue', 'hello')
    expect(wrapper.emitted('update:modelValue')).toEqual([['hello']])
    expect(wrapper.emitted('change')).toEqual([['hello']])
  })
})

describe('text_area maps atom input to change + v-model', () => {
  it('re-emits update:modelValue and change', () => {
    const wrapper = mount(TextArea)
    wrapper.findComponent(Textarea).vm.$emit('update:modelValue', 'notes')
    expect(wrapper.emitted('update:modelValue')).toEqual([['notes']])
    expect(wrapper.emitted('change')).toEqual([['notes']])
  })
})

describe('select maps atom selection to change + v-model', () => {
  it('re-emits update:modelValue and change', () => {
    const wrapper = mount(SelectInput, { props: { options: ['a', 'b'] } })
    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'b')
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
    expect(wrapper.emitted('change')).toEqual([['b']])
  })
})

describe('checkbox maps atom toggle to change + v-model', () => {
  it('re-emits update:modelValue and change', () => {
    const wrapper = mount(CheckboxInput, { props: { label: 'Agree' } })
    wrapper.findComponent(Checkbox).vm.$emit('update:modelValue', true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(wrapper.emitted('change')).toEqual([[true]])
  })
})

describe('switch maps atom toggle to change + v-model', () => {
  it('re-emits update:modelValue and change', () => {
    const wrapper = mount(SwitchInput, { props: { label: 'Active' } })
    wrapper.findComponent(Switch).vm.$emit('update:modelValue', true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(wrapper.emitted('change')).toEqual([[true]])
  })
})

describe('date_picker maps atom events', () => {
  it('re-emits update:modelValue, change, save and cancel', () => {
    const wrapper = mount(DatePickerInput)
    const atom = wrapper.findComponent(DatePicker)
    atom.vm.$emit('update:modelValue', '2026-10-09')
    atom.vm.$emit('save', '2026-10-09')
    atom.vm.$emit('cancel')
    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-10-09']])
    expect(wrapper.emitted('change')).toEqual([['2026-10-09']])
    expect(wrapper.emitted('save')).toEqual([['2026-10-09']])
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})

describe('file_upload maps atom events', () => {
  it('re-emits update:modelValue, change, error and upload-click', () => {
    const wrapper = mount(FileUploadInput)
    const atom = wrapper.findComponent(FileUpload)
    const files = [{ name: 'a.pdf' }]
    atom.vm.$emit('update:modelValue', files)
    atom.vm.$emit('error', 'too big')
    atom.vm.$emit('upload-click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[files]])
    expect(wrapper.emitted('change')).toEqual([[files]])
    expect(wrapper.emitted('error')).toEqual([['too big']])
    expect(wrapper.emitted('upload-click')).toHaveLength(1)
  })
})

describe('radio_group emits change on native selection', () => {
  it('re-emits update:modelValue and change with the option value', async () => {
    const wrapper = mount(RadioGroup, {
      props: { options: [{ label: 'One', value: 1 }, { label: 'Two', value: 2 }] },
    })
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios).toHaveLength(2)
    await radios[1].setValue()
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
    expect(wrapper.emitted('change')).toEqual([[2]])
  })
})

describe('pagination maps atom page-change', () => {
  it('re-emits change and page-change with the page', () => {
    const wrapper = mount(Pagination, { props: { page: 1, pageSize: 10, total: 50 } })
    wrapper.findComponent(TablePagination).vm.$emit('page-change', 3)
    expect(wrapper.emitted('page-change')).toEqual([[3]])
    expect(wrapper.emitted('change')).toEqual([[3]])
  })
})

describe('table emits row-click', () => {
  it('fires row-click with the row and index', async () => {
    const rows = [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Linus' },
    ]
    const wrapper = mount(TableBlock, { props: { rows } })
    const bodyRows = wrapper.findAll('tbody tr')
    expect(bodyRows).toHaveLength(2)
    await bodyRows[1].trigger('click')
    const evs = wrapper.emitted('row-click')
    expect(evs).toHaveLength(1)
    expect(evs![0]).toEqual([rows[1], 1])
  })
})

describe('form emits submit and reset', () => {
  it('fires submit on form submit and reset on cancel', async () => {
    const wrapper = mount(FormBlock, { props: { cancelLabel: 'Cancel' } })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)

    // The cancel button is the first (outlined/secondary) button in the actions row.
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('does not submit when disabled', async () => {
    const wrapper = mount(FormBlock, { props: { disabled: true } })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
