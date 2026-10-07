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
    rows.push({ label: '数量', value: (item.quantity || 1) + ' ' + (item.unit || '') })
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
      confirmColor: '#5E8C7A',
      success: res => {
        if (!res.confirm) return
        storage.resetCycle(item.id)
        this.load()
        wx.showToast({ title: '已重新开始计时', icon: 'success' })
      }
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
      confirmColor: '#D8735F',
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
