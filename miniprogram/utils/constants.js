/**
 * 物时 · 常量与预设
 */

// 计时模式
const MODE = {
  COUNTDOWN: 'countdown', // 倒计时：有保质期，越用越少（食品/药品/化妆品）
  COUNTUP: 'countup' // 正计时：距上次换洗/更换多久，越久越该处理（日用品/耗材）
}

// 物品分类
const CATEGORIES = [
  { key: 'food', name: '食品', icon: '🥛', mode: MODE.COUNTDOWN },
  { key: 'medicine', name: '药品', icon: '💊', mode: MODE.COUNTDOWN },
  { key: 'cosmetic', name: '化妆品', icon: '🧴', mode: MODE.COUNTDOWN },
  { key: 'daily', name: '日用品', icon: '🧺', mode: MODE.COUNTUP },
  { key: 'appliance', name: '家电耗材', icon: '🔌', mode: MODE.COUNTUP },
  { key: 'other', name: '其他', icon: '📦', mode: MODE.COUNTDOWN }
]

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
  CATEGORIES,
  STATUS,
  STATUS_META,
  STATUS_META_UP,
  SHELF_UNITS,
  QUANTITY_UNITS,
  PRESETS,
  EMOJI_GROUPS,
  SLOGANS,
  SORT_OPTIONS
}
