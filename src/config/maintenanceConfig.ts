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
  version: 'v2.1 OPTIMIZED',
  title: '서버 정기 점검 및 시스템 최적화 완료',
  subtitle: '명조 TCG 웹 시뮬레이터 로딩 속도 최적화, 메모리 개선 및 커뮤니티 고도화 작업이 완료되었습니다.',
  targetEndTime: '2026-10-26T01:00:00+09:00',
  notice: '점검이 성공적으로 완료되었습니다. 더욱 쾌적하고 빠른 명조 TCG를 즐겨보세요!',
};
