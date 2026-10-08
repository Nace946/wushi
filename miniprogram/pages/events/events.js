const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { EVENT_CATEGORIES, KIND } = require('../../utils/constants')

Page({
  data: {
    keyword: '',
    activeCategory: 'all',
    activeStatus: 'all',
    sortKey: 'urgent',
    categories: [{ key: 'all', name: '全部', icon: '' }].concat(EVENT_CATEGORIES),
    statuses: [
      { key: 'all', name: '全部' },
      { key: 'attention', name: '需关注' },
      { key: 'normal', name: '正常' },
      { key: 'soon', name: '有点久了' },
      { key: 'urgent', name: '该做一下' },
      { key: 'over', name: '拖很久了' }
    ],
    list: [],
    total: 0,
    filteredTip: ''
  },

  onLoad() {
    const s = storage.getSettings()
    this.setData({ sortKey: s.sortKey || 'urgent' })
  },

  onShow() {
    const app = getApp()
    if (app.globalData.filterEventCategory) {
      this.setData({ activeCategory: app.globalData.filterEventCategory })
      app.globalData.filterEventCategory = ''
    }
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  refresh() {
    const d = this.data
    // 只统计事件（kind === event）
    const all = time.decorate(storage.getAll().filter(i => i.kind === KIND.EVENT))

    const categories = this.data.categories.map(c =>
      Object.assign({}, c, {
        count: c.key === 'all' ? all.length : all.filter(i => i.category === c.key).length
      })
    )

    let list = all
    if (d.activeCategory !== 'all') {
      list = list.filter(i => i.category === d.activeCategory)
    }

    const st = d.activeStatus
    if (st === 'attention') {
      list = list.filter(i => i._state.status !== 'normal')
    } else if (st === 'normal' || st === 'soon' || st === 'urgent' || st === 'over') {
      list = list.filter(i => i._state.status === st)
    }
    if (d.keyword) {
      const kw = d.keyword.trim().toLowerCase()
      list = list.filter(i => String(i.name).toLowerCase().indexOf(kw) > -1)
    }

    list = time.sortItems(list, d.sortKey)

    let tip = ''
    if (all.length > 0 && list.length === 0) tip = '换个筛选条件试试'

    this.setData({ list, total: all.length, categories, filteredTip: tip })
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value }, () => {
      if (this._timer) clearTimeout(this._timer)
      this._timer = setTimeout(() => this.refresh(), 200)
    })
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this.refresh()
  },

  onCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.key })
    this.refresh()
  },

  onStatus(e) {
    this.setData({ activeStatus: e.currentTarget.dataset.key })
    this.refresh()
  },

  onSort() {
    const keys = ['urgent', 'name', 'recent']
    const names = ['最紧急优先', '按名称', '按添加时间']
    wx.showActionSheet({
      itemList: names,
      success: res => {
        const key = keys[res.tapIndex]
        if (!key) return
        storage.saveSettings({ sortKey: key })
        this.setData({ sortKey: key })
        this.refresh()
      },
      fail: () => {}
    })
  },

  /** 事件：刚刚发生过，重新计时 */
  onResetCard(e) {
    const id = e.detail.id
    if (!id) return
    const item = storage.getById(id)
    if (!item) return
    wx.showModal({
      title: '记录一次发生',
      content: '将「' + item.name + '」的上次发生时间更新为今天，重新计时。',
      confirmColor: '#3F8A6B',
      success: res => {
        if (!res.confirm) return
        storage.resetCycle(id)
        this.refresh()
        wx.showToast({ title: '已重新计时', icon: 'success' })
      }
    })
  },

  onCardTap(e) {
    const id = e.detail.id
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onCardLongPress(e) {
    const id = e.detail.id
    if (!id) return
    const item = storage.getById(id)
    if (!item) return
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: res => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: '/pages/edit/edit?id=' + id })
        } else if (res.tapIndex === 1) {
          wx.showModal({
            title: '删除「' + item.name + '」',
            content: '删除后无法恢复，确定继续吗？',
            confirmColor: '#D4553C',
            success: r => {
              if (r.confirm) {
                storage.remove(id)
                this.refresh()
                wx.showToast({ title: '已删除', icon: 'success' })
              }
            }
          })
        }
      },
      fail: () => {}
    })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/edit/edit?kind=' + KIND.EVENT })
  },

  onShareAppMessage() {
    return {
      title: '物时 · 记录每件物品与每件事的时间',
      path: '/pages/index/index'
    }
  }
})
