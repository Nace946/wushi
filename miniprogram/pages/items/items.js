const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { CATEGORIES } = require('../../utils/constants')

Page({
  data: {
    keyword: '',
    activeCategory: 'all',
    activeStatus: 'all',
    sortKey: 'urgent',
    categories: [{ key: 'all', name: '全部', icon: '' }].concat(CATEGORIES),
    statuses: [
      { key: 'all', name: '全部' },
      { key: 'attention', name: '需关注' },
      { key: 'normal', name: '充裕' },
      { key: 'soon', name: '临近' },
      { key: 'urgent', name: '紧急' },
      { key: 'over', name: '已过期' },
      { key: 'countup', name: '正计时' }
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
    // 支持从首页跳转过来时带上的筛选（分类宫格入口 / 概览统计卡片）
    const app = getApp()
    if (app.globalData.filterCategory) {
      this.setData({ activeCategory: app.globalData.filterCategory })
      app.globalData.filterCategory = ''
    }
    if (app.globalData.filterStatus) {
      this.setData({ activeStatus: app.globalData.filterStatus })
      app.globalData.filterStatus = ''
    }
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  refresh() {
    const d = this.data
    const all = time.decorate(storage.getAll())

    // 分类数量按全部物品统计，不受当前状态筛选影响
    const categories = this.data.categories.map(c =>
      Object.assign({}, c, {
        count: c.key === 'all' ? all.length : all.filter(i => i.category === c.key).length
      })
    )

    let list = all
    if (d.activeCategory !== 'all') {
      list = list.filter(i => i.category === d.activeCategory)
    }

    // 状态筛选：需关注 = 非充裕；其余为精确状态
    const st = d.activeStatus
    if (st === 'attention') {
      list = list.filter(i => i._state.status !== 'normal')
    } else if (st === 'countup') {
      list = list.filter(i => i.mode === 'countup')
    } else if (st === 'normal' || st === 'soon' || st === 'urgent' || st === 'over') {
      list = list.filter(i => i._state.status === st)
    }
    if (d.keyword) {
      const kw = d.keyword.trim().toLowerCase()
      list = list.filter(
        i =>
          String(i.name).toLowerCase().indexOf(kw) > -1 ||
          String(i.location || '').toLowerCase().indexOf(kw) > -1
      )
    }

    list = time.sortItems(list, d.sortKey)

    let tip = ''
    if (all.length > 0 && list.length === 0) tip = '换个筛选条件试试'

    this.setData({ list, total: all.length, categories, filteredTip: tip })
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value }, () => {
      // 轻量防抖，避免每次输入都全量过滤
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
    const idx = keys.indexOf(this.data.sortKey)
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
    wx.navigateTo({ url: '/pages/edit/edit' })
  },

  onShareAppMessage() {
    return {
      title: '物时 · 记住每件物品的保质期与更换周期',
      path: '/pages/index/index'
    }
  }
})
