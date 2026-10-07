const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { SORT_OPTIONS } = require('../../utils/constants')

Page({
  data: {
    version: '1.0.0',
    total: 0,
    countdownCount: 0,
    countupCount: 0,
    attentionCount: 0,
    sortName: '最紧急优先',
    sortKey: 'urgent',
    dailyRemind: true
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
      countdownCount: list.filter(i => i.mode === 'countdown').length,
      countupCount: list.filter(i => i.mode === 'countup').length,
      attentionCount: list.filter(i => i._state.status !== 'normal').length,
      sortKey: settings.sortKey,
      sortName: opt.name,
      dailyRemind: settings.dailyRemind
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

  onRemindChange(e) {
    const on = e.detail.value
    storage.saveSettings({ dailyRemind: on })
    this.setData({ dailyRemind: on })
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
      title: '清空所有物品',
      content: '将删除本机保存的全部 ' + this.data.total + ' 条记录，且无法恢复。建议先确认无需保留。',
      confirmColor: '#D8735F',
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
