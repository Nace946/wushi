const time = require('../../utils/time')
const storage = require('../../utils/storage')

Page({
  data: {
    greeting: '你好',
    dateText: '',
    calMonth: '',
    calDay: '',
    calWeek: '',
    total: 0,
    attentionCount: 0,
    todoCount: 0,
    urgentText: '',
    stats: [
      { key: 'normal', name: '充裕', count: 0, color: '#3F8A6B' },
      { key: 'soon', name: '临近', count: 0, color: '#D18C2A' },
      { key: 'urgent', name: '紧急', count: 0, color: '#D4553C' },
      { key: 'over', name: '已过期', count: 0, color: '#7C7C76' }
    ],
    attention: [],
    todo: [],
    hasData: false
  },

  onLoad() {
    this.setHeader()
  },

  onShow() {
    this.setHeader()
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  setHeader() {
    const now = new Date()
    const h = now.getHours()
    let greeting = '你好'
    if (h < 6) greeting = '夜深了'
    else if (h < 11) greeting = '早上好'
    else if (h < 14) greeting = '中午好'
    else if (h < 18) greeting = '下午好'
    else greeting = '晚上好'

    const t = time.today()
    const parts = String(t).split('-')
    this.setData({
      greeting,
      dateText: time.formatCN(t) + ' · ' + time.weekday(t),
      calMonth: Number(parts[1]) + '月',
      calDay: parts[2],
      calWeek: time.weekday(t)
    })
  },

  refresh() {
    const raw = storage.getAll()
    const list = time.decorate(raw)
    const total = list.length

    const counter = { normal: 0, soon: 0, urgent: 0, over: 0 }
    list.forEach(i => {
      const s = i._state.status
      if (counter[s] !== undefined) counter[s]++
    })

    const stats = this.data.stats.map(s => Object.assign({}, s, { count: counter[s.key] }))

    // 需要关注：临近 + 紧急（还未过期，提醒优先使用）
    const attention = time
      .sortItems(
        list.filter(i => i._state.status === 'soon' || i._state.status === 'urgent'),
        'urgent'
      )
      .slice(0, 5)

    // 需要处理：已过期（倒计时）/ 已超期（正计时），必须动手处理
    const todo = time
      .sortItems(
        list.filter(i => i._state.status === 'over'),
        'urgent'
      )
      .slice(0, 5)

    let urgentText = ''
    // 用户可在「我的」关闭该提示条
    if (storage.getSettings().dailyRemind) {
      if (counter.over > 0 && counter.urgent > 0) {
        urgentText = `有 ${counter.over} 件需要处理、${counter.urgent} 件即将到期`
      } else if (counter.over > 0) {
        urgentText = `有 ${counter.over} 件已过期，建议尽快处理`
      } else if (counter.urgent > 0) {
        urgentText = `有 ${counter.urgent} 件即将到期，记得优先使用`
      }
    }

    this.setData({
      total,
      stats,
      attention,
      todo,
      attentionCount: counter.soon + counter.urgent + counter.over,
      todoCount: counter.over,
      urgentText,
      hasData: total > 0
    })
  },

  // 概览统计卡片点击：跳到物品页并筛选对应状态
  onStatTap(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    getApp().globalData.filterStatus = key
    wx.switchTab({ url: '/pages/items/items' })
  },

  // 「查看全部」：可带状态筛选跳转物品页
  goItems(e) {
    const status = e && e.currentTarget && e.currentTarget.dataset.status
    if (status) getApp().globalData.filterStatus = status
    wx.switchTab({ url: '/pages/items/items' })
  },

  goDetail(e) {
    const id = e.detail.id
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/edit/edit' })
  },

  goGuide() {
    wx.navigateTo({ url: '/pages/guide/guide' })
  },

  onShareAppMessage() {
    return {
      title: '物时 · 记住每件物品的保质期与更换周期',
      path: '/pages/index/index'
    }
  }
})
