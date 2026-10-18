const time = require('../../utils/time')
const storage = require('../../utils/storage')

/** 时间戳 → HH:MM */
function fmtClock(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const h = String(d.getHours())
  const m = String(d.getMinutes())
  return (h.length < 2 ? '0' + h : h) + ':' + (m.length < 2 ? '0' + m : m)
}

/**
 * 每条记录右侧的来源标记
 * - 记录已删除：这条物品已经从列表里删掉了，只把记录留了下来
 * - 计时已收起：不循环的事件完成后自动归档（使用记录里一般见不到，兜底显示）
 */
function logTag(l) {
  if (l.deleted) return ' · 物品已删除'
  if (l.archived) return ' · 计时已收起'
  return ''
}

Page({
  data: {
    groups: [],
    todayCount: 0,
    totalCount: 0,
    empty: true,
    limit: storage.LOG_LIMIT
  },

  onShow() {
    this.load()
  },

  load() {
    const logs = storage.getAllUsage()
    const today = time.today()

    let todayCount = 0
    let totalCount = 0
    logs.forEach(l => {
      totalCount += l.n
      if (l.date === today) todayCount += l.n
    })

    // 按日期分组（倒序）
    const map = {}
    logs.forEach(l => {
      if (!map[l.date]) map[l.date] = { date: l.date, title: '', items: [] }
      map[l.date].items.push(
        Object.assign({}, l, { timeText: fmtClock(l.ts), tag: logTag(l) })
      )
    })

    const groups = Object.keys(map)
      .sort()
      .reverse()
      .map(d => {
        const g = map[d]
        g.title = this.dateTitle(d)
        return g
      })

    this.setData({
      groups,
      todayCount,
      totalCount,
      empty: groups.length === 0
    })
  },

  dateTitle(d) {
    const today = time.today()
    if (d === today) return '今天'
    if (d === time.addDays(today, -1)) return '昨天'
    return time.formatCN(d) + ' · ' + time.weekday(d)
  },

  goDetail(e) {
    const ds = e.currentTarget.dataset
    // 物品已被删除，只剩这一条记录，点不进详情
    if (Number(ds.archived)) {
      wx.showToast({ title: '这件物品已删除，记录仍然保留', icon: 'none' })
      return
    }
    if (ds.id) wx.navigateTo({ url: '/pages/detail/detail?id=' + ds.id })
  },

  /** 长按某条记录 → 删除这一条（只删记录，数量不会加回来） */
  onDeleteLog(e) {
    const ds = e.currentTarget.dataset
    wx.showModal({
      title: '删除这条记录？',
      content: '只删掉这一条使用记录，物品的数量不会加回来。',
      confirmText: '删除',
      confirmColor: '#E0341F',
      success: res => {
        if (!res.confirm) return
        storage.removeLog(ds.id, ds.logid)
        this.load()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  /** 清空全部使用记录 */
  onClearLogs() {
    wx.showModal({
      title: '清空使用记录？',
      content: '全部使用记录会被清掉，物品的数量不受影响。',
      confirmText: '清空',
      confirmColor: '#E0341F',
      success: res => {
        if (!res.confirm) return
        storage.clearLogs('usage')
        this.load()
        wx.showToast({ title: '已清空', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '天天计时 · 记住每件物品的保质期与更换周期',
      path: '/pages/index/index'
    }
  }
})
