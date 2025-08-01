import { get } from '@vercel/edge-config';
import { useFetch } from 'nuxt/app';

/**
 * This handler fetches the initialization date (all 5 red lights) for Exhang based on the current Star Citizen version.
 * @returns {Promise<{ success: boolean, exhangInitDate?: string, errorMessage?: string, isMessingStarCitizenVersion: boolean }>}
 */
export default defineEventHandler(async (event) => {
  try {
    // allow CORS for all origins
    setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
    setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

    const starCitizenVersion = await (await fetch("https://web-proxy.scbox.xkeyc.cn/git/SCToolBox/api/raw/branch/main/localizations/chinese_(simplified).json")).json()
    if (!starCitizenVersion || !('length' in starCitizenVersion) || starCitizenVersion.length < 1) {
      const errorMessage = '获取 Star Citizen 版本信息失败';
      console.error(errorMessage);
      return { success: false, errorMessage, isMessingStarCitizenVersion: true }
    }

    const currentVersion = starCitizenVersion[0].versionName.slice(0, 5);
    if (!currentVersion || typeof currentVersion !== 'string' || currentVersion.length < 5) {
      const errorMessage = '当前版本信息不正确';
      console.error(errorMessage);
      return { success: false, errorMessage, isMessingStarCitizenVersion: true }
    }

    const exhangData = await get('exhang');
    if (!exhangData || typeof exhangData !== 'object' || Array.isArray(exhangData)) {
      const errorMessage = '获取 Exhang 初始化日期失败';
      console.error(errorMessage);
      return { success: false, errorMessage, isMessingStarCitizenVersion: true }
    }

    // Define a more specific type for exhangData
    type ExhangDataType = {
      'init-date'?: { [version: string]: string }
      [key: string]: any
    };

    const typedExhangData = exhangData as ExhangDataType;
    const currentExhangInitDate = typedExhangData['init-date']?.[currentVersion];
    if (!currentExhangInitDate || typeof currentExhangInitDate !== 'string') {
      const errorMessage = `当前版本 ${currentVersion} 的 Exhang 初始化日期不正确`;
      console.error(errorMessage);
      return { success: false, errorMessage, isMessingStarCitizenVersion: true }
    }
    
    return { success: true, exhangInitDate: currentExhangInitDate, isMessingStarCitizenVersion: false }
  } catch (error) {
    const errorMessage = 'Error in init-date.get.ts'
    console.error(errorMessage, error);
    return { success: false, errorMessage, isMessingStarCitizenVersion: true};
  }
})
