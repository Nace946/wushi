const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { CATEGORIES } = require('../../utils/constants')

Page({
  data: {
    greeting: '你好',
    dateText: '',
    total: 0,
    attentionCount: 0,
    urgentText: '',
    stats: [
      { key: 'normal', name: '充裕', count: 0, color: '#3F8A6B' },
      { key: 'soon', name: '临近', count: 0, color: '#D18C2A' },
      { key: 'urgent', name: '紧急', count: 0, color: '#D4553C' },
      { key: 'over', name: '已过期', count: 0, color: '#7C7C76' }
    ],
    attention: [],
    categories: [],
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
    this.setData({
      greeting,
      dateText: time.formatCN(t) + ' · ' + time.weekday(t)
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

    // 需要关注：非充裕状态，按紧急程度排序，最多 5 条
    const attention = time
      .sortItems(
        list.filter(i => i._state.status !== 'normal'),
        'urgent'
      )
      .slice(0, 5)

    // 分类聚合
    const categories = CATEGORIES.map(c =>
      Object.assign({}, c, {
        count: list.filter(i => i.category === c.key).length
      })
    )

    const urgentCount = counter.urgent + counter.over
    let urgentText = ''
    // 用户可在「我的」关闭该提示条
    if (storage.getSettings().dailyRemind) {
      if (counter.over > 0 && counter.urgent > 0) {
        urgentText = `有 ${counter.over} 件已过期、${counter.urgent} 件即将到期，建议尽快处理`
      } else if (counter.over > 0) {
        urgentText = `有 ${counter.over} 件已过期，建议清理`
      } else if (counter.urgent > 0) {
        urgentText = `有 ${counter.urgent} 件即将到期，记得优先使用`
      }
    }

    this.setData({
      total,
      stats,
      attention,
      categories,
      attentionCount: counter.soon + counter.urgent + counter.over,
      urgentText,
      hasData: total > 0
    })
  },

  // 进入物品页并筛选分类（tabBar 页面不支持带参 navigateTo，用全局临时变量传递）
  onCategory(e) {
    const key = e.currentTarget.dataset.key
    app.globalData.filterCategory = key
    wx.switchTab({ url: '/pages/items/items' })
  },

  goItems() {
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
