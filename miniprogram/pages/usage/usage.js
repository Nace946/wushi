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

Page({
  data: {
    groups: [],
    todayCount: 0,
    totalCount: 0,
    empty: true
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
        Object.assign({}, l, { timeText: fmtClock(l.ts) })
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
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onShareAppMessage() {
    return {
      title: '物时 · 记住每件物品的保质期与更换周期',
      path: '/pages/index/index'
    }
  }
})
