/**
 * 物时 · 常量与预设
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

// 物品分类
const CATEGORIES = [
  { key: 'food', name: '食品', icon: '🥛', mode: MODE.COUNTDOWN, kind: KIND.ITEM },
  { key: 'medicine', name: '药品', icon: '💊', mode: MODE.COUNTDOWN, kind: KIND.ITEM },
  { key: 'cosmetic', name: '化妆品', icon: '🧴', mode: MODE.COUNTDOWN, kind: KIND.ITEM },
  { key: 'daily', name: '日用品', icon: '🧺', mode: MODE.COUNTUP, kind: KIND.ITEM },
  { key: 'appliance', name: '家电耗材', icon: '🔌', mode: MODE.COUNTUP, kind: KIND.ITEM },
  { key: 'other', name: '其他', icon: '📦', mode: MODE.COUNTDOWN, kind: KIND.ITEM }
]

/**
 * 事件分类（仅正计时）：围绕「距离上次做某事多久」的生活场景
 * 洗澡、上厕所、距离上次吃火锅……这些都不是"物品"，而是一次次发生的事
 */
const EVENT_CATEGORIES = [
  { key: 'life', name: '生活起居', icon: '🛁', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'food', name: '美食', icon: '🍜', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'health', name: '健康', icon: '💪', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'house', name: '家务', icon: '🧹', mode: MODE.COUNTUP, kind: KIND.EVENT },
  { key: 'other', name: '其他', icon: '📌', mode: MODE.COUNTUP, kind: KIND.EVENT }
]

/**
 * 按记录类型区分的文案：物品说"更换/清洗"，事件说"发生/再来一次"
 * 页面统一从这里取词，避免同一句话在物品和事件上读起来别扭
 */
const KIND_TEXT = {
  item: {
    tag: '物品',
    lastLabel: '上次更换 / 清洗',
    cycleLabel: '建议更换周期（天）',
    nextLabel: '下次建议更换',
    lastShort: '上次更换',
    cycleShort: '建议周期',
    nextShort: '下次建议',
    presetTitle: '快速开始 · 常见物品',
    nameLabel: '物品名称',
    namePlaceholder: '例如：鲜牛奶',
    submitNew: '开始计时',
    countUnit: '件',
    orderWord: '件',
    resetBtn: '我刚处理过，重新开始计时',
    resetModalTitle: '记录一次处理',
    resetModal: n => '将「' + n + '」的上次处理时间更新为今天，计时重新开始。',
    resetToast: '已重新开始计时',
    resetBtnShort: '已重新开始计时',
    periodWord: '使用周期',
    tip: '记下上次更换的时间，之后由它自己数着走，到了周期会提醒你。',
    countSteps: [7, 14, 21, 30, 60, 90, 180, 365],
    subOver: n => '建议更换时间已过 ' + n + ' 天',
    subDue: '已到建议周期，建议今天处理',
    subSoon: d => '建议 ' + d + ' 前更换'
  },
  event: {
    tag: '事件',
    lastLabel: '上次发生',
    cycleLabel: '循环间隔（天）',
    nextLabel: '下次提醒',
    lastShort: '上次发生',
    cycleShort: '循环间隔',
    nextShort: '下次提醒',
    presetTitle: '快速开始 · 常见事件',
    nameLabel: '事件名称',
    namePlaceholder: '例如：洗澡、吃火锅',
    submitNew: '开始记录',
    countUnit: '条',
    orderWord: '条',
    resetBtn: '刚刚做过，重新计时',
    resetModalTitle: '记录一次发生',
    resetModal: n => '将「' + n + '」的上次发生时间更新为今天，重新计时。',
    resetToast: '已重新计时',
    resetBtnShort: '已重新计时',
    periodWord: '记录方式',
    tip: '记下这件事上次发生的时间，之后由它自己数着走。',
    // —— 循环间隔（可选）：不设置时按「纯记录」处理 ——
    cycleSwitchLabel: '设置循环间隔',
    cycleSwitchHint: '关闭则只记录时间，不做提醒',
    cycleOffText: '只记录「距离上次多久」，不会提醒你',
    cycleOffShort: '不循环（仅记录）',
    countSteps: [1, 2, 3, 5, 7, 14, 30],
    subOver: n => '已经超过循环间隔 ' + n + ' 天',
    subDue: '已到循环间隔，可以再来一次',
    subSoon: d => '大约 ' + d + ' 后再来一次'
  }
}

/**
 * 「纯记录」事件档位：不设循环间隔时，按已经过去多少天给出说法
 * 语义从「还剩多久」换成「有多久没做了」，因此不参与进度条计算
 */
const OPEN_LEVELS = [
  { status: 'normal', maxDays: 0, label: '刚刚做完', color: '#3F8A6B', soft: '#DCEFE4', sub: '就是今天，不用惦记' },
  { status: 'normal', maxDays: 3, label: '才做过不久', color: '#3F8A6B', soft: '#DCEFE4', sub: '刚做过不久，安心' },
  { status: 'soon', maxDays: 14, label: '有一阵没做了', color: '#D18C2A', soft: '#FBEBD3', sub: '有一阵子了，想起来就做一下' },
  { status: 'urgent', maxDays: 45, label: '很久没做了', color: '#D4553C', soft: '#FCE0D8', sub: '确实挺久了，要不要安排一下' },
  { status: 'over', maxDays: 999999, label: '快忘记了', color: '#7C7C76', soft: '#E9E4D9', sub: '太久没做，小心彻底忘掉' }
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
  normal: { label: '充裕', color: '#3F8A6B', soft: '#DCEFE4' },
  soon: { label: '临近', color: '#D18C2A', soft: '#FBEBD3' },
  urgent: { label: '紧急', color: '#D4553C', soft: '#FCE0D8' },
  over: { label: '已过期', color: '#7C7C76', soft: '#E9E4D9' }
}

// 正计时超期文案
const STATUS_META_UP = {
  normal: { label: '正常', color: '#3F8A6B', soft: '#DCEFE4' },
  soon: { label: '快到期', color: '#D18C2A', soft: '#FBEBD3' },
  urgent: { label: '该处理了', color: '#D4553C', soft: '#FCE0D8' },
  over: { label: '已超期', color: '#7C7C76', soft: '#E9E4D9' }
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
  { name: '鲜牛奶', category: 'food', icon: '🥛', mode: MODE.COUNTDOWN, shelfLife: 7, shelfLifeUnit: 'day', remindDays: 2, unit: '瓶', location: '冰箱冷藏' },
  { name: '鸡蛋', category: 'food', icon: '🥚', mode: MODE.COUNTDOWN, shelfLife: 30, shelfLifeUnit: 'day', remindDays: 5, unit: '个', location: '冰箱冷藏' },
  { name: '面包', category: 'food', icon: '🍞', mode: MODE.COUNTDOWN, shelfLife: 5, shelfLifeUnit: 'day', remindDays: 1, unit: '袋', location: '常温' },
  { name: '酸奶', category: 'food', icon: '🍶', mode: MODE.COUNTDOWN, shelfLife: 14, shelfLifeUnit: 'day', remindDays: 3, unit: '盒', location: '冰箱冷藏' },
  { name: '大米', category: 'food', icon: '🍚', mode: MODE.COUNTDOWN, shelfLife: 6, shelfLifeUnit: 'month', remindDays: 15, unit: '袋', location: '米桶' },
  { name: '食用油', category: 'food', icon: '🫙', mode: MODE.COUNTDOWN, shelfLife: 18, shelfLifeUnit: 'month', remindDays: 30, unit: '瓶', location: '橱柜' },
  { name: '冷冻食材', category: 'food', icon: '🧊', mode: MODE.COUNTDOWN, shelfLife: 3, shelfLifeUnit: 'month', remindDays: 15, unit: '袋', location: '冰箱冷冻' },
  { name: '罐头食品', category: 'food', icon: '🥫', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '罐', location: '橱柜' },
  { name: '茶叶', category: 'food', icon: '🍵', mode: MODE.COUNTDOWN, shelfLife: 18, shelfLifeUnit: 'month', remindDays: 30, unit: '罐', location: '橱柜' },
  { name: '感冒药', category: 'medicine', icon: '💊', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '盒', location: '药箱' },
  { name: '外用药膏', category: 'medicine', icon: '🩹', mode: MODE.COUNTDOWN, shelfLife: 1, shelfLifeUnit: 'year', remindDays: 30, unit: '支', location: '药箱' },
  { name: '维生素', category: 'medicine', icon: '🍬', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '瓶', location: '药箱' },
  { name: '眼药水', category: 'medicine', icon: '👁️', mode: MODE.COUNTDOWN, shelfLife: 28, shelfLifeUnit: 'day', remindDays: 5, unit: '支', location: '药箱' },
  { name: '创可贴', category: 'medicine', icon: '🩺', mode: MODE.COUNTDOWN, shelfLife: 3, shelfLifeUnit: 'year', remindDays: 30, unit: '盒', location: '药箱' },
  { name: '面霜', category: 'cosmetic', icon: '🧴', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '瓶', location: '梳妆台' },
  { name: '防晒霜', category: 'cosmetic', icon: '☀️', mode: MODE.COUNTDOWN, shelfLife: 1, shelfLifeUnit: 'year', remindDays: 30, unit: '支', location: '梳妆台' },
  { name: '口红', category: 'cosmetic', icon: '💄', mode: MODE.COUNTDOWN, shelfLife: 2, shelfLifeUnit: 'year', remindDays: 30, unit: '支', location: '梳妆台' },
  { name: '面膜', category: 'cosmetic', icon: '🎭', mode: MODE.COUNTDOWN, shelfLife: 3, shelfLifeUnit: 'year', remindDays: 30, unit: '盒', location: '梳妆台' },
  { name: '睫毛膏', category: 'cosmetic', icon: '🖌️', mode: MODE.COUNTDOWN, shelfLife: 3, shelfLifeUnit: 'month', remindDays: 10, unit: '支', location: '梳妆台' },

  // —— 正计时（使用/更换周期）——
  { name: '床单被套', category: 'daily', icon: '🛏️', mode: MODE.COUNTUP, cycleDays: 14, remindDays: 3, unit: '套', location: '卧室' },
  { name: '枕套', category: 'daily', icon: '🛌', mode: MODE.COUNTUP, cycleDays: 7, remindDays: 2, unit: '个', location: '卧室' },
  { name: '浴巾', category: 'daily', icon: '🧻', mode: MODE.COUNTUP, cycleDays: 21, remindDays: 3, unit: '条', location: '卫生间' },
  { name: '毛巾', category: 'daily', icon: '🧺', mode: MODE.COUNTUP, cycleDays: 30, remindDays: 5, unit: '条', location: '卫生间' },
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
  { name: '洗头', category: 'life', icon: '🧴', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 3, remindDays: 1 },
  { name: '泡脚', category: 'life', icon: '🦶', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 1, remindDays: 1 },
  { name: '喝水', category: 'life', icon: '💧', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 1, remindDays: 1 },
  { name: '剪指甲', category: 'life', icon: '✂️', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 10, remindDays: 2 },
  { name: '敷面膜', category: 'life', icon: '🎭', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 3, remindDays: 1 },
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
  { name: '早睡', category: 'health', icon: '🛌', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 1, remindDays: 1 },
  // —— 家务 ——
  { name: '拖地', category: 'house', icon: '🧹', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  { name: '浇花', category: 'house', icon: '🪴', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 5, remindDays: 1 },
  { name: '遛狗', category: 'house', icon: '🐕', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 1, remindDays: 1 },
  { name: '擦窗户', category: 'house', icon: '🪟', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 7 },
  { name: '清理冰箱', category: 'house', icon: '🧊', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 30, remindDays: 7 },
  // —— 其他 ——
  { name: '联系家人', category: 'other', icon: '📞', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  { name: '写日记', category: 'other', icon: '✏️', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 3, remindDays: 1 },
  { name: '看书', category: 'other', icon: '📚', mode: MODE.COUNTUP, kind: KIND.EVENT, cycleDays: 7, remindDays: 2 },
  // —— 纯记录型：不设循环间隔，只留一个「距离上次多久」的时间痕迹 ——
  { name: '理发', category: 'life', icon: '💇', mode: MODE.COUNTUP, kind: KIND.EVENT, remindDays: 0 },
  { name: '吃大餐', category: 'food', icon: '🍽️', mode: MODE.COUNTUP, kind: KIND.EVENT, remindDays: 0 }
]

/**
 * 图标库：按分类分组，点击图标区弹出面板选择（类似微信选表情）
 * 仅收录系统支持较广的常见 emoji
 */
const EMOJI_GROUPS = [
  {
    key: 'common',
    name: '常用',
    icons: ['🥛', '🍞', '🥚', '🍚', '🍶', '🥫', '🍎', '🥬', '💊', '🩹', '🧴', '💄', '🛏️', '🪥', '🧺', '🔌', '🌬️', '📦']
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
    icons: ['🛏️', '🛌', '🧺', '🧻', '🪥', '🧽', '🥢', '🍽️', '🧹', '🪣', '👕', '👖', '🧦', '🚿', '🧯', '🪑', '🛋️', '🚪']
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
  { key: 'life', name: '生活', icons: ['🛁', '🚿', '🦶', '💧', '✂️', '💇', '🪥', '🧼', '🛌', '🎭', '🚽', '🧴', '👕'] },
  { key: 'food', name: '美食', icons: ['🍲', '🍢', '🧋', '🍰', '🍗', '🍜', '🍕', '🍔', '🍦', '🍺', '🥘', '🍤'] },
  { key: 'health', name: '健康', icons: ['💪', '🏃', '🩺', '🦷', '🩸', '🧘', '🚴', '🏊', '🧠', '👁️', '😷', '🌡️'] },
  { key: 'house', name: '家务', icons: ['🧹', '🪴', '🐕', '🪟', '🧊', '🧺', '🛋️', '🧽', '🪣', '🧯', '🍽️', '🚪'] },
  { key: 'other', name: '其他', icons: ['📌', '📞', '✏️', '📚', '🎯', '🎵', '🎨', '🧩', '☀️', '🌙', '🎮', '💌'] }
]

/**
 * 首页每日一句：舒缓治愈风格，贴合"记住物品时间"的定位
 * 进入首页时随机取一条，避免与上一条重复
 */
const SLOGANS = [
  '新鲜有时，别让好东西悄悄过期',
  '记住每件物品的时间，生活就少一点慌张',
  '今天，有哪件东西在等你想起它',
  '慢一点也没关系，记得就好',
  '把日子过成有数的样子',
  '有些东西值得被及时用掉',
  '时间看得见，就不用靠记忆硬撑',
  '让每件物品都被好好用完',
  '该换的换了，日子就清爽了',
  '过期的不是物品，是被忘记的那段时间',
  '轻轻记一笔，心里就少一件事',
  '新鲜的日子，从看清日期开始',
  '别让冰箱深处藏着遗憾',
  '用得上的，才是刚刚好的',
  '给每件物品一个被记住的机会',
  '时间会走，你可以让它有迹可循',
  '把琐碎交给物时，把安心留给自己',
  '一顿新鲜的饭，从没过期开始',
  '该扔的扔掉，该换的换上',
  '生活的秩序，藏在那些小日期里',
  '记得住的日子，才过得更踏实',
  '不慌不忙，把每件物品用到刚好'
]

// 排序方式
const SORT_OPTIONS = [
  { key: 'urgent', name: '最紧急优先' },
  { key: 'name', name: '按名称' },
  { key: 'recent', name: '按添加时间' }
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
  SORT_OPTIONS
}
