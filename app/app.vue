<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

/** 存储后端返回的原始时间戳字符串 **/
const exhangInitDate = ref<string>('')
/** 转成时间戳（毫秒）用于计算 **/
const initTimestamp = ref<number>(0)

/** 存储五个灯泡状态：0 = 红，1 = 绿，2 = 灭 **/
const bulbStatus = ref<number[]>([0, 0, 0, 0, 0])
/** 距离下一次全绿的剩余时间（ms） **/
const timeToAllGreen = ref<number>(0)
/** 距离下一次全红的剩余时间（ms） **/
const timeToFullRed = ref<number>(0)

/** 是否在等待新版本的机库初始时间数据 */
const isWaitingInitDateForNewVersion = ref<boolean>(false)

/**
 * 将毫秒转换为 HH:mm:ss 格式
 */
function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/**
 * 拉取接口并初始化时间戳（后端返回的是 Green Phase 开始的时间戳）
 */
async function getExhangInitDate() {
  const res = await $fetch('/api/exhang/init-date')
  if (!res.success || !('exhangInitDate' in res) || !res.exhangInitDate || res.isMessingStarCitizenVersion) {
    console.error('初始化时间获取失败')
    isWaitingInitDateForNewVersion.value = true
    return
  }
  exhangInitDate.value = res.exhangInitDate
  initTimestamp.value = parseInt(res.exhangInitDate, 10)
  updateStatusAndTimers()
}

/** 根据当前时间和 initTimestamp（Green Phase 起始）计算状态与倒计时 **/
function updateStatusAndTimers() {
  const start = initTimestamp.value
  if (!start) return

  const now = Date.now()
  const elapsed = now - start

  // 各阶段时长（毫秒）
  const greenPhase = 60 * 60 * 1000    // 1 小时
  const blackoutPhase = 5 * 60 * 1000  // 5 分钟
  const redPhase = 120 * 60 * 1000     // 2 小时
  const cycle = greenPhase + blackoutPhase + redPhase

  const t = elapsed % cycle

  // 计算灯泡状态
  if (t < greenPhase) {
    // Green Phase: 一开始全绿，之后每12分钟熄灭一个
    const offCount = Math.floor(t / (12 * 60 * 1000))
    bulbStatus.value = bulbStatus.value.map((_, i) => (i < 5 - offCount ? 1 : 2))
  } else if (t < greenPhase + blackoutPhase) {
    // Blackout Phase: 全灭
    bulbStatus.value = [2, 2, 2, 2, 2]
  } else {
    // Red Phase: 一开始全红，之后每24分钟点亮一个绿灯
    const tr = t - greenPhase - blackoutPhase
    const greenCount = Math.floor(tr / (24 * 60 * 1000))
    bulbStatus.value = bulbStatus.value.map((_, i) => (i < greenCount ? 1 : 0))
  }

  // 计算下一次全绿（Green Phase 起始）的剩余时间：在当前周期末
  timeToAllGreen.value = cycle - t
  // 计算下一次全红（Red Phase 起始）的剩余时间：GreenPhase+BlackoutPhase 时点
  const redStart = greenPhase + blackoutPhase
  timeToFullRed.value = (redStart - t + cycle) % cycle
}

let timer: number
onMounted(async () => {
  await getExhangInitDate()
  // 每秒更新一次状态和倒计时
  timer = window.setInterval(updateStatusAndTimers, 1000)
})
onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div>
    <div v-if="!isWaitingInitDateForNewVersion" >
      <!-- 灯泡展示 -->
      <div class="bulbs">
        <span
          v-for="(status, idx) in bulbStatus"
          :key="idx"
          class="bulb"
          :class="{
            red: status === 0,
            green: status === 1,
            off: status === 2
          }"
        ></span>
      </div>

      <!-- 倒计时展示 -->
      <p>距离全绿还剩：{{ formatTime(timeToAllGreen) }}</p>
      <p>距离全红还剩：{{ formatTime(timeToFullRed) }}</p>

      <button @click="getExhangInitDate">刷新初始时间</button>
    </div>
    <div v-else>
      <p>正在等待新版本的行政机库初始时间数据...</p>
    </div>
  </div>
</template>

<style scoped>
.bulbs {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}
.bulb {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background-color: #333;
  transition: background-color 0.3s;
}
.bulb.red {
  background-color: red;
}
.bulb.green {
  background-color: green;
}
.bulb.off {
  background-color: black;
}
</style>
