const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { CATEGORIES, MODE } = require('../../utils/constants')

Page({
  data: {
    id: '',
    item: null,
    state: null,
    categoryName: '',
    rows: [],
    isCountUp: false,
    ringPercent: 0
  },

  onLoad(options) {
    this.setData({ id: options.id || '' })
  },

  onShow() {
    if (this.data.id) this.load()
  },

  load() {
    const item = storage.getById(this.data.id)
    if (!item) {
      wx.showToast({ title: '物品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }

    const state = time.getItemState(item)
    const cat = CATEGORIES.find(c => c.key === item.category)
    const isCountUp = item.mode === MODE.COUNTUP

    const rows = []
    if (isCountUp) {
      rows.push({ label: '上次处理', value: time.formatCN(item.lastDate) })
      rows.push({ label: '建议周期', value: (item.cycleDays || '-') + ' 天' })
      rows.push({ label: '下次建议', value: time.formatCN(state.targetDate) })
    } else {
      rows.push({ label: '生产日期', value: time.formatCN(item.produceDate) || '-' })
      if (item.expireManual) {
        rows.push({ label: '到期日', value: time.formatCN(item.expireDate) + '（手动）' })
      } else {
        rows.push({
          label: '保质期',
          value: (item.shelfLife || '-') + ' ' + { day: '天', month: '个月', year: '年' }[item.shelfLifeUnit || 'day']
        })
        rows.push({ label: '到期日', value: time.formatCN(state.targetDate) })
      }
    }
    rows.push({ label: '提前提醒', value: (item.remindDays || 0) + ' 天' })
    if (item.location) rows.push({ label: '存放位置', value: item.location })
    // 注意：数量可能为 0，不能用 || 1 兜底（会显示成 1）
    const qty = item.quantity === 0 || item.quantity ? Number(item.quantity) : 1
    rows.push({ label: '数量', value: qty + ' ' + (item.unit || '') })
    if (item.remark) rows.push({ label: '备注', value: item.remark })

    this.setData({
      item,
      state,
      rows,
      isCountUp,
      categoryName: cat ? cat.name : '其他',
      ringPercent: state.percent
    })
    wx.setNavigationBarTitle({ title: item.name || '物品详情' })
  },

  // 正计时：记录一次「已更换 / 已清洗」
  onReset() {
    const item = this.data.item
    if (!item) return
    wx.showModal({
      title: '记录一次处理',
      content: '将「' + item.name + '」的上次处理时间更新为今天，计时重新开始。',
      confirmColor: '#3F8A6B',
      success: res => {
        if (!res.confirm) return
        storage.resetCycle(item.id)
        this.load()
        wx.showToast({ title: '已重新开始计时', icon: 'success' })
      }
    })
  },

  // 倒计时：已用完 / 丢弃 —— 弹窗二选一
  onFinish() {
    const item = this.data.item
    if (!item) return
    wx.showModal({
      title: '此物品已使用完或丢弃？',
      // 说明放在正文：官方限制 cancelText / confirmText 均最多 4 个字符
      content: '已购新品：保留记录，日期更新为今天重新计时。\n不再需要：直接删除这条记录。',
      cancelText: '已购新品',
      confirmText: '删除物品',
      confirmColor: '#D4553C',
      success: res => {
        if (res.confirm) {
          // 右侧按钮：删除
          storage.remove(item.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 600)
        } else if (res.cancel) {
          // 左侧按钮：保留信息，只把日期重置为今天
          wx.navigateTo({ url: '/pages/edit/edit?id=' + item.id + '&reset=1' })
        }
      },
      fail: err => {
        // 兜底提示，避免再次出现"点了没反应"却没有任何反馈
        console.error('[detail] showModal 失败', err)
        wx.showToast({ title: '弹窗失败，请重试', icon: 'none' })
      }
    })
  },

  /** 用掉一个：详情页也能一键记录 */
  onUse() {
    const item = this.data.item
    if (!item) return
    if (Number(item.quantity) <= 0) {
      wx.showToast({ title: '数量已经是 0', icon: 'none' })
      return
    }
    const res = storage.useItem(item.id, 1)
    if (!res) return
    try {
      wx.vibrateShort({ type: 'light', fail: () => {} })
    } catch (e) {
      // 忽略
    }
    const unit = res.item.unit || ''
    this.load()
    wx.showToast({
      title: res.after > 0 ? `已用掉 ${res.n}${unit} · 还剩 ${res.after}${unit}` : '已用完 · 记得补货',
      icon: 'none',
      duration: 2000
    })
  },

  onEdit() {
    wx.navigateTo({ url: '/pages/edit/edit?id=' + this.data.id })
  },

  onDelete() {
    const item = this.data.item
    if (!item) return
    wx.showModal({
      title: '删除「' + item.name + '」',
      content: '删除后无法恢复，确定继续吗？',
      confirmColor: '#D4553C',
      success: res => {
        if (!res.confirm) return
        storage.remove(item.id)
        wx.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      }
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.item ? this.data.item.name + ' · 物时' : '物时',
      path: '/pages/index/index'
    }
  }
})
