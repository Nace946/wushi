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
  EVENT_EMOJI_GROUPS,
  PIN_LIMIT,
  PIN_TEXT
} = require('../../utils/constants')

// 提前提醒天数：0 = 不提前提醒（只在临近时才由颜色变化提示）
const REMIND_OPTIONS = [
  { v: 0, t: '不提醒' },
  { v: 1, t: '1天' },
  { v: 2, t: '2天' },
  { v: 3, t: '3天' },
  { v: 5, t: '5天' },
  { v: 7, t: '7天' },
  { v: 15, t: '15天' },
  { v: 30, t: '30天' }
]
const CYCLE_OPTIONS = [7, 14, 21, 30, 60, 90, 180, 365]

Page({
  data: {
    isEdit: false,
    id: '',
    form: null,
    kind: KIND.ITEM,
    isEvent: false,
    isCountUp: false,
    cycleEnabled: true, // 事件 × 正计时：是否设置循环间隔（关闭 = 纯记录）
    cyclicEnabled: false, // 事件 × 倒计时：完成后是否自动进入下一轮（关闭 = 只记一次后归档）
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
    atText: '', // 起点精确时刻的展示文案
    atTime: '', // 时间选择器的值（'HH:mm'）
    atEmpty: true, // 是否尚未指定精确时刻（true 时灰显）
    // 首页置顶
    pinEnabled: false,
    pinUsed: 0,
    pinLimit: PIN_LIMIT,
    pinText: PIN_TEXT,
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
    // 倒计时字段文案（随物品 / 事件切换）
    ktExpireTitle: KIND_TEXT.item.expireTitle,
    ktCdStart: KIND_TEXT.item.cdStart,
    ktCdSpan: KIND_TEXT.item.cdSpan,
    ktCdExpire: KIND_TEXT.item.cdExpire,
    ktCdManual: KIND_TEXT.item.cdManual,
    ktCdManualHint: KIND_TEXT.item.cdManualHint,
    ktCycleSwitch: KIND_TEXT.event.cycleSwitchLabel,
    ktCycleSwitchHint: KIND_TEXT.event.cycleSwitchHint,
    ktCycleOff: KIND_TEXT.event.cycleOffText,
    ktCyclicLabel: KIND_TEXT.event.cyclicSwitchLabel,
    ktCyclicHint: KIND_TEXT.event.cyclicSwitchHint,
    ktCyclicOn: KIND_TEXT.event.cyclicOnText,
    ktCyclicOff: KIND_TEXT.event.cyclicOffText,
    ktCyclicManual: KIND_TEXT.event.cyclicManualHint,
    saving: false
  },

  onLoad(options) {
    const today = time.today()
    const isEvent = options.kind === KIND.EVENT
    const kind = isEvent ? KIND.EVENT : KIND.ITEM

    const baseForm = {
      name: '',
      icon: isEvent ? '🗓️' : '📦',
      category: isEvent ? 'life' : 'other',
      kind,
      mode: isEvent ? MODE.COUNTUP : MODE.COUNTDOWN,
      produceDate: today,
      shelfLife: '',
      shelfLifeUnit: 'day',
      expireDate: '',
      expireManual: false,
      // 事件 × 倒计时：完成后是否自动进入下一轮（默认关闭，避免意外重复）
      cyclic: false,
      lastDate: today,
      lastAt: 0, // 起点精确时刻（毫秒）；日期是今天时，保存会自动记为此刻
      cycleDays: '',
      quantity: 1,
      unit: isEvent ? '次' : '份',
      location: '',
      remindDays: isEvent ? 2 : 7,
      detailTiming: false,
      pinned: false, // 是否置顶到首页
      pinnedAt: 0,
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
        pinEnabled: !!form.pinned,
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
        pinEnabled: false
      })
      wx.setNavigationBarTitle({ title: isEvent ? '添加事件' : '添加物品' })
    }

    this.refreshPinCount()
    this.syncKindMeta()
    this.updatePreview()
  },

  /** 刷新置顶用量（把「当前这条是否已勾选」算进去） */
  refreshPinCount() {
    const others = storage.countPinned(this.data.id || '')
    const self = this.data.form && this.data.form.pinned ? 1 : 0
    this.setData({ pinUsed: others + self })
  },

  /**
   * 置顶开关：名额已满时不写入，并明确提示
   * （需求：在列表中添加置顶但已存在 5 个置顶时要进行提示）
   */
  onPinToggle(e) {
    const on = !!e.detail.value
    const others = storage.countPinned(this.data.id || '')

    if (on && others >= PIN_LIMIT) {
      this.setData({ pinEnabled: false, 'form.pinned': false, 'form.pinnedAt': 0 })
      this.refreshPinCount()
      wx.showModal({
        title: '置顶已满',
        content: PIN_TEXT.full + '。可在首页「置顶」分组点开记录，编辑时关闭其中一个，再来置顶这条。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#0A7F4E'
      })
      return
    }

    this.setData(
      {
        pinEnabled: on,
        'form.pinned': on,
        'form.pinnedAt': on ? Date.now() : 0
      },
      () => {
        this.refreshPinCount()
        wx.showToast({ title: on ? PIN_TEXT.on : PIN_TEXT.off, icon: 'none' })
      }
    )
  },

  /** 依据当前 kind / mode 同步分类、图标库、预设与文案 */
  syncKindMeta() {
    const f = this.data.form
    const kind = f.kind === KIND.EVENT ? KIND.EVENT : KIND.ITEM
    const isEvent = kind === KIND.EVENT
    const kt = kindText(kind)

    const categories = isEvent ? EVENT_CATEGORIES : CATEGORIES
    // 预设按当前计时方式过滤：事件均为正计时模板，事件选倒计时时列表为空（模板区整体隐藏）
    const presets = (isEvent ? EVENT_PRESETS : PRESETS).filter(p => p.mode === f.mode)

    this.setData({
      kind,
      isEvent,
      cycleEnabled: isEvent ? Number(f.cycleDays) > 0 : true,
      // 直接填写到期日时没有周期长度可推演，一律不做循环（开关也不显示）
      cyclicEnabled: !!f.cyclic && !f.expireManual,
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
      ktExpireTitle: kt.expireTitle,
      ktCdStart: kt.cdStart,
      ktCdSpan: kt.cdSpan,
      ktCdExpire: kt.cdExpire,
      ktCdManual: kt.cdManual,
      ktCdManualHint: kt.cdManualHint,
      ktCycleSwitch: kt.cycleSwitchLabel || KIND_TEXT.event.cycleSwitchLabel,
      ktCycleSwitchHint: kt.cycleSwitchHint || KIND_TEXT.event.cycleSwitchHint,
      ktCycleOff: kt.cycleOffText || KIND_TEXT.event.cycleOffText,
      // 倒计时的循环开关（事件专用）
      ktCyclicLabel: kt.cyclicSwitchLabel || KIND_TEXT.event.cyclicSwitchLabel,
      ktCyclicHint: kt.cyclicSwitchHint || KIND_TEXT.event.cyclicSwitchHint,
      ktCyclicOn: kt.cyclicOnText || KIND_TEXT.event.cyclicOnText,
      ktCyclicOff: kt.cyclicOffText || KIND_TEXT.event.cyclicOffText,
      ktCyclicManual: kt.cyclicManualHint || KIND_TEXT.event.cyclicManualHint
    })
  },

  /** 实时计算预览：倒计时=到期日；正计时=下次建议更换 / 下次提醒 */
  updatePreview() {
    const f = this.data.form
    // 起点精确时刻：所有正计时都记（与「详细计时」开关无关）。
    // 未指定时按「日期是今天 → 保存记为此刻 / 日期在过去 → 按当天 0 点计」兜底，
    // 展示文案与 atTime（时间选择器初值）都要跟着这个兜底走，避免选出来的时刻和预期不一致
    const isToday = f.lastDate === time.today()
    const at = Number(f.lastAt) || 0
    const hasAt = at > 0
    this.setData({
      atText: hasAt
        ? time.formatCN(f.lastDate) + ' ' + time.formatTime(at)
        : isToday
          ? '保存时记为此刻'
          : '未指定 · 按当天 0 点计',
      atTime: hasAt ? time.formatTime(at) : isToday ? time.formatTime(Date.now()) : '00:00',
      atEmpty: !hasAt
    })
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

  /**
   * 正计时：详细计时开关
   * 它只决定「超过一天时是否展示 年/月/日/时 细分」；
   * 起点精确时刻是所有正计时共有的，不会因为关掉开关被清空
   */
  onDetailTiming(e) {
    const on = !!e.detail.value
    const f = this.data.form
    const patch = { 'form.detailTiming': on }
    if (on && !Number(f.lastAt) && f.lastDate === time.today()) {
      // 开启时顺手补一个起点，立刻就能看到细分效果
      patch['form.lastAt'] = Date.now()
    }
    this.setData(patch, () => {
      this.updatePreview()
      if (patch['form.lastAt']) {
        wx.showToast({
          title: '已记录当前时刻 ' + time.formatTime(patch['form.lastAt']),
          icon: 'none'
        })
      }
    })
  },

  /** 取当前系统时间作为计时起点（同时把日期拉到今天） */
  onPickNow() {
    const now = Date.now()
    this.setData(
      {
        'form.lastDate': time.today(),
        'form.lastAt': now
      },
      () => {
        this.updatePreview()
        try {
          wx.vibrateShort({ type: 'light', fail: () => {} })
        } catch (err) {
          // 忽略
        }
        wx.showToast({ title: '起点已更新为 ' + time.formatTime(now), icon: 'none' })
      }
    )
  },

  /**
   * 手动指定起点精确时刻（时间选择器，值为 'HH:mm'）
   *
   * 时刻要挂在「上次发生日期」那天上，所以用 dayStart(lastDate) 取当天 0 点再加时/分。
   * 起点不能落在未来：当天选的时刻晚于此刻时回落到此刻，否则会显示成
   * 「已过去 1 分钟」这种自相矛盾的结果（getItemState 把负时长夹到了 0）。
   */
  onPickAt(e) {
    const f = this.data.form
    const parts = String(e.detail.value || '').split(':')
    if (parts.length !== 2 || !f.lastDate) return
    const h = Number(parts[0])
    const m = Number(parts[1])
    if (isNaN(h) || isNaN(m)) return
    let stamp = time.dayStart(f.lastDate) + h * 3600000 + m * 60000
    if (isNaN(stamp)) return
    if (stamp > Date.now()) {
      stamp = Date.now()
      wx.showToast({ title: '不能晚于当前时刻，已取此刻', icon: 'none' })
    }
    this.setData({ 'form.lastAt': stamp }, () => this.updatePreview())
  },

  /** 记录类型：物品 / 事件（v3.0 起常显，不再只在正计时下出现） */
  onKind(e) {
    const kind = e.currentTarget.dataset.kind
    if (!kind || kind === this.data.form.kind) return
    const isEvent = kind === KIND.EVENT
    const cats = isEvent ? EVENT_CATEGORIES : CATEGORIES
    const patch = {
      'form.kind': kind,
      kind
    }
    // 图标若仍是默认图标，跟随类型切换（物品 📦 / 事件 🗓️）；自定义图标保持不变
    if (this.isDefaultIcon(this.data.form.icon)) {
      patch['form.icon'] = this.defaultIconOf(kind)
    }
    // 切换后若原分类不在新类型的分类里，回落到第一个分类
    const cur = this.data.form.category
    if (!cats.some(c => c.key === cur)) {
      patch['form.category'] = cats[0].key
    }
    this.setData(patch, () => this.syncKindMeta())
  },

  /**
   * 计时方式：倒计时 / 正计时
   * v3.0 起两种方式对物品与事件都开放，切换计时方式**不再联动记录类型**
   */
  onMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.form.mode) return
    this.setData({ 'form.mode': mode, isCountUp: mode === MODE.COUNTUP }, () => {
      this.syncKindMeta()
      this.updatePreview()
    })
  },

  onCategory(e) {
    const key = e.currentTarget.dataset.key
    // 切换分类只改分类本身：图标与计时方式都保持用户当前的选择
    // （v3.0 起计时方式完全由「计时方式」区块决定，分类不再反推 mode）
    this.setData({ 'form.category': key }, () => {
      this.syncKindMeta()
      this.updatePreview()
    })
  },

  /** 默认图标由记录类型决定：物品 📦、事件 🗓️ */
  defaultIconOf(kind) {
    return kind === KIND.EVENT ? '🗓️' : '📦'
  },

  /** 当前图标是否仍是默认图标（用户没在图标面板里手动选过） */
  isDefaultIcon(icon) {
    return icon === '📦' || icon === '🗓️'
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
    const val = e.detail.value
    const patch = { ['form.' + field]: val }
    if (field === 'lastDate') {
      // 日期一改，原先记的精确时刻就对不上了：改成今天则取此刻，改成过去某天则清空（按 0 点计）
      patch['form.lastAt'] = val === time.today() ? Date.now() : 0
    }
    this.setData(patch, () => this.updatePreview())
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

  /**
   * 直接填写到期日
   * 这一模式下没有周期长度，无法推演下一轮，因此不做循环：
   * 打开时顺手把「完成后自动循环」关掉（开关本身也不显示）
   */
  onExpireManual(e) {
    const on = e.detail.value
    const patch = { 'form.expireManual': on }
    if (on) {
      patch.cyclicEnabled = false
      patch['form.cyclic'] = false
    }
    this.setData(patch, () => this.updatePreview())
  },

  /**
   * 事件 × 倒计时：完成后是否自动进入下一轮
   * 开启 = 完成时重新计时；关闭 = 完成时记一笔流水，这条计时自动收起
   */
  onCyclicToggle(e) {
    const on = !!e.detail.value
    this.setData({ cyclicEnabled: on, 'form.cyclic': on })
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
        pinEnabled: !!form.pinned,
        unitIndex: Math.max(0, SHELF_UNITS.findIndex(u => u.key === form.shelfLifeUnit))
      },
      () => {
        this.syncKindMeta()
        this.updatePreview()
        this.refreshPinCount()
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
    // 0 = 不提前提醒，不能用 || 兜底（会把 0 换成默认的 7）
    const rdRaw = Number(f.remindDays)
    f.remindDays = isNaN(rdRaw) ? 7 : Math.max(0, rdRaw)
    // 置顶：兜底校验名额，超出时按不置顶保存（开关处已提示过一次）
    f.pinned = !!f.pinned
    f.pinnedAt = f.pinned ? Number(f.pinnedAt) || Date.now() : 0
    if (f.pinned && storage.countPinned(this.data.id || '') >= PIN_LIMIT) {
      f.pinned = false
      f.pinnedAt = 0
    }
    if (f.mode === MODE.COUNTDOWN) {
      f.shelfLife = Number(f.shelfLife) || ''
      // 自动算出到期日，便于列表直接读取
      f.expireDate = f.expireManual
        ? f.expireDate
        : time.computeExpire(f.produceDate, f.shelfLife, f.shelfLifeUnit)
      f.lastDate = ''
      f.cycleDays = ''
      f.detailTiming = false
      // 事件的倒计时可以「完成后自动循环」；物品用不到（用完即换新）
      // 「直接填写到期日」没有周期长度，不做循环
      f.cyclic = isEvent && !f.expireManual ? !!this.data.cyclicEnabled : false
    } else {
      // 事件不设循环间隔时，清空周期（纯记录）
      f.cycleDays = f.kind === KIND.EVENT && !this.data.cycleEnabled ? '' : Number(f.cycleDays) || ''
      f.cyclic = false
      f.produceDate = ''
      f.shelfLife = ''
      f.expireDate = ''
      // 正计时不涉及数量与存放位置
      f.quantity = 1
      f.location = ''
      f.detailTiming = !!f.detailTiming
      // 起点精确时刻：所有正计时都记，跟「详细计时」开关无关
      // （否则今天刚创建的事件会从 0 点开始算，显示成「已过去 8 小时」）
      f.lastAt = time.resolveStartAt(f.lastDate, f.lastAt)
      if (!f.cycleDays) f.remindDays = 0
    }
    // 事件不涉及数量与存放位置（倒计时也一样），统一清空
    if (isEvent) {
      f.quantity = 1
      f.location = ''
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
      confirmColor: '#E0341F',
      success: res => {
        if (!res.confirm) return
        storage.remove(this.data.id)
        wx.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      }
    })
  }
})
