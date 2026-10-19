/**
 * 天天计时 · 常量与预设
 */

// 计时模式
const MODE = {
  COUNTDOWN: 'countdown', // 倒计时：有保质期，越用越少（食品/药品/化妆品）
  COUNTUP: 'countup' // 正计时：距上次发生多久，越久越该处理（物品换洗 / 生活事件）
}

// 记录类型：物品（有实体的东西）/ 事件（发生在自己身上的事）
const KIND = {
  ITEM: 'item',
  EVENT: 'event'
}

/**
 * 物品分类
 * 注：`mode` 仅作「推荐计时方式」的记录；v3.0 起不再由分类反推表单的计时方式
 * （添加页改为「先选物品/事件，再选倒计时/正计时」，模式完全由用户决定）
 */
const CATEGORIES = [
  { key: 'food', name: '食品', icon: '🥛', mode: MODE.COUNTDOWN, kind: KIND.ITEM },
  { key: 'medicine', name: '药品', icon: '💊', mode: MODE.COUNTDOWN, kind: KIND.ITEM },
  { key: 'cosmetic', name: '化妆品', icon: '🧴', mode: MODE.COUNTDOWN, kind: KIND.ITEM },
  { key: 'daily', name: '日用品', icon: '🧺', mode: MODE.COUNTUP, kind: KIND.ITEM },
  { key: 'appliance', name: '家电耗材', icon: '🔌', mode: MODE.COUNTUP, kind: KIND.ITEM },
  { key: 'other', name: '其他', icon: '📦', mode: MODE.COUNTDOWN, kind: KIND.ITEM }
]

/**
 * 事件分类：围绕「距离上次做某事多久」的生活场景
 * 洗澡、上厕所、距离上次吃火锅……这些都不是"物品"，而是一次次发生的事
 *
 * v3.8 新增「日常」「任务」两类：
 * - 日常：每天/隔天重复的琐碎小事（刷牙、记账、整理桌面），比"生活起居"更泛
 * - 任务：有明确截止感或周期性的事务（交房租、缴费、还款、打卡）
 * 注：key 用 routine / task，刻意避开物品分类里已有的 daily（日用品），
 *     避免「物品+事件」两套分类被 concat 后出现同名 key 撞车
 */
const EVENT_CATEGORIES = [
  { key: 'life', name: '生活起居', icon: '🛁', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'routine', name: '日常', icon: '🌤️', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'task', name: '任务', icon: '📋', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'food', name: '美食', icon: '🍜', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'health', name: '健康', icon: '💪', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'house', name: '家务', icon: '🧹', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'other', name: '其他', icon: '🗓️', mode: MODE.COUNTUP, kind: KIND.EVENT }
]

/**
 * 按记录类型区分的文案：物品说"更换/清洗"，事件说"发生/再来一次"
 * 页面统一从这里取词，避免同一句话在物品和事件上读起来别扭
 */
const KIND_TEXT = {
  item: {
    tag: '物品',
    lastLabel: '上次处理',
    cycleLabel: '建议更换周期',
    nextLabel: '下次建议更换',
    lastShort: '上次更换',
    cycleShort: '建议周期',
    nextShort: '下次建议',
    presetTitle: '快速开始 · 常见物品',
    nameLabel: '物品名称',
    namePlaceholder: '例如：牛奶',
    submitNew: '开始计时',
    countUnit: '件',
    orderWord: '件',
    resetBtn: '我刚处理过，重新开始计时',
    resetModalTitle: '记录一次处理',
    resetModal: n => '将「' + n + '」的上次处理时间更新为此刻，计时重新开始。如需改时间，可在编辑页手动指定。',
    resetToast: '已重新开始计时',
    resetBtnShort: '已重新开始计时',
    periodWord: '使用周期',
    tip: '记下上次更换的时间，之后自动计时。',
    countSteps: [7, 14, 21, 30, 60, 90, 180, 365],
    // —— 倒计时（v3.0 起事件也支持倒计时，文案随 kind 切换）——
    expireTitle: '保质期信息',
    cdStart: '生产日期',
    cdSpan: '保质期',
    cdExpire: '到期日',
    cdManual: '直接填写到期日',
    cdManualHint: '',
    subOver: n => '建议更换时间已过 ' + n + ' 天',
    subDue: '已到建议周期，建议今天处理',
    subSoon: d => '建议 ' + d + ' 前更换'
  },
  event: {
    tag: '事件',
    lastLabel: '上次发生',
    cycleLabel: '间隔时间',
    nextLabel: '下次提醒',
    lastShort: '上次发生',
    cycleShort: '预期时间',
    nextShort: '下次提醒',
    presetTitle: '快速开始 · 常见事件',
    nameLabel: '事件名称',
    namePlaceholder: '例如：健身',
    submitNew: '开始记录',
    countUnit: '条',
    orderWord: '条',
    resetBtn: '刚刚做过，重新计时',
    resetModalTitle: '记录一次发生',
    resetModal: n => '将「' + n + '」的上次发生时间更新为此刻并重新计时，如需更改时间请在编辑中修改。',
    resetToast: '已重新计时',
    resetBtnShort: '已重新计时',
    periodWord: '记录方式',
    tip: '记下这件事上次发生的时间，之后由它帮你数。',
    // —— 循环间隔（可选）：不设置时按「纯记录」处理 ——
    cycleSwitchLabel: '设置预期间隔',
    cycleSwitchHint: '会根据你的预期作为提醒标准',
    cycleOffText: '未开启：只记录「距离上次多久」，不会提醒你',
    cycleOffShort: '不循环（仅记录）',
    countSteps: [1, 2, 3, 5, 7, 14, 30],
    // —— 倒计时（v3.0 起事件也能用倒计时，比如生日、纪念日、交房租）——
    expireTitle: '倒计时信息',
    cdStart: '起始日期',
    cdSpan: '持续天数',
    cdExpire: '到期日',
    cdManual: '直接填写到期日',
    cdManualHint: '只知道具体是哪一天时打开',
    // —— 倒计时的「循环」开关（事件专用）：完成后自动进入下一轮 ——
    cyclicSwitchLabel: '完成后自动重新倒计时',
    cyclicSwitchHint: '开启后完成即进入下一周期',
    cyclicOnText: '完成后自动进入下一轮',
    cyclicOffText: '未开启：完成后只记一次，这条计时会自动删除',
    // 直接填写到期日时不做循环（没有周期长度可推演），因此不显示开关
    cyclicManualHint: '直接填写到期日不做循环，完成后只记一次',
    subOver: n => '已经超过预期时间 ' + n + ' 天',
    subDue: '已到预期时间，可以再来一次',
    subSoon: d => '大约 ' + d + ' 后再来一次'
  }
}

/**
 * 「纯记录」事件档位：不设循环间隔时，按已经过去多少天给出说法
 * 语义从「还剩多久」换成「有多久没做了」，因此不参与进度条计算
 */
const OPEN_LEVELS = [
  { status: 'normal', maxDays: 0, label: '刚刚做完', color: '#0A7F4E', soft: '#DCEFE4', sub: '就是今天，不用惦记' },
  { status: 'normal', maxDays: 3, label: '才做过不久', color: '#0A7F4E', soft: '#DCEFE4', sub: '刚做过不久，安心' },
  { status: 'soon', maxDays: 14, label: '有一阵没做了', color: '#D97B00', soft: '#FBEBD3', sub: '有一阵子了，想起来就做一下' },
  { status: 'urgent', maxDays: 45, label: '很久没做了', color: '#E0341F', soft: '#FCE0D8', sub: '确实挺久了，要不要安排一下' },
  { status: 'over', maxDays: 999999, label: '快忘记了', color: '#5F5F57', soft: '#E9E4D9', sub: '太久没做，小心彻底忘掉' }
]

/** 取某类型的文案，缺省按物品处理 */
function kindText(kind) {
  return KIND_TEXT[kind === KIND.EVENT ? 'event' : 'item']
}

// 状态定义（四档，颜色柔和，降低焦虑感）
const STATUS = {
  NORMAL: 'normal', // 充裕 / 正常使用
  SOON: 'soon', // 临近（进入提醒区间 / 接近建议周期）
  URGENT: 'urgent', // 紧急（≤3 天 / 已达建议周期）
  OVER: 'over' // 已过期 / 超期未处理
}

const STATUS_META = {
  normal: { label: '时间充裕', color: '#0A7F4E', soft: '#DCEFE4' },
  soon: { label: '临近过期', color: '#D97B00', soft: '#FBEBD3' },
  urgent: { label: '即将过期', color: '#E0341F', soft: '#FCE0D8' },
  over: { label: '已过期', color: '#5F5F57', soft: '#E9E4D9' }
}

// 正计时超期文案
const STATUS_META_UP = {
  normal: { label: '正常', color: '#0A7F4E', soft: '#DCEFE4' },
  soon: { label: '快到期', color: '#D97B00', soft: '#FBEBD3' },
  urgent: { label: '该处理了', color: '#E0341F', soft: '#FCE0D8' },
  over: { label: '已超期', color: '#5F5F57', soft: '#E9E4D9' }
}

// 保质期单位
const SHELF_UNITS = [
  { key: 'day', name: '天' },
  { key: 'month', name: '个月' },
  { key: 'year', name: '年' }
]

// 常用数量单位
const QUANTITY_UNITS = ['份', '件', '瓶', '盒', '袋', '支', '个', '包', '罐', 'ml', 'g']

/**
 * 预设模板：一键填充，减少录入步骤
 * 说明：以下周期为常见经验值，仅作默认参考，用户可随时修改
 */
const PRESETS = [
  // —— 倒计时（保质期）——
  { name: '牛奶', category: 'food', icon: '🥛', mode: MODE.COUNTDOWN, shelfLife: 7, shelfLifeUnit: 'day', remindDays: 2, unit: '瓶', location: '冰箱冷藏' },
  { name: '鸡蛋', category: 'food', icon: '🥚', mode: MODE.COUNTDOWN, shelfLife: 30, shelfLifeUnit: 'day', remindDays: 5, unit: '个', location: '冰箱冷藏' },
  { name: '面包', category: 'food', icon: '🍞', mode: MODE.COUNTDOWN, shelfLife: 5, shelfLifeUnit: 'day', remindDays: 1, unit: '袋', location: '常温' },
  { name: '土豆', category: 'food', icon: '🥔', mode: MODE.COUNTDOWN, shelfLife: 45, shelfLifeUnit: 'day', remindDays: 10, unit: '个', location: '常温' },
  { name: '大米', category: 'food', icon: '🍚', mode: MODE.COUNTDOWN, shelfLife: 6, shelfLifeUnit: 'month', remindDays: 15, unit: '袋', location: '米桶' },
  { name: '食用油', category: 'food', icon: '🫙', mode: MODE.COUNTDOWN, shelfLife: 18, shelfLifeUnit: 'month', remindDays: 30, unit: '瓶', location: '橱柜' },
  { name: '冷冻食材', category: 'food', icon: '🧊', mode: MODE.COUNTDOWN, shelfLife: 3, shelfLifeUnit: 'month', remindDays: 15, unit: '袋', location: '冰箱冷冻' },
  { name: '罐头食品', category: 'food', icon: '🥫', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '罐', location: '橱柜' },
  { name: '茶叶', category: 'food', icon: '🍵', mode: MODE.COUNTDOWN, shelfLife: 18, shelfLifeUnit: 'month', remindDays: 30, unit: '罐', location: '橱柜' },
  { name: '感冒药', category: 'medicine', icon: '💊', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '盒', location: '药箱' },
  { name: '外用药膏', category: 'medicine', icon: '🩹', mode: MODE.COUNTDOWN, shelfLife: 1, shelfLifeUnit: 'year', remindDays: 30, unit: '支', location: '药箱' },
  { name: '维生素', category: 'medicine', icon: '🍬', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '瓶', location: '药箱' },
  { name: '眼药水', category: 'medicine', icon: '👁️', mode: MODE.COUNTDOWN, shelfLife: 28, shelfLifeUnit: 'day', remindDays: 5, unit: '支', location: '药箱' },
  { name: '面霜', category: 'cosmetic', icon: '🧴', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '瓶', location: '梳妆台' },
  { name: '防晒霜', category: 'cosmetic', icon: '☀️', mode: MODE.COUNTDOWN, shelfLife: 1, shelfLifeUnit: 'year', remindDays: 30, unit: '支', location: '梳妆台' },
  { name: '口红', category: 'cosmetic', icon: '💄', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '支', location: '梳妆台' },
  { name: '睫毛膏', category: 'cosmetic', icon: '🖌️', mode: MODE.COUNTDOWN, shelfLife: 3, shelfLifeUnit: 'month', remindDays: 10, unit: '支', location: '梳妆台' },

  // —— 正计时（使用/更换周期）——
  { name: '床单被套', category: 'daily', icon: '🛏️', mode: MODE.COUNTUP, cycleDays: 14, remindDays: 3, unit: '套', location: '卧室' },
  { name: '牙刷', category: 'daily', icon: '🪥', mode: MODE.COUNTUP, cycleDays: 90, remindDays: 7, unit: '支', location: '卫生间' },
  { name: '洗碗布', category: 'daily', icon: '🧽', mode: MODE.COUNTUP, cycleDays: 14, remindDays: 3, unit: '块', location: '厨房' },
  { name: '筷子', category: 'daily', icon: '🥢', mode: MODE.COUNTUP, cycleDays: 180, remindDays: 15, unit: '双', location: '厨房' },
  { name: '枕芯', category: 'daily', icon: '💤', mode: MODE.COUNTUP, cycleDays: 365, remindDays: 30, unit: '个', location: '卧室' },
  { name: '空调滤网', category: 'appliance', icon: '❄️', mode: MODE.COUNTUP, cycleDays: 180, remindDays: 15, unit: '片', location: '客厅' },
  { name: '空气净化器滤芯', category: 'appliance', icon: '🌬️', mode: MODE.COUNTUP, cycleDays: 180, remindDays: 15, unit: '个', location: '客厅' },
  { name: '净水器滤芯', category: 'appliance', icon: '🚰', mode: MODE.COUNTUP, cycleDays: 180, remindDays: 15, unit: '个', location: '厨房' },
  { name: '洗衣机槽清洁', category: 'appliance', icon: '🫧', mode: MODE.COUNTUP, cycleDays: 90, remindDays: 7, unit: '次', location: '卫生间' },
  { name: '扫地机配件', category: 'appliance', icon: '🤖', mode: MODE.COUNTUP, cycleDays: 90, remindDays: 7, unit: '套', location: '客厅' }
]

/**
 * 事件预设：一键填入「日常会发生的事」，周期为常见经验值，可自行修改
 * 对应需求里的洗澡、如厕、距离上次吃某样美食等场景
 */
const EVENT_PRESETS = [
  // —— 生活起居 ——
  { name: '洗澡', category: 'life', icon: '🛁', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 2, remindDays: 1 },
  { name: '理发', category: 'life', icon: '💇', mode: MODE.COUNTUP, kind: KIND.EVENT, remindDays: 0 },
  { name: '交房租', category: 'task', icon: '🏠', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 5 },
  { name: '交水电费', category: 'task', icon: '💡', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 5 },
  { name: '还信用卡', category: 'task', icon: '💳', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 7 },
  // —— 美食 ——
  { name: '吃火锅', category: 'food', icon: '🍲', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 7 },
  { name: '吃烧烤', category: 'food', icon: '🍢', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 7 },
  { name: '喝奶茶', category: 'food', icon: '🧋', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  { name: '吃蛋糕', category: 'food', icon: '🍰', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 15, remindDays: 3 },
  { name: '吃炸鸡', category: 'food', icon: '🍗', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 21, remindDays: 5 },
  // —— 健康 ——
  { name: '运动', category: 'health', icon: '🏃', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 2, remindDays: 1 },
  { name: '体检', category: 'health', icon: '🩺', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 365, remindDays: 30 },
  { name: '洗牙', category: 'health', icon: '🦷', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 180, remindDays: 15 },
  { name: '量血压', category: 'health', icon: '🩸', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  // —— 家务 ——
  { name: '拖地', category: 'house', icon: '🧹', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  { name: '浇花', category: 'house', icon: '🪴', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 5, remindDays: 1 },
  { name: '遛狗', category: 'house', icon: '🐕', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 1, remindDays: 1 },
  { name: '擦窗户', category: 'house', icon: '🪟', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 7 },
  { name: '清理冰箱', category: 'house', icon: '🧊', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 7 },
  // —— 日常（v3.8 新增分类）——
  { name: '整理房间', category: 'routine', icon: '🧺', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  { name: '记账', category: 'routine', icon: '🧾', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 5 },
  { name: '冥想', category: 'routine', icon: '🧘', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 1, remindDays: 1 },
  // —— 任务（v3.8 新增分类）——
  { name: '每日打卡', category: 'task', icon: '📝', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 1, remindDays: 1 },
  // —— 其他 ——
  { name: '联系家人', category: 'other', icon: '📞', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  { name: '写日记', category: 'other', icon: '✏️', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 3, remindDays: 1 },
  { name: '看书', category: 'other', icon: '📚', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 }
  // —— 纯记录型：不设循环间隔，只留一个「距离上次多久」的时间痕迹 ——
]

/**
 * 图标库：按分类分组，点击图标区弹出面板选择（类似微信选表情）
 * 仅收录系统支持较广的常见 emoji
 */
const EMOJI_GROUPS = [
  {
    key: 'common',
    name: '常用',
    icons: ['🥛', '🍞', '🥚', '🍚', '🍶', '🥫', '🍎', '🥬', '💊', '🧂️', '🧴', '💄', '🛏️', '🪥', '🧺', '🔌', '🌬️', '📦']
  },
  {
    key: 'food',
    name: '食品',
    icons: ['🥛', '🍞', '🥚', '🍚', '🍶', '🥫', '🍎', '🍌', '🍇', '🍊', '🥬', '🥕', '🍅', '🥩', '🐟', '🍤', '🍰', '🧊', '🍵', '🍯', '🧀', '🥜', '🍜', '🥟']
  },
  {
    key: 'medicine',
    name: '药品',
    icons: ['💊', '🩹', '🩺', '🧪', '🌡️', '💉', '😷', '🧫', '🩼', '🦠', '🧬', '🩻', '🫀', '👁️', '🦴', '🧠']
  },
  {
    key: 'cosmetic',
    name: '化妆',
    icons: ['🧴', '💄', '💅', '🧼', '🪒', '🪮', '👄', '🧖', '🪞', '🎭', '🖌️', '💧', '🌸', '🫧', '🧽', '👃']
  },
  {
    key: 'daily',
    name: '日用',
    icons: ['🛏️', '🛌', '🧺', '🧻', '🛁', '🚿', '🪥', '🧽', '🥢', '🍽️', '🧹', '🪣', '👕', '👖', '🧦', '🧯', '🪑', '🛋️', '🚪']
  },
  {
    key: 'appliance',
    name: '家电',
    icons: ['🔌', '🌬️', '🚰', '❄️', '🤖', '🫧', '🔋', '💡', '🖥️', '📺', '🌀', '🔧', '🧊', '📡', '🔦', '⚙️']
  },
  {
    key: 'other',
    name: '其他',
    icons: ['📦', '🎁', '📚', '✏️', '🔑', '🧸', '🎈', '🌿', '🪴', '🐾', '⚽', '🎨', '🕯️', '⏰', '📱', '💳', '🧳', '☂️']
  }
]

/**
 * 事件图标库：按事件分类分组，选中事件类型时使用
 */
const EVENT_EMOJI_GROUPS = [
  { key: 'life', name: '生活', icons: ['🛁', '🚿', '🪥', '🛒', '💆', '💇', '🪒', '🧼', '🛌', '💰️', '🚽', '🧴', '🚬'] },
  { key: 'routine', name: '日常', icons: ['🎮️', '☀️', '🌙', '🖥️' ,'🪥', '🧺', '🎣️', '🍵', '📖', '🎧', '🎫️' , '🧘', '🛏️', '🧹', '🧾', '🀄️'] },
  { key: 'task', name: '任务', icons: ['📋', '🎯', '📌', '🗓️', '⏰', '💰', '💳', '📝', '📤', '🔔', '🏠', '💡'] },
  { key: 'food', name: '美食', icons: ['🍲', '🍢', '🧋', '🍰', '🍗', '🍜', '🍕', '🍔', '🍦', '🎂' ,'🍺', '🥘', '🍤'] },
  { key: 'health', name: '健康', icons: ['💪', '🏃', '⚽️', '🏀️', '🏐️', '🥎️' , '🏓️', '🏸️' , '🎱️' , '🧘', '🚴', '🏊', '🥊', '🏊', '😷', '🌡️'] },
  { key: 'house', name: '家务', icons: ['🧹', '🪴', '🐕', '🪟', '🧊', '🧺', '🛋️', '🧽', '🪣', '🧯', '🍽️', '🚪'] },
  { key: 'other', name: '其他', icons: ['🗓️', '📌', '📞', '✏️', '📚', '🎯', '🎵', '🎨', '🧩', '☀️', '🌙', '🎮', '💌'] }
]

/**
 * 首页每日一句：舒缓治愈风格，一句不超 15 个字（含标点），短而有余味
 * 进入首页时随机取一条，避免与上一条重复
 */
const SLOGANS = [
  '万物有时，生活有数',
  '时间不语，替你记着',
  '一物一事，皆有期限',
  '时间有痕，生活有光',
  '该换的换，该做的做',
  '你记着它，她记着你',
  '你记着它，他记着你',
  '时间有刻度，生活有回响',
  '每一件，都会刚刚好',
  '看一眼心里就有底了',
  '把琐碎交给它，把安心留给自己',
  '记得住的日子，走得更踏实',
  '今天，有件小事等你想起',
  '慢一点也没关系，记得就好',
  '数着日子，把生活过好',
  '让它替你数着，你只管认真生活'
]

// 排序方式
const SORT_OPTIONS = [
  { key: 'urgent', name: '最紧急优先' },
  { key: 'name', name: '按名称' },
  { key: 'recent', name: '按时间排序' }
]

/**
 * 首页置顶：最多同时钉住 5 条记录（物品倒计时/物品正计时/事件都可）
 * 置顶的记录会固定显示在首页「置顶」分组里，不再重复出现在关注/处理列表
 */
const PIN_LIMIT = 5

/** 置顶相关文案 */
const PIN_TEXT = {
  label: '置顶到首页',
  hint: '固定在首页最上方，方便随时看到',
  hintOn: '已置顶，会一直显示在首页最上方',
  hintOff: '最多可置顶 ' + PIN_LIMIT + ' 条',
  full: '置顶已满 ' + PIN_LIMIT + ' 条，请先取消一个置顶',
  on: '已置顶到首页',
  off: '已取消置顶',
  section: '置顶',
  empty: '还没有置顶的记录，在编辑页打开「置顶到首页」即可'
}

/**
 * 首页概览的两组四档统计（物品 / 事件各一组）
 * - 颜色与物品一致：充裕绿 → 临近琥珀 → 紧急红 → 已过期灰
 * - 事件用两个字命名，便于四宫格排版；依次对应事件列表的
 *   最近 / 不久 / 近期 / 遥远
 */
const ITEM_STAT_META = [
  { key: 'normal', name: '充裕', color: '#0A7F4E' },
  { key: 'soon', name: '临近', color: '#D97B00' },
  { key: 'urgent', name: '紧急', color: '#E0341F' },
  { key: 'over', name: '已过期', color: '#5F5F57' }
]

const EVENT_STAT_META = [
  { key: 'normal', name: '最近', color: '#0A7F4E' },
  { key: 'soon', name: '不久', color: '#D97B00' },
  { key: 'urgent', name: '近期', color: '#E0341F' },
  { key: 'over', name: '遥远', color: '#5F5F57' }
]

module.exports = {
  MODE,
  KIND,
  CATEGORIES,
  EVENT_CATEGORIES,
  KIND_TEXT,
  kindText,
  OPEN_LEVELS,
  STATUS,
  STATUS_META,
  STATUS_META_UP,
  SHELF_UNITS,
  QUANTITY_UNITS,
  PRESETS,
  EVENT_PRESETS,
  EMOJI_GROUPS,
  EVENT_EMOJI_GROUPS,
  SLOGANS,
  SORT_OPTIONS,
  PIN_LIMIT,
  ITEM_STAT_META,
  EVENT_STAT_META,
  PIN_TEXT
}
