const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { CATEGORIES, PRESETS, MODE, SHELF_UNITS } = require('../../utils/constants')

const EMOJIS = ['🥛', '🍞', '🥚', '🍚', '🍶', '🥫', '🍎', '🥬', '💊', '🩹', '🧴', '💄', '🛏️', '🪥', '🧺', '🧽', '🔌', '🌬️', '🚰', '📦']

const REMIND_OPTIONS = [1, 2, 3, 5, 7, 15, 30]
const CYCLE_OPTIONS = [7, 14, 21, 30, 60, 90, 180, 365]

Page({
  data: {
    isEdit: false,
    id: '',
    form: null,
    categories: CATEGORIES,
    emojis: EMOJIS,
    remindOptions: REMIND_OPTIONS,
    cycleOptions: CYCLE_OPTIONS,
    unitNames: SHELF_UNITS.map(u => u.name),
    units: SHELF_UNITS,
    unitIndex: 0,
    presets: [],
    expirePreview: '',
    saving: false
  },

  onLoad(options) {
    const today = time.today()
    const baseForm = {
      name: '',
      icon: '📦',
      category: 'other',
      mode: MODE.COUNTDOWN,
      produceDate: today,
      shelfLife: '',
      shelfLifeUnit: 'day',
      expireDate: '',
      expireManual: false,
      lastDate: today,
      cycleDays: '',
      quantity: 1,
      unit: '份',
      location: '',
      remindDays: 7,
      remark: ''
    }

    if (options.id) {
      const item = storage.getById(options.id)
      if (!item) {
        wx.showToast({ title: '物品不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      const form = Object.assign({}, baseForm, item)
      this.setData({
        isEdit: true,
        id: options.id,
        form,
        unitIndex: Math.max(0, SHELF_UNITS.findIndex(u => u.key === form.shelfLifeUnit))
      })
      wx.setNavigationBarTitle({ title: '编辑物品' })
    } else {
      this.setData({ isEdit: false, form: baseForm })
      wx.setNavigationBarTitle({ title: '添加物品' })
    }

    this.updatePresets()
    this.updatePreview()
  },

  /** 根据当前模式过滤可用预设 */
  updatePresets() {
    const mode = this.data.form.mode
    this.setData({ presets: PRESETS.filter(p => p.mode === mode) })
  },

  /** 实时计算到期日预览 */
  updatePreview() {
    const f = this.data.form
    if (f.mode !== MODE.COUNTDOWN) {
      this.setData({ expirePreview: '' })
      return
    }
    if (f.expireManual) {
      this.setData({ expirePreview: f.expireDate ? time.formatCN(f.expireDate) : '' })
      return
    }
    if (f.produceDate && f.shelfLife) {
      const d = time.computeExpire(f.produceDate, f.shelfLife, f.shelfLifeUnit)
      this.setData({ expirePreview: d ? time.formatCN(d) : '' })
    } else {
      this.setData({ expirePreview: '' })
    }
  },

  /** 通用文本/数字输入 */
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value }, () => this.updatePreview())
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ 'form.remark': e.detail.value })
  },

  onMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ 'form.mode': mode }, () => {
      this.updatePresets()
      this.updatePreview()
    })
  },

  onCategory(e) {
    const key = e.currentTarget.dataset.key
    const cat = CATEGORIES.find(c => c.key === key)
    const patch = { 'form.category': key }
    // 切换分类时给出推荐图标与默认模式
    if (cat && (!this.data.form.name || this.data.form.icon === '📦')) {
      patch['form.icon'] = cat.icon
    }
    if (cat) patch['form.mode'] = cat.mode
    this.setData(patch, () => {
      this.updatePresets()
      this.updatePreview()
    })
  },

  onEmoji(e) {
    this.setData({ 'form.icon': e.currentTarget.dataset.emoji })
  },

  onDate(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value }, () => this.updatePreview())
  },

  onUnitChange(e) {
    const idx = Number(e.detail.value)
    this.setData(
      { unitIndex: idx, 'form.shelfLifeUnit': SHELF_UNITS[idx].key },
      () => this.updatePreview()
    )
  },

  /** 保质期单位（天 / 个月 / 年） */
  onUnitTap(e) {
    this.setData({ 'form.shelfLifeUnit': e.currentTarget.dataset.key }, () => this.updatePreview())
  },

  /** 提前提醒天数（分段选择，无需滚动选择器） */
  onRemindQuick(e) {
    this.setData({ 'form.remindDays': Number(e.currentTarget.dataset.days) })
  },

  onCycleQuick(e) {
    this.setData({ 'form.cycleDays': Number(e.currentTarget.dataset.days) })
  },

  onExpireManual(e) {
    const on = e.detail.value
    this.setData({ 'form.expireManual': on }, () => this.updatePreview())
  },

  onPreset(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const preset = this.data.presets[idx]
    if (!preset) return
    const built = storage.buildFromPreset(preset)
    const keepName = this.data.form.name
    const form = Object.assign({}, this.data.form, built)
    // 用户已输入名称时保留用户名称
    if (keepName) form.name = keepName
    else form.name = preset.name
    this.setData(
      {
        form,
        unitIndex: Math.max(0, SHELF_UNITS.findIndex(u => u.key === form.shelfLifeUnit))
      },
      () => this.updatePreview()
    )
    wx.showToast({ title: '已填入「' + preset.name + '」', icon: 'none' })
  },

  validate() {
    const f = this.data.form
    if (!f.name || !String(f.name).trim()) {
      wx.showToast({ title: '请填写物品名称', icon: 'none' })
      return false
    }
    if (f.mode === MODE.COUNTDOWN) {
      if (f.expireManual) {
        if (!f.expireDate) {
          wx.showToast({ title: '请选择到期日', icon: 'none' })
          return false
        }
      } else {
        if (!f.produceDate) {
          wx.showToast({ title: '请选择生产日期', icon: 'none' })
          return false
        }
        if (!f.shelfLife || Number(f.shelfLife) <= 0) {
          wx.showToast({ title: '请填写保质期', icon: 'none' })
          return false
        }
      }
    } else {
      if (!f.lastDate) {
        wx.showToast({ title: '请选择上次处理日期', icon: 'none' })
        return false
      }
      if (!f.cycleDays || Number(f.cycleDays) <= 0) {
        wx.showToast({ title: '请填写建议周期', icon: 'none' })
        return false
      }
    }
    return true
  },

  onSave() {
    if (this.data.saving) return
    if (!this.validate()) return

    const f = Object.assign({}, this.data.form)
    f.name = String(f.name).trim()
    f.quantity = Number(f.quantity) || 1
    f.remindDays = Number(f.remindDays) || 7
    if (f.mode === MODE.COUNTDOWN) {
      f.shelfLife = Number(f.shelfLife) || ''
      // 自动算出到期日，便于列表直接读取
      f.expireDate = f.expireManual
        ? f.expireDate
        : time.computeExpire(f.produceDate, f.shelfLife, f.shelfLifeUnit)
      f.lastDate = ''
      f.cycleDays = ''
    } else {
      f.cycleDays = Number(f.cycleDays) || ''
      f.produceDate = ''
      f.shelfLife = ''
      f.expireDate = ''
    }

    this.setData({ saving: true })
    if (this.data.isEdit) {
      storage.update(this.data.id, f)
    } else {
      storage.add(f)
    }

    wx.showToast({
      title: this.data.isEdit ? '已保存' : '已添加',
      icon: 'success',
      duration: 1000
    })
    setTimeout(() => {
      this.setData({ saving: false })
      wx.navigateBack()
    }, 700)
  },

  onDelete() {
    if (!this.data.isEdit) return
    wx.showModal({
      title: '删除物品',
      content: '删除后无法恢复，确定继续吗？',
      confirmColor: '#D8735F',
      success: res => {
        if (!res.confirm) return
        storage.remove(this.data.id)
        wx.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      }
    })
  }
})
