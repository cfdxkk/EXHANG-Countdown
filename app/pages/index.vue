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
   * 拉取接口并初始化时间戳（后端返回的是 Red Phase 起始的时间戳）
   */
  async function getExhangInitDate() {
    const res = await $fetch('/api/exhang/init-date')
    if (!res.success || !('exhangInitDate' in res) || !res.exhangInitDate || res.isMessingStarCitizenVersion) {
      console.error('初始化时间获取失败')
      isWaitingInitDateForNewVersion.value = true
      return
    }
    initTimestamp.value = parseInt(res.exhangInitDate, 10)
    isWaitingInitDateForNewVersion.value = false
    updateStatusAndTimers()
  }

  /** 根据当前时间和 initTimestamp（Red Phase 起始）计算状态与倒计时 **/
  function updateStatusAndTimers() {
    const start = initTimestamp.value
    if (!start) return

    const now = Date.now()
    const elapsed = now - start

    // 各阶段时长（毫秒）
    const D_red = 120 * 60 * 1000      // 2 小时
    const D_green = 60 * 60 * 1000     // 1 小时
    const D_black = 5 * 60 * 1000      // 5 分钟
    const cycle = D_red + D_green + D_black

    // 周期内时间
    const t = ((elapsed % cycle) + cycle) % cycle

    // 计算灯泡状态：红→绿→灰
    if (t < D_red) {
      // Red Phase: 全红起点，逐步点亮变绿，从左到右
      const count = Math.floor(t / (D_red / 5))
      bulbStatus.value = Array.from({ length: 5 }, (_, i) => (i < count ? 1 : 0))
    } else if (t < D_red + D_green) {
      // Green Phase: 全绿起点，逐步熄灭，从左到右
      const tg = t - D_red
      const offCount = Math.floor(tg / (D_green / 5))
      bulbStatus.value = Array.from({ length: 5 }, (_, i) => (i < offCount ? 2 : 1))
    } else {
      // Blackout Phase: 全灭
      bulbStatus.value = [2, 2, 2, 2, 2]
    }

    // 计算下次全绿（Green Phase 起始）和全红（Red Phase 起始）倒计时
    timeToAllGreen.value = (D_red - t + cycle) % cycle
    timeToFullRed.value = (cycle - t) % cycle
  }

  
  await getExhangInitDate()
  updateStatusAndTimers()

  let timer: number
  onMounted(async () => {
    await getExhangInitDate()
    timer = window.setInterval(updateStatusAndTimers, 1000)
  })
  onUnmounted(() => {
    clearInterval(timer)
  })
</script>

<style scoped>
  .container {
    position: absolute;
    top: 0;
    left: 0;

    width: 100dvw;
    height: 100dvh;

    background-color: #E8E8E8FF;
  }

  .sub-container {
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .bulbs {
    margin-top: 40dvh;

    width: clamp(450px, 30dvw, 680px);
    
    display: flex;
    justify-content: space-between;
  }
  @media (orientation: portrait) {
    .bulbs {
      width: clamp(200px, 70dvw, 680px);
    }
  }
  .bulb {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: gray;
    transition: background-color 0.3s;
  }
  .bulb.red {
    --glow-color: red;
    background-color: var(--glow-color);
    box-shadow:
      0 0 5px var(--glow-color),
      0 0 10px var(--glow-color),
      0 0 15px var(--glow-color);
  }
  .bulb.green {
    --glow-color: green;
    background-color: var(--glow-color);
    box-shadow:
      0 0 5px var(--glow-color),
      0 0 10px var(--glow-color),
      0 0 15px var(--glow-color);
  }
  .bulb.off {
    --glow-color: gray;
    background-color: var(--glow-color);
  }

  .countdonw-text-container {
    margin-top: 50px;
    width: 380px;
    color: #888888FF;

    display: flex;
    justify-content: space-between;
  }
  @media (orientation: portrait) {
    .countdonw-text-container {
      width: 200px;
      flex-direction: column;
      align-items: center;
    }
  }

  .made-by-community-image {
    position: absolute;
    bottom: 30px;
    right: 20px;

    width: 200px;
    opacity: 0.2;
    transition: all 0.8s ease-in-out;
  }

  .license-text {
    position: absolute;
    bottom: 10px;
    left: 20px;

    font-size: 13px;

    opacity: 0.3;
    transition: all 0.8s ease-in-out;
  }
  .license-text:hover {
    opacity: 0.8;
  }
  
  .about-me-text {
    position: absolute;
    bottom: 10px;
    right: 20px;

    font-size: 13px;

    opacity: 0.3;
    transition: all 0.8s ease-in-out;
  }
  .about-me-text:hover {
    opacity: 0.8;
  }

  @media (orientation: portrait) {
    .inspired-by-text {
      display: none;
    }
  }
</style>

<template>
  <div class="container">
    <div class="sub-container" v-if="!isWaitingInitDateForNewVersion">
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
      <div class="countdonw-text-container">
        <div>距离全绿还有 {{ formatTime(timeToAllGreen) }} </div>
        <div>距离全红还剩 {{ formatTime(timeToFullRed) }}</div>
      </div>

    </div>
    <div class="sub-container" v-else>
      <p>正在等待新版本的行政机库初始时间数据...</p>
    </div>
    <img class="made-by-community-image" src="/made-by-community.png" alt="Made By Starcitizen Community." />
    <div class="license-text"><a href="https://github.com/cfdxkk/EXHANG-Countdown" target="_blank">Source Code</a> is licensed by GLWTPL</div>
    <div class="about-me-text">Powered by 02<span class="inspired-by-text">, inspired by <a href="https://contestedzonetimers.com/" target="_blank">contestedzonetimers.com</a></span></div>
  </div>
</template>
