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
  version: 'BETA 2.0',
  title: '서버 정기 점검 및 BETA 2.0 업데이트 안내',
  subtitle: '명조 TCG 정기 시스템 최적화 및 BETA 2.0 대규모 업데이트 적용 작업이 진행 중입니다.',
  // 2026년 10월 26일 새벽 01:00:00 (KST) 정밀 종료 설정
  targetEndTime: '2026-10-26T01:00:00+09:00',
  notice: '점검 시간 동안에는 서비스 이용이 일시적으로 제한됩니다. 점검 완료 후 더욱 안정된 서비스를 제공해 드리겠습니다.',
};
