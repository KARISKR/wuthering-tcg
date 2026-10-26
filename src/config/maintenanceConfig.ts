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
  version: 'v2.1 OPTIMIZATION',
  title: '서버 정기 점검 및 시스템 최적화 안내',
  subtitle: '명조 TCG 웹 시뮬레이터 로딩 속도 최적화, 메모리 개선 및 커뮤니티 고도화 점검 작업이 진행 중입니다.',
  // 2026년 10월 27일 새벽 03:00:00 (KST) 점검 진행 설정
  targetEndTime: '2026-10-27T03:00:00+09:00',
  notice: '점검 시간 동안에는 서비스 이용이 일시적으로 제한됩니다. 최적화 작업 완료 후 더욱 쾌적하고 빠른 서비스를 제공해 드리겠습니다.',
};
