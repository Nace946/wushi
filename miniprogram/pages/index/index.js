const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { SLOGANS, PIN_LIMIT, PIN_TEXT } = require('../../utils/constants')

Page({
  data: {
    greeting: '你好',
    slogan: '',
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
    // 置顶：手动钉在首页的记录（最多 PIN_LIMIT 条）
    pinned: [],
    pinLimit: PIN_LIMIT,
    pinText: PIN_TEXT,
    pinFull: false,
    // 最近一次「用掉一个」的结果（连续点击合并为一批）
    lastUse: null,
    // 底部提示条
    snackShow: false,
    snackText: '',
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
      slogan: this.pickSlogan(),
      calMonth: Number(parts[1]) + '月',
      calDay: parts[2],
      calWeek: time.weekday(t)
    })
  },

  /** 从语言库随机一句，尽量不与上一次重复 */
  pickSlogan() {
    if (!SLOGANS || !SLOGANS.length) return ''
    let idx = Math.floor(Math.random() * SLOGANS.length)
    if (SLOGANS.length > 1 && idx === this._lastSloganIdx) {
      idx = (idx + 1) % SLOGANS.length
    }
    this._lastSloganIdx = idx
    return SLOGANS[idx]
  },

  refresh() {
    const raw = storage.getAll()
    const list = time.decorate(raw)
    const total = list.length

    // 纯记录型事件（没设循环间隔）没有提醒日期，不该出现在关注/处理列表里
    const reminding = list.filter(i => i._state.remindable !== false)

    // 四档统计：仍按全部记录算（对应列表页的全量分布）
    const counter = { normal: 0, soon: 0, urgent: 0, over: 0 }
    list.forEach(i => {
      const s = i._state.status
      if (counter[s] !== undefined) counter[s]++
    })

    // 关注/处理的口径：只算会提醒的记录，和列表内容保持一致
    const cr = { normal: 0, soon: 0, urgent: 0, over: 0 }
    reminding.forEach(i => {
      const s = i._state.status
      if (cr[s] !== undefined) cr[s]++
    })

    const stats = this.data.stats.map(s => Object.assign({}, s, { count: counter[s.key] }))

    // 置顶：按置顶先后排列，超出上限的只取前 PIN_LIMIT 条
    const pinned = []
    const pinnedIds = {}
    storage.getPinned().forEach(p => {
      pinnedIds[p.id] = true
      if (pinned.length < PIN_LIMIT) {
        const hit = list.find(i => i.id === p.id)
        if (hit) pinned.push(hit)
      }
    })

    // 需要关注：临近 + 紧急（还未过期，提醒优先使用）；已置顶的不重复出现
    const attention = time
      .sortItems(
        reminding.filter(
          i => !pinnedIds[i.id] && (i._state.status === 'soon' || i._state.status === 'urgent')
        ),
        'urgent'
      )
      .slice(0, 5)

    // 需要处理：已过期（倒计时）/ 已超期（正计时），必须动手处理
    const todo = time
      .sortItems(
        reminding.filter(i => !pinnedIds[i.id] && i._state.status === 'over'),
        'urgent'
      )
      .slice(0, 5)

    let urgentText = ''
    // 用户可在「我的」关闭该提示条
    if (storage.getSettings().dailyRemind) {
      if (cr.over > 0 && cr.urgent > 0) {
        urgentText = `有 ${cr.over} 件需要处理、${cr.urgent} 件即将到期`
      } else if (cr.over > 0) {
        urgentText = `有 ${cr.over} 件已过期或超期，建议尽快处理`
      } else if (cr.urgent > 0) {
        urgentText = `有 ${cr.urgent} 件即将到期，记得优先处理`
      }
    }

    this.setData({
      total,
      stats,
      pinned,
      pinFull: pinned.length >= PIN_LIMIT,
      attention,
      todo,
      attentionCount: cr.soon + cr.urgent + cr.over,
      todoCount: cr.over,
      urgentText,
      hasData: total > 0
    })
  },

  /** 置顶分组标题下方的提示（已满 / 剩余名额） */
  onPinTip() {
    wx.showToast({
      title: this.data.pinFull ? PIN_TEXT.full : '还可置顶 ' + (PIN_LIMIT - this.data.pinned.length) + ' 条',
      icon: 'none'
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

  /** 用掉一个：一次点击完成；连续点击合并为一批，撤销回到最初数量 */
  onUse(e) {
    const id = e.detail.id
    if (!id) return
    const res = storage.useItem(id, 1)
    if (!res) return

    const now = Date.now()
    let s = this.data.lastUse
    if (!s || s.id !== id || now - (s.at || 0) > 4000) {
      s = { id: id, logIds: [], count: 0, at: now }
    }
    s.logIds.push(res.logId)
    s.count += res.n
    s.at = now

    const unit = res.item.unit || ''
    if (res.after > 0) {
      s.text = `已用掉 ${s.count}${unit} · 还剩 ${res.after}${unit}`
    } else {
      s.text = s.count > 1 ? `已用完 · 共 ${s.count}${unit}` : '已用完 · 记得补货'
    }

    this.setData({
      lastUse: s,
      snackText: s.text,
      snackShow: true
    })
    this.refresh()

    // 4 秒后收起提示条（lastUse 多留一会儿，避免退场瞬间点撤销失效）
    if (this._fbTimer) clearTimeout(this._fbTimer)
    this._fbTimer = setTimeout(() => {
      this.setData({ snackShow: false })
    }, 4000)
  },

  /** 底部提示条上的「撤销」：整批还原 */
  onUndoUse() {
    const s = this.data.lastUse
    if (!s || !s.logIds || !s.logIds.length) return
    storage.undoUseBatch(s.id, s.logIds)
    this.setData({ lastUse: null, snackShow: false })
    this.refresh()
    wx.showToast({ title: '已撤销', icon: 'none' })
  },

  /** 正计时：重新开始计时 */
  onResetCard(e) {
    const id = e.detail.id
    if (!id) return
    storage.resetCycle(id)
    this.refresh()
    wx.showToast({ title: '已重新开始计时', icon: 'success' })
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
