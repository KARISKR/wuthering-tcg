export interface MaintenanceConfig {
  enabled: boolean;
  version: string;
  title: string;
  subtitle: string;
  // 점검 종료 목표 시각 (KST 기준)
  targetEndTime: string;
  notice: string;
}

export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: false,
  version: 'v2.2',
  title: '서버 정기 점검 및 업데이트 완료',
  subtitle: '모바일 전투 UI 개편 및 TP01 신규 카드 업데이트 적용이 완료되었습니다.',
  targetEndTime: '2026-11-12T01:40:00+09:00',
  notice: '점검이 성공적으로 완료되었습니다. 더욱 쾌적하고 빠른 명조 TCG를 즐겨보세요!',
};
