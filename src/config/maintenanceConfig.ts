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
  enabled: true,
  version: 'v2.2',
  title: '서버 정기 점검 안내',
  subtitle: '명조 TCG 웹 시뮬레이터 서버 점검 및 안정화 작업이 진행 중입니다.',
  // 2026년 11월 12일 01:40:00 (KST) 점검 종료 목표 (약 1시간)
  targetEndTime: '2026-11-12T01:40:00+09:00',
  notice: '점검 시간 동안에는 서비스 이용이 일시적으로 제한됩니다. 점검 완료 후 더욱 안정된 서비스를 제공해 드리겠습니다.',
};
