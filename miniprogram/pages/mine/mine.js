const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { SORT_OPTIONS, KIND } = require('../../utils/constants')

Page({
  data: {
    version: '1.0.0',
    total: 0,
    itemCount: 0,
    eventCount: 0,
    sortName: '最紧急优先',
    sortKey: 'urgent',
    showAttention: true,
    showTodo: true,
    usageCount: 0,
    eventLogCount: 0
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = time.decorate(storage.getAll())
    const settings = storage.getSettings()
    const opt = SORT_OPTIONS.find(o => o.key === settings.sortKey) || SORT_OPTIONS[0]

    this.setData({
      total: list.length,
      itemCount: list.filter(i => i.kind !== KIND.EVENT).length,
      eventCount: list.filter(i => i.kind === KIND.EVENT).length,
      sortKey: settings.sortKey,
      sortName: opt.name,
      showAttention: settings.showAttention !== false,
      showTodo: settings.showTodo !== false,
      usageCount: storage.getAllUsage().length,
      eventLogCount: storage.getAllEventLogs().length
    })
  },

  onSort() {
    const keys = SORT_OPTIONS.map(o => o.key)
    const names = SORT_OPTIONS.map(o => o.name)
    wx.showActionSheet({
      itemList: names,
      success: res => {
        const key = keys[res.tapIndex]
        if (!key) return
        storage.saveSettings({ sortKey: key })
        this.refresh()
        wx.showToast({ title: '已切换排序', icon: 'success' })
      },
      fail: () => {}
    })
  },

  onAttentionChange(e) {
    const on = e.detail.value
    storage.saveSettings({ showAttention: on })
    this.setData({ showAttention: on })
  },

  onTodoChange(e) {
    const on = e.detail.value
    storage.saveSettings({ showTodo: on })
    this.setData({ showTodo: on })
  },

  goUsage() {
    wx.navigateTo({ url: '/pages/usage/usage' })
  },

  goEventLog() {
    wx.navigateTo({ url: '/pages/eventlog/eventlog' })
  },

  goGuide() {
    wx.navigateTo({ url: '/pages/guide/guide' })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/edit/edit' })
  },

  onClear() {
    if (this.data.total === 0) {
      wx.showToast({ title: '暂无数据', icon: 'none' })
      return
    }
    wx.showModal({
      title: '清空所有数据',
      content: '将删除本机保存的全部 ' + this.data.total + ' 条记录，且无法恢复。建议先确认无需保留。',
      confirmColor: '#D4553C',
      success: res => {
        if (!res.confirm) return
        storage.clearAll()
        this.refresh()
        wx.showToast({ title: '已清空', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '物时 · 记住每件物品的保质期与更换周期',
      path: '/pages/index/index'
    }
  }
})
