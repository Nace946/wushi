const time = require('../../utils/time')
const storage = require('../../utils/storage')
const {
  CATEGORIES,
  EVENT_CATEGORIES,
  PRESETS,
  EVENT_PRESETS,
  MODE,
  KIND,
  KIND_TEXT,
  kindText,
  SHELF_UNITS,
  EMOJI_GROUPS,
  EVENT_EMOJI_GROUPS
} = require('../../utils/constants')

const REMIND_OPTIONS = [1, 2, 3, 5, 7, 15, 30]
const CYCLE_OPTIONS = [7, 14, 21, 30, 60, 90, 180, 365]

Page({
  data: {
    isEdit: false,
    id: '',
    form: null,
    kind: KIND.ITEM,
    isEvent: false,
    isCountUp: false,
    showKind: false, // 正计时时展示「物品 / 事件」选择
    cycleEnabled: true, // 事件：是否设置循环间隔（关闭 = 纯记录）
    categories: CATEGORIES,
    emojiGroups: EMOJI_GROUPS,
    iconGroup: 'common',
    currentIcons: [],
    showIconPicker: false,
    remindOptions: REMIND_OPTIONS,
    cycleOptions: CYCLE_OPTIONS,
    unitNames: SHELF_UNITS.map(u => u.name),
    units: SHELF_UNITS,
    unitIndex: 0,
    presets: [],
    expirePreview: '',
    cyclePreview: '',
    // 按类型变化的文案
    ktLastLabel: KIND_TEXT.item.lastLabel,
    ktCycleLabel: KIND_TEXT.item.cycleLabel,
    ktNextLabel: KIND_TEXT.item.nextLabel,
    ktPresetTitle: KIND_TEXT.item.presetTitle,
    ktNameLabel: KIND_TEXT.item.nameLabel,
    ktNamePlaceholder: KIND_TEXT.item.namePlaceholder,
    ktSubmitNew: KIND_TEXT.item.submitNew,
    ktPeriodWord: KIND_TEXT.item.periodWord,
    ktTip: KIND_TEXT.item.tip,
    ktCycleSwitch: KIND_TEXT.event.cycleSwitchLabel,
    ktCycleSwitchHint: KIND_TEXT.event.cycleSwitchHint,
    ktCycleOff: KIND_TEXT.event.cycleOffText,
    saving: false
  },

  onLoad(options) {
    const today = time.today()
    const isEvent = options.kind === KIND.EVENT
    const kind = isEvent ? KIND.EVENT : KIND.ITEM

    const baseForm = {
      name: '',
      icon: isEvent ? '📌' : '📦',
      category: isEvent ? 'life' : 'other',
      kind,
      mode: isEvent ? MODE.COUNTUP : MODE.COUNTDOWN,
      produceDate: today,
      shelfLife: '',
      shelfLifeUnit: 'day',
      expireDate: '',
      expireManual: false,
      lastDate: today,
      cycleDays: '',
      quantity: 1,
      unit: isEvent ? '次' : '份',
      location: '',
      remindDays: isEvent ? 2 : 7,
      detailTiming: false,
      remark: ''
    }

    if (options.id) {
      const item = storage.getById(options.id)
      if (!item) {
        wx.showToast({ title: '记录不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      const form = Object.assign({}, baseForm, item)
      if (!form.kind) form.kind = KIND.ITEM

      // 从详情页「购置新物品」进来：保留原有信息，仅把日期重置为今天
      if (options.reset === '1') {
        form.produceDate = today
        form.expireDate = ''
        form.lastDate = today
        this._resetTip = true
      }

      this.setData({
        isEdit: true,
        id: options.id,
        form,
        kind: form.kind,
        isCountUp: form.mode === MODE.COUNTUP,
        showKind: form.mode === MODE.COUNTUP,
        unitIndex: Math.max(0, SHELF_UNITS.findIndex(u => u.key === form.shelfLifeUnit))
      })
      wx.setNavigationBarTitle({
        title: (form.kind === KIND.EVENT ? '编辑事件' : '编辑物品')
      })
      if (this._resetTip) {
        this._resetTip = false
        wx.showToast({ title: '日期已重置为今天', icon: 'none', duration: 1800 })
      }
    } else {
      this.setData({
        isEdit: false,
        form: baseForm,
        kind,
        isCountUp: baseForm.mode === MODE.COUNTUP,
        showKind: baseForm.mode === MODE.COUNTUP
      })
      wx.setNavigationBarTitle({ title: isEvent ? '添加事件' : '添加物品' })
    }

    this.syncKindMeta()
    this.updatePreview()
  },

  /** 依据当前 kind / mode 同步分类、图标库、预设与文案 */
  syncKindMeta() {
    const f = this.data.form
    const kind = f.kind === KIND.EVENT ? KIND.EVENT : KIND.ITEM
    const isEvent = kind === KIND.EVENT
    const kt = kindText(kind)

    const categories = isEvent ? EVENT_CATEGORIES : CATEGORIES
    // 事件全部是正计时，预设不按 mode 再过滤
    const presets = isEvent ? EVENT_PRESETS : PRESETS.filter(p => p.mode === f.mode)

    this.setData({
      kind,
      isEvent,
      cycleEnabled: isEvent ? Number(f.cycleDays) > 0 : true,
      categories,
      emojiGroups: isEvent ? EVENT_EMOJI_GROUPS : EMOJI_GROUPS,
      presets,
      cycleOptions: (kt.countSteps || CYCLE_OPTIONS).slice(),
      ktLastLabel: kt.lastLabel,
      ktCycleLabel: kt.cycleLabel,
      ktNextLabel: kt.nextLabel,
      ktPresetTitle: kt.presetTitle,
      ktNameLabel: kt.nameLabel,
      ktNamePlaceholder: kt.namePlaceholder,
      ktSubmitNew: kt.submitNew,
      ktPeriodWord: kt.periodWord,
      ktTip: kt.tip,
      ktCycleSwitch: kt.cycleSwitchLabel || KIND_TEXT.event.cycleSwitchLabel,
      ktCycleSwitchHint: kt.cycleSwitchHint || KIND_TEXT.event.cycleSwitchHint,
      ktCycleOff: kt.cycleOffText || KIND_TEXT.event.cycleOffText
    })
  },

  /** 实时计算预览：倒计时=到期日；正计时=下次建议更换 / 下次提醒 */
  updatePreview() {
    const f = this.data.form
    if (f.mode === MODE.COUNTUP) {
      const next = f.lastDate && Number(f.cycleDays) > 0
        ? time.addDays(f.lastDate, Number(f.cycleDays))
        : ''
      this.setData({ expirePreview: '', cyclePreview: next ? time.formatCN(next) : '' })
      return
    }
    this.setData({ cyclePreview: '' })
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

  /** 正计时：详细计时开关 */
  onDetailTiming(e) {
    this.setData({ 'form.detailTiming': !!e.detail.value })
  },

  /** 正计时：切换「物品 / 事件」 */
  onKind(e) {
    const kind = e.currentTarget.dataset.kind
    if (!kind || kind === this.data.form.kind) return
    const isEvent = kind === KIND.EVENT
    const cats = isEvent ? EVENT_CATEGORIES : CATEGORIES
    const patch = {
      'form.kind': kind,
      kind
    }
    // 切换后若原分类不在新类型的分类里，回落到第一个分类
    const cur = this.data.form.category
    if (!cats.some(c => c.key === cur)) {
      patch['form.category'] = cats[0].key
    }
    this.setData(patch, () => this.syncKindMeta())
  },

  onMode(e) {
    const mode = e.currentTarget.dataset.mode
    const patch = { 'form.mode': mode, isCountUp: mode === MODE.COUNTUP, showKind: mode === MODE.COUNTUP }
    // 倒计时只有物品，自动切回物品
    if (mode !== MODE.COUNTUP) {
      patch['form.kind'] = KIND.ITEM
      patch.kind = KIND.ITEM
      if (!CATEGORIES.some(c => c.key === this.data.form.category)) {
        patch['form.category'] = CATEGORIES[0].key
      }
    }
    this.setData(patch, () => {
      this.syncKindMeta()
      this.updatePreview()
    })
  },

  onCategory(e) {
    const key = e.currentTarget.dataset.key
    const cat = this.data.categories.find(c => c.key === key)
    const patch = { 'form.category': key }
    // 切换分类时给出推荐图标与默认模式（事件只走正计时）
    if (cat && (!this.data.form.name || this.data.form.icon === '📦' || this.data.form.icon === '📌')) {
      patch['form.icon'] = cat.icon
    }
    if (cat && this.data.form.kind !== KIND.EVENT) {
      patch['form.mode'] = cat.mode
      patch.isCountUp = cat.mode === MODE.COUNTUP
      patch.showKind = cat.mode === MODE.COUNTUP
    }
    this.setData(patch, () => {
      this.syncKindMeta()
      this.updatePreview()
    })
  },

  /** 打开图标面板：自动定位到当前图标所属的分组 */
  openIconPicker() {
    const groups = this.data.emojiGroups
    const cur = this.data.form && this.data.form.icon
    const hit = groups.find(g => g.icons.indexOf(cur) > -1)
    const iconGroup = hit ? hit.key : groups[0].key
    const group = groups.find(g => g.key === iconGroup) || groups[0]
    this.setData({
      iconGroup: group.key,
      currentIcons: group.icons,
      showIconPicker: true
    })
  },

  closeIconPicker() {
    this.setData({ showIconPicker: false })
  },

  onIconGroup(e) {
    const key = e.currentTarget.dataset.key
    const group = this.data.emojiGroups.find(g => g.key === key) || this.data.emojiGroups[0]
    this.setData({ iconGroup: group.key, currentIcons: group.icons })
  },

  pickIcon(e) {
    this.setData({ 'form.icon': e.currentTarget.dataset.emoji, showIconPicker: false })
  },

  /** 阻止弹层内部点击冒泡到遮罩 */
  noop() {},

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
    this.setData({ 'form.cycleDays': Number(e.currentTarget.dataset.days) }, () => this.updatePreview())
  },

  /** 事件：循环间隔开关（关闭 = 纯记录，只数天数、不做提醒） */
  onCycleToggle(e) {
    const on = !!e.detail.value
    const cur = Number(this.data.form.cycleDays) || 0
    if (on) {
      const next = cur > 0 ? cur : this._lastCycle || 7
      this._lastCycle = next
      this.setData({ cycleEnabled: true, 'form.cycleDays': next }, () => this.updatePreview())
    } else {
      if (cur > 0) this._lastCycle = cur
      this.setData({ cycleEnabled: false, 'form.cycleDays': '' }, () => this.updatePreview())
    }
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
    // 点击预设即以预设为准：名称、图标、分类、类型、周期等全部采用预设值
    const form = Object.assign({}, this.data.form, built, { name: preset.name })
    this.setData(
      {
        form,
        kind: form.kind,
        isCountUp: form.mode === MODE.COUNTUP,
        showKind: form.mode === MODE.COUNTUP,
        unitIndex: Math.max(0, SHELF_UNITS.findIndex(u => u.key === form.shelfLifeUnit))
      },
      () => {
        this.syncKindMeta()
        this.updatePreview()
      }
    )
    wx.showToast({ title: '已填入「' + preset.name + '」', icon: 'none' })
  },

  validate() {
    const f = this.data.form
    const kt = kindText(f.kind)
    if (!f.name || !String(f.name).trim()) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
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
        wx.showToast({ title: '请选择' + kt.lastLabel, icon: 'none' })
        return false
      }
      // 事件可以不设循环间隔（纯记录）；物品正计时仍需填写
      const needCycle = f.kind !== KIND.EVENT || this.data.cycleEnabled
      if (needCycle && (!f.cycleDays || Number(f.cycleDays) <= 0)) {
        wx.showToast({ title: '请填写' + kt.cycleLabel, icon: 'none' })
        return false
      }
    }
    return true
  },

  onSave() {
    if (this.data.saving) return
    if (!this.validate()) return

    const f = Object.assign({}, this.data.form)
    const isEvent = f.kind === KIND.EVENT
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
      f.detailTiming = false
    } else {
      // 事件不设循环间隔时，清空周期（纯记录）
      f.cycleDays = f.kind === KIND.EVENT && !this.data.cycleEnabled ? '' : Number(f.cycleDays) || ''
      f.produceDate = ''
      f.shelfLife = ''
      f.expireDate = ''
      // 正计时不涉及数量与存放位置
      f.quantity = 1
      f.location = ''
      f.detailTiming = !!f.detailTiming
      if (!f.cycleDays) f.remindDays = 0
    }

    this.setData({ saving: true })
    if (this.data.isEdit) {
      storage.update(this.data.id, f)
    } else {
      storage.add(f)
    }

    wx.showToast({
      title: this.data.isEdit ? '已保存' : (isEvent ? '已记录' : '已添加'),
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
      title: '删除记录',
      content: '删除后无法恢复，确定继续吗？',
      confirmColor: '#D4553C',
      success: res => {
        if (!res.confirm) return
        storage.remove(this.data.id)
        wx.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      }
    })
  }
})
