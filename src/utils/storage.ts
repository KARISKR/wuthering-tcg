/**
 * 브라우저 저장소 Quota 초과 및 비공개 모드(사파리 시크릿 모드 등) 크래시 방지 안전 래퍼
 */
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`[Storage Quota Warning]: Failed to set item "${key}"`, e);
      return false;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
