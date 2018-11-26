// Helpers
import { wrapInArray, sortItems, deepEqual, groupByProperty, searchItems } from '../../util/helpers'
import { PropValidator } from 'vue/types/options'
import Vue, { VNode } from 'vue'

export interface DataOptions {
  page: number
  itemsPerPage: number
  sortBy: string[]
  sortDesc: boolean[]
  groupBy: string[]
  groupDesc: boolean[]
  multiSort: boolean
  mustSort: boolean
}

export interface DataPaginaton {
  page: number
  itemsPerPage: number
  pageStart: number
  pageStop: number
  pageCount: number
  itemsLength: number
}

export interface DataProps {
  items: any[]
  pagination: DataPaginaton
  options: DataOptions
  updateOptions: (obj: any) => void
  sort: (value: string) => void
  group: (value: string) => void
  groupedItems?: Record<string, any[]>
  loading?: boolean
}

export default Vue.extend({
  name: 'v-data',

  inheritAttrs: false,

  props: {
    items: {
      type: Array,
      default: () => []
    } as PropValidator<any[]>,
    itemKey: {
      type: String,
      default: 'id'
    },
    options: {
      type: Object,
      default: () => ({})
    },
    sortBy: {
      type: [String, Array],
      default: () => []
    } as PropValidator<string | string[]>,
    sortDesc: {
      type: [Boolean, Array],
      default: () => []
    } as PropValidator<boolean | boolean[]>,
    customSort: {
      type: Function, // TODO: specific typing?
      default: sortItems
    },
    mustSort: Boolean,
    multiSort: Boolean,
    page: {
      type: Number,
      default: 1
    },
    itemsPerPage: {
      type: Number,
      default: 10
    },
    groupBy: {
      type: [String, Array],
      default: () => []
    } as PropValidator<string | string[]>,
    groupDesc: {
      type: [Boolean, Array],
      default: () => []
    } as PropValidator<boolean | boolean[]>,
    locale: {
      type: String,
      default: 'en-US'
    },
    disableSort: Boolean,
    disablePagination: Boolean,
    disableSearch: Boolean,
    search: String,
    customSearch: {
      type: Function, // TODO: specific typing?
      default: searchItems
    },
    serverItemsLength: {
      type: Number,
      default: -1
    }
  },

  data () {
    return {
      internalOptions: {
        page: this.page,
        itemsPerPage: this.itemsPerPage,
        sortBy: wrapInArray(this.sortBy),
        sortDesc: wrapInArray(this.sortDesc),
        groupBy: wrapInArray(this.groupBy),
        groupDesc: wrapInArray(this.groupDesc),
        mustSort: this.mustSort,
        multiSort: this.multiSort
      } as DataOptions
    }
  },

  computed: {
    itemsLength (): number {
      return this.serverItemsLength >= 0 ? this.serverItemsLength : this.filteredItems.length
    },
    pageCount (): number {
      return this.internalOptions.itemsPerPage === -1
        ? 1
        : Math.ceil(this.itemsLength / this.internalOptions.itemsPerPage) // TODO: can't use items.length here
    },
    pageStart (): number {
      if (this.internalOptions.itemsPerPage === -1 || !this.items.length) return 0

      return (this.internalOptions.page - 1) * this.internalOptions.itemsPerPage
    },
    pageStop (): number {
      if (this.internalOptions.itemsPerPage === -1) return this.itemsLength
      if (!this.items.length) return 0

      return Math.min(this.itemsLength, this.internalOptions.page * this.internalOptions.itemsPerPage)
    },
    pagination (): DataPaginaton {
      return {
        page: this.internalOptions.page,
        itemsPerPage: this.internalOptions.itemsPerPage,
        pageStart: this.pageStart,
        pageStop: this.pageStop,
        pageCount: this.pageCount,
        itemsLength: this.itemsLength
      }
    },
    filteredItems (): any[] {
      let items = this.items.slice()

      if (!this.disableSearch) {
        items = this.customSearch(items, this.search)
      }

      return items
    },
    computedItems (): any[] {
      let items = this.filteredItems.slice()

      if (!this.disableSort) {
        items = this.sortItems(items)
      }

      if (!this.disablePagination) {
        items = this.paginateItems(items)
      }

      this.$emit('current-items', items)

      return items
    },
    groupedItems (): any[] {
      return groupByProperty(this.computedItems, this.internalOptions.groupBy[0])
    },
    scopedProps (): object {
      const props = {
        sort: this.sort,
        sortArray: this.sortArray,
        group: this.group
      }

      Object.defineProperties(props, {
        items: {
          get: () => this.computedItems
        },
        options: {
          get: () => this.internalOptions,
          set: v => this.updateOptions(v)
        },
        pagination: {
          get: () => this.pagination
        }
      })

      // TODO: Only suppports one level of grouping
      if (this.internalOptions.groupBy.length) {
        Object.defineProperty(props, 'groupedItems', {
          get: () => this.groupedItems
        })
      }

      return props
    }
  },

  watch: {
    options: {
      handler (options: DataOptions, old: DataOptions) {
        if (deepEqual(options, old)) return
        this.updateOptions(options)
      },
      deep: true,
      immediate: true
    },
    internalOptions: {
      handler (options: DataOptions, old: DataOptions) {
        if (deepEqual(options, old)) return
        this.$emit('update:options', options)
        this.$emit('pagination', this.pagination)
      },
      deep: true
    },
    page (page: number) {
      this.updateOptions({ page })
    },
    'internalOptions.page' (page: number) {
      this.$emit('update:page', page)
    },
    itemsPerPage (itemsPerPage: number) {
      this.updateOptions({ itemsPerPage })
    },
    'internalOptions.itemsPerPage' (itemsPerPage: number) {
      this.$emit('update:itemsPerPage', itemsPerPage)
    },
    sortBy (sortBy: string | string[]) {
      this.updateOptions({ sortBy: wrapInArray(sortBy) })
    },
    'internalOptions.sortBy' (sortBy: string[], old: string[]) {
      !deepEqual(sortBy, old) && this.$emit('update:sortBy', Array.isArray(this.sortBy) ? sortBy : sortBy[0])
    },
    sortDesc (sortDesc: boolean | boolean[]) {
      this.updateOptions({ sortDesc: wrapInArray(sortDesc) })
    },
    'internalOptions.sortDesc' (sortDesc: boolean[], old: boolean[]) {
      !deepEqual(sortDesc, old) && this.$emit('update:sortDesc', Array.isArray(this.sortDesc) ? sortDesc : sortDesc[0])
    },
    groupBy (groupBy: string | string[]) {
      this.updateOptions({ groupBy: wrapInArray(groupBy) })
    },
    'internalOptions.groupBy' (groupBy: string[], old: string[]) {
      !deepEqual(groupBy, old) && this.$emit('update:groupBy', Array.isArray(this.groupBy) ? groupBy : groupBy[0])
    },
    groupDesc (groupDesc: boolean | boolean[]) {
      this.updateOptions({ groupDesc: wrapInArray(groupDesc) })
    },
    'internalOptions.groupDesc' (groupDesc: boolean[], old: boolean[]) {
      !deepEqual(groupDesc, old) && this.$emit('update:groupDesc', Array.isArray(this.groupDesc) ? groupDesc : groupDesc[0])
    }
  },

  methods: {
    toggle (key: string, oldBy: string[], oldDesc: boolean[], page: number, mustSort: boolean, multiSort: boolean) {
      let by = oldBy.slice()
      let desc = oldDesc.slice()
      const byIndex = by.findIndex((k: string) => k === key)

      if (byIndex < 0) {
        if (!multiSort) {
          by = []
          desc = []
        }

        by.push(key)
        desc.push(false)
      } else if (byIndex >= 0 && !desc[byIndex]) {
        desc[byIndex] = true
      } else if (!mustSort) {
        by.splice(byIndex, 1)
        desc.splice(byIndex, 1)
      } else {
        desc[byIndex] = false
      }

      // Reset page to 1 if sortBy or sortDesc have changed
      if (!deepEqual(by, oldBy) || !deepEqual(desc, oldDesc)) {
        page = 1
      }

      return { by, desc, page }
    },
    group (key: string): void {
      const { by: groupBy, desc: groupDesc, page } = this.toggle(
        key,
        this.internalOptions.groupBy,
        this.internalOptions.groupDesc,
        this.internalOptions.page,
        true,
        false
      )
      this.updateOptions({ groupBy, groupDesc, page })
    },
    sort (key: string | string[]): void {
      if (Array.isArray(key)) return this.sortArray(key)

      const { by: sortBy, desc: sortDesc, page } = this.toggle(
        key,
        this.internalOptions.sortBy,
        this.internalOptions.sortDesc,
        this.internalOptions.page,
        this.mustSort,
        this.multiSort
      )
      this.updateOptions({ sortBy, sortDesc, page })
    },
    sortArray (sortBy: string[]) {
      const sortDesc = sortBy.map(s => {
        const i = this.internalOptions.sortBy.findIndex((k: string) => k === s)
        return i > -1 ? this.internalOptions.sortDesc[i] : false
      })

      this.updateOptions({ sortBy, sortDesc })
    },
    updateOptions (options: any) {
      this.internalOptions = Object.assign({}, this.internalOptions, {
        ...options,
        page: Math.max(1, Math.min(options.page || this.internalOptions.page, this.pageCount))
      })
    },
    sortItems (items: any[]) {
      const sortBy = this.internalOptions.groupBy.concat(this.internalOptions.sortBy)
      const sortDesc = this.internalOptions.groupDesc.concat(this.internalOptions.sortDesc)
      return this.customSort(items, sortBy, sortDesc, this.locale)
    },
    paginateItems (items: any[]) {
      // Make sure we don't try to display non-existant page if items suddenly change
      // TODO: Could possibly move this to pageStart/pageStop?
      if (items.length < this.pageStart) this.internalOptions.page = 1

      return items.slice(this.pageStart, this.pageStop)
    }
  },

  render (): VNode {
    return this.$scopedSlots.default && this.$scopedSlots.default(this.scopedProps) as any
  }
})