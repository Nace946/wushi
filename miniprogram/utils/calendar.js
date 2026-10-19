/**
 * 手机日历联动（v3.17）
 *
 * 把「提前提醒」搬进手机系统日历，到点由系统弹提醒 —— 不依赖后端，也不用订阅消息。
 *
 * 微信官方只提供「添加」能力：
 *   wx.addPhoneCalendar（基础库 2.15.0+，需要 scope.addPhoneCalendar，仅能在点击行为里调用）
 *   wx.addPhoneRepeatCalendar（重复事件，本项目暂不使用）
 * 没有任何「修改 / 删除 / 查询」接口，所以这里只做**一次性快照**：
 * 用户点一下才建，建完小程序就不再管它；之后改了时间，需要用户自己去日历里调整。
 *
 * 时间戳单位注意：官方文档对 addPhoneCalendar 只写「unix 时间戳」，
 * 但同族的 addPhoneRepeatCalendar 明确是「1970 年起经过的**秒数**」，
 * 社区实测也一致 —— 所以这里统一用秒，不要传毫秒（会跑到 1970 年）。
 */

const time = require('./time')
const { MODE, KIND } = require('./constants')

/** 提醒落在上午 9 点：太早打扰、太晚可能当天已经用掉了 */
const REMIND_HH = 9
/** 日历事件时长（只是让日历里有个像样的时间段，不影响提醒） */
const EVENT_MINUTES = 30

/**
 * 判断这条记录能不能加进日历，并算出提醒日
 *
 * 两种口径：
 * - 默认（`opts.atTarget` 不为真）：**必须先设了「提前提醒」**。`remindDays = 0` 直接
 *   返回 noRemind —— 用户选「不提醒」就是不想被打扰，不该被日历提示找上门。
 *   这是编辑页「同时加入手机日历」开关的口径。
 * - `atTarget: true`：直接落在**目标日当天**（倒计时 = 到期日，正计时 = 下次提醒日），
 *   不扣提前天数、也不看 remindDays。这是详情页「加入手机日历」的口径 ——
 *   那是一个明确手动的动作，用户点它就是要「到期那天提醒我一次」。
 *
 * 若算出来的提醒日已经过去（比如提前 10 天、而只剩 3 天），回退到目标日当天。
 *
 * @returns {{ok:Boolean, reason:String, date:String, targetDate:String, days:Number}}
 *   reason: none / noItem / noCycle / noRemind / expired
 */
function plan(item, nowTs, opts) {
  if (!item) return { ok: false, reason: 'noItem' }
  const today = time.today()
  const atTarget = !!(opts && opts.atTarget)

  const state = time.getItemState(item)
  // 纯记录型正计时没有「下一次」，也就没有提醒日可写
  if (!state.hasProgress || !state.targetDate) return { ok: false, reason: 'noCycle' }

  const rd = Number(item.remindDays) || 0
  if (!atTarget && rd <= 0) return { ok: false, reason: 'noRemind' }

  const targetDate = state.targetDate
  if (targetDate < today) return { ok: false, reason: 'expired' }

  let date = atTarget ? targetDate : time.addDays(targetDate, -rd)
  if (date < today) date = targetDate
  if (date < today) return { ok: false, reason: 'expired' }

  return {
    ok: true,
    reason: '',
    date,
    targetDate,
    days: time.diffDays(date, targetDate)
  }
}

/** 按钮上的短提示，例如「10.22 09:00」 */
function hint(date) {
  const p = String(date || '').split('-')
  if (p.length !== 3) return ''
  return String(Number(p[1])) + '.' + p[2] + ' 09:00'
}

/** 组日历事件的标题与说明 */
function buildEvent(item, p, nowTs) {
  const now = nowTs || Date.now()
  // 提醒日就是今天且已过 9 点：别把开始时间放在过去，顺延到一分钟后
  const startMs = Math.max(time.dayStart(p.date) + REMIND_HH * 3600000, now + 60000)
  const isEvent = item.kind === KIND.EVENT
  const isCountdown = item.mode === MODE.COUNTDOWN

  let title
  if (isCountdown) {
    title = p.days > 0
      ? item.name + ' · 还有 ' + p.days + ' 天到期'
      : item.name + ' · 今天到期'
  } else {
    title = item.name + ' · ' + (isEvent ? '该做了' : '该换了')
  }

  const lines = []
  lines.push(isCountdown
    ? '到期：' + time.formatCN(p.targetDate) + ' ' + time.EXPIRE_AT_TEXT
    : '下次提醒：' + time.formatCN(p.targetDate))
  const qty = item.quantity === 0 || item.quantity ? Number(item.quantity) : 1
  // 数量与存放位置只对「物品 + 倒计时」有意义（与详情页同一口径）
  const showStock = isCountdown && !isEvent
  if (showStock && qty > 1) lines.push('还剩 ' + qty + (item.unit || ''))
  if (showStock && item.location) lines.push('存放：' + item.location)
  lines.push('来自「天天记」')
  lines.push('后续在小程序修改时间不会同步，请在本条日历里手动调整')

  return {
    title,
    // 秒，不是毫秒
    startTime: Math.floor(startMs / 1000),
    endTime: Math.floor((startMs + EVENT_MINUTES * 60000) / 1000),
    allDay: false,
    description: lines.join('\n'),
    alarm: true,
    alarmOffset: 0
  }
}

/** 当前微信版本是否支持写日历 */
function supported() {
  try {
    return typeof wx !== 'undefined' && typeof wx.addPhoneCalendar === 'function'
  } catch (e) {
    return false
  }
}

/**
 * 写入系统日历
 * @param opts 透传给 plan()（详情页用 `{ atTarget: true }` 直接落在目标日）
 * @returns Promise<{plan, event}>；失败时 reject({code, err})
 *   code: unsupported（微信版本低）/ noItem / noCycle / noRemind / expired / fail（含用户拒绝授权）
 */
function add(item, nowTs, opts) {
  return new Promise((resolve, reject) => {
    const p = plan(item, nowTs, opts)
    if (!p.ok) {
      reject({ code: p.reason })
      return
    }
    if (!supported()) {
      reject({ code: 'unsupported' })
      return
    }
    const event = buildEvent(item, p, nowTs)
    wx.addPhoneCalendar({
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      description: event.description,
      alarm: event.alarm,
      alarmOffset: event.alarmOffset,
      success: () => resolve({ plan: p, event }),
      fail: err => reject({ code: 'fail', err })
    })
  })
}

module.exports = {
  plan,
  hint,
  buildEvent,
  add,
  supported,
  REMIND_HH
}
