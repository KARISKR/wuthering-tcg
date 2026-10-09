import os
import json
import re

rules_dir = r'c:\Users\Lyicos\.gemini\antigravity\scratch\wuthering-tcg\rules'

# 1. FAQ 파싱
faq_path = os.path.join(rules_dir, [f for f in os.listdir(rules_dir) if 'FAQ' in f and f.endswith('.txt')][0])
with open(faq_path, 'r', encoding='utf-8', errors='ignore') as f:
    faq_raw = f.read()

# FAQ Q&A 항목 분리
faq_items = []
# 패턴 예: "No. 카드구분 ... 1 덱 규칙 ..."
# "Q. ..." 또는 숫자 패턴
lines = faq_raw.split('\n')
current_q = None
current_a = ""

for line in lines:
    line_s = line.strip()
    if not line_s or '===' in line_s or 'FAQ' in line_s or '업데이트' in line_s:
        continue
    # 번호로 시작하거나 Q로 시작하는 경우
    m = re.match(r'^(\d+)\s+(.+)', line_s)
    if m:
        if current_q:
            faq_items.append({'q': current_q, 'a': current_a.strip()})
        current_q = m.group(2)
        current_a = ""
    else:
        if current_q:
            current_a += " " + line_s

if current_q:
    faq_items.append({'q': current_q, 'a': current_a.strip()})

print(f"Extracted {len(faq_items)} FAQ items.")

# 2. 매뉴얼북 파싱
manual_path = os.path.join(rules_dir, [f for f in os.listdir(rules_dir) if '매뉴얼' in f and f.endswith('.txt') or 'ĸŴ' in f and f.endswith('.txt')][0])
with open(manual_path, 'r', encoding='utf-8', errors='ignore') as f:
    manual_raw = f.read()

# 3. 플로어 룰 파싱
floor_path = os.path.join(rules_dir, [f for f in os.listdir(rules_dir) if '플로어' in f and f.endswith('.txt') or '÷ξ' in f and f.endswith('.txt')][0])
with open(floor_path, 'r', encoding='utf-8', errors='ignore') as f:
    floor_raw = f.read()

# 구조화된 룰북 데이터 구축
rules_data = {
    'manual_sections': [
        {
            'title': '제1장 게임에 대하여 (기본 승리 조건 & 준비)',
            'content': [
                '• 승리 조건: 상대 플레이어의 생명력(20pt)을 먼저 0으로 만든 플레이어가 승리합니다.',
                '• 게임 인원: 1:1 대전 (두 명의 플레이어).',
                '• 덱 구성: 캐릭터 덱(3~15장) + 액션 덱(반드시 정확히 40장).',
                '• 시작 준비: 가위바위보로 선공/후공 결정. 각 플레이어는 3명의 Lv.0 캐릭터를 뒷면으로 배치(중앙 1명 리더, 좌우 2명 후방) 후 동시 오픈.',
                '• 멀리건(패 교체): 초기 패 5장을 뽑은 후, 마음에 들지 않는 카드를 원하는 장수만큼 덱 맨 아래로 넣고 동일 매수 드로우 후 셔플 (1회 한정).'
            ]
        },
        {
            'title': '제2장 에리어(필드) 구성',
            'content': [
                '• 캐릭터 에리어: 중앙의 [리더] 1명과 좌우의 [후방(서포터)] 2명, 총 3명의 캐릭터가 배치됩니다.',
                '• 협주 에리어: 액션 카드의 비용(COST)을 지불하기 위한 자원 카드가 배치되는 장소입니다.',
                '• 배틀(액션) 에리어: 대결 시 액션 카드를 뒷면 세트하고 동시 공개하는 격돌 구역입니다.',
                '• 드롭 존 (묘지): 사용된 액션 카드 및 비용으로 지불된 카드가 놓이는 구역입니다.',
                '• 덱 존: 캐릭터 덱(진화용)과 액션 덱(40장)이 배치됩니다.'
            ]
        },
        {
            'title': '제3장 턴의 흐름 (Turn Flow)',
            'content': [
                '1. 시작 페이즈: 턴 시작 시 발동하는 캐릭터 패시브 효과 처리.',
                '2. 드로우 페이즈: 덱에서 카드 2장을 드로우합니다. (※ 단, 선공 플레이어의 첫 번째 턴은 1장만 드로우).',
                '3. 액션 페이즈: 레벨업, 체인지(리더 교대), 차지(협주 충전)를 원하는 순서로 각 턴당 최대 1회씩 실행 가능.',
                '4. 배틀 페이즈: 대결 스텝 -> 판정 스텝 -> 연격 스텝 (전투를 원치 않을 경우 패스 가능).',
                '5. 엔드 페이즈: 배틀 에리어의 카드를 드롭 존으로 이동하고, 손패가 8장을 초과하면 8장이 되도록 버린 후 상대 턴으로 전환.'
            ]
        },
        {
            'title': '제4장 액션 페이즈 3대 행동 규칙',
            'content': [
                '① 캐릭터 레벨업 (턴당 1회): 목표 레벨 수만큼의 패를 버리고(Lv.1 진화 시 패 1장, Lv.2 진화 시 패 2장 소비), 캐릭터 덱에서 동명의 상위 레벨 카드를 찾아 기존 캐릭터 위에 겹칩니다.',
                '② 리더 교대 / 체인지 (턴당 1회): 중앙 리더와 좌/우 후방 서포터 중 1명의 위치를 맞교환합니다.',
                '③ 협주 충전 / 차지 (턴당 1회): 손패에서 카드 1장을 골라 협주 에리어에 앞면으로 놓아 자원화합니다.'
            ]
        },
        {
            'title': '제5장 배틀 페이즈 & 삼각 상성 판정 규칙',
            'content': [
                '• 대결 스텝: 양측 플레이어는 패에서 액션 카드를 최대 1장씩 뒷면으로 세트 후 동시에 공개하며, 카드의 코스트(COST)만큼 협주 에리어의 카드를 드롭 존으로 보냅니다.',
                '• 삼각 상성 관계: [적색(RED) 공격/연격] > [녹색(GREEN) 기동/견제] > [청색(BLUE) 방어/반격] > [적색(RED)]',
                '• 동색 대결 판정: 속도(Speed)가 높은 쪽이 판정 승리! 속도까지 같으면 현재 턴을 진행 중인 턴 플레이어가 우선 승리합니다.',
                '• 청색 vs 청색 대결: 양측 모두 가드이므로 무승부(DRAW)로 처리되며 피해는 발생하지 않습니다.',
                '• 한쪽만 카드 세트: 카드를 낸 쪽이 자동 판정 승리합니다.',
                '• 피해 처리: 판정 승리한 플레이어는 자신의 카드 데미지만큼 상대 생명력(HP)을 차감합니다.'
            ]
        },
        {
            'title': '제6장 연격 (Combo) 시스템 상세',
            'content': [
                '• 연격권 획득: 적색(RED) 카드로 판정 승리 시 기본 1회 부여되며, 카드의 [추격 X] 수치만큼 추가 연격 횟수가 가산됩니다.',
                '• 연격 공격: 연격 횟수를 가진 플레이어는 코스트를 지불하고 패에서 [적색(RED)] 액션 카드를 연속으로 추가 시전하여 막대한 콤보 피해를 누적시킬 수 있습니다.'
            ]
        }
    ],
    'floor_rules': [
        '• 경기 시간: 싱글전 20분 / 매치전(3판 2선승) 45분.',
        '• 덱 레시피 준수: 액션 덱 40장 엄수, 동명 카드 3장 제한.',
        '• 슬리브 규정: 캐릭터 덱과 액션 덱은 뒷면으로 서로 구별 가능한 서로 다른 슬리브 사용 권장.',
        '• 페널티 및 판정: 턴 진행 시 미공개 카드 정보 유출이나 규칙 위반 시 주의/경고 부여.'
    ],
    'faq_list': [
        {
            'q': 'Q. 캐릭터 덱은 반드시 서로 다른 3명의 캐릭터여야 하나요?',
            'a': 'A. 네, 캐릭터 덱에는 반드시 서로 다른 3명의 캐릭터의 Lv.0 카드가 1장씩 포함되어야 합니다. 총 장수는 3~15장입니다.'
        },
        {
            'q': 'Q. 액션 덱의 카드를 사용할 때 비용(COST)은 어떻게 지불하나요?',
            'a': 'A. 카드의 좌상단에 적힌 비용만큼 자신의 협주 에리어에 있는 카드를 드롭 존(묘지)으로 보냄으로써 지불합니다.'
        },
        {
            'q': 'Q. [추격 X] 효과는 정확히 무엇인가요?',
            'a': 'A. [추격 X]는 판정 승리 시 이번 배틀의 연격(콤보) 가능 횟수를 +X회 추가하는 키워드 능력입니다.'
        },
        {
            'q': 'Q. 상대 턴에 내가 배틀에서 이겼을 때도 연격을 발동할 수 있나요?',
            'a': 'A. 네! 자신이 턴 플레이어가 아니더라도 판정 승리를 통해 연격 횟수를 획득했다면, 연격 스텝에서 패의 적색 카드를 사용하여 반격 콤보를 날릴 수 있습니다.'
        },
        {
            'q': 'Q. 양쪽 플레이어가 모두 청색(BLUE) 카드를 내면 어떻게 되나요?',
            'a': 'A. 청색 카드는 속도가 존재하지 않으므로 무승부(DRAW)가 되며, 서로 아무런 피해를 입지 않고 배틀이 종료됩니다.'
        },
        {
            'q': 'Q. 손패 상한(8장) 초과 시 버리는 타이밍은 언제인가요?',
            'a': 'A. 엔드 페이즈(턴 종료 단계)에 손패가 8장을 초과하는 경우, 8장이 되도록 원하는 카드를 골라 드롭 존으로 버려야 합니다.'
        },
        {
            'q': 'Q. 레벨업 시 필요한 비용은 어떻게 되나요?',
            'a': 'A. 목표 레벨 수와 동일한 매수의 패를 버려야 합니다 (Lv.1로 진화 시 패 1장, Lv.2로 진화 시 패 2장 소비).'
        }
    ]
}

# TypeScript 파일 생성
ts_content = f"""// 공식 한글 매뉴얼북, FAQ, 플로어 룰 전체 데이터베이스
export const OFFICIAL_RULES_DATA = {json.dumps(rules_data, ensure_ascii=False, indent=2)};
"""

with open(r'c:\Users\Lyicos\.gemini\antigravity\scratch\wuthering-tcg\src\data\officialRules.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print("Saved to src/data/officialRules.ts")
