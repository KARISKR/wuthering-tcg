import os
import re
import json

# image_list.txt 읽기
with open(r'c:\Users\Lyicos\.gemini\antigravity\scratch\wuthering-tcg\image_list.txt', 'r', encoding='utf-8') as f:
    images = [line.strip() for line in f if line.strip()]

print(f"Total image files: {len(images)}")

# 카드 매핑 분석
# 파일명 예시:
# BP01-001_카멜리아_1901.webp
# BP01-044_육성·일반 공격_2003.webp
# SD01-001_방랑자(여)_1139.webp

cards_by_code = {}

for img in images:
    parts = img.split('_')
    code = parts[0]
    name = parts[1]
    ext = os.path.splitext(img)[1]
    
    # 중복 버전 중 첫 번째 또는 대표 이미지 선택
    if code not in cards_by_code:
        cards_by_code[code] = {
            'code': code,
            'name': name,
            'image': f"/cards/card_images/{img}",
            'all_images': [f"/cards/card_images/{img}"]
        }
    else:
        cards_by_code[code]['all_images'].append(f"/cards/card_images/{img}")

print(f"Unique card codes: {len(cards_by_code)}")

# 캐릭터 카드 판단:
# BP01-001 ~ BP01-033, SD01-001 ~ SD01-006, SD02-001 ~ SD02-006 등은 캐릭터
# BP01-034 ~ BP01-043: 에코 (액션 카드)
# BP01-044 ~ BP01-077, SD01-007 ~ SD01-023, SD02-007 ~ SD02-023: 액션 스킬 카드

official_cards = []

for code, data in sorted(cards_by_code.items()):
    name = data['name']
    img_url = data['image']
    
    # 캐릭터 카드 여부
    is_character = False
    char_name = ""
    level = 0
    element = "SPECTRO"
    
    # 캐릭터 판별
    for cn, elem in [
        ('방랑자', 'SPECTRO'),
        ('카멜리아', 'HAVOC'),
        ('파수인', 'SPECTRO'),
        ('앙코', 'FUSION'),
        ('양양', 'AERO'),
        ('치샤', 'FUSION'),
        ('금희', 'SPECTRO'),
        ('산화', 'GLACIO'),
    ]:
        if cn in name:
            is_character = True
            char_name = cn
            element = elem
            break
            
    # 에코 및 스킬은 액션 카드
    if any(k in name for k in ['공격', '회피', '춤', '결말', '이론', '해금', '영역', '무지개', '가시', '얼음', '로봇', '기사', '복어', '군세', '고릴라', '버섯', '크라운리스', '나비', '아익스', '소용돌이', '참격', '맹공']):
        is_character = False

    if is_character:
        # 레벨 추정: 코드 순서 기반 (각 캐릭터마다 0, 1, 2)
        # 예: SD01-001(Lv.2), SD01-002(Lv.1), BP01-018(Lv.0) 등
        lvl = 0
        if 'Lv' in name:
            m = re.search(r'Lv\.?(\d)', name)
            if m: lvl = int(m.group(1))
        else:
            # 기본적으로 번호 끝자리에 따라 배정
            num_part = int(re.search(r'\d+', code.split('-')[1]).group(0))
            lvl = num_part % 3

        official_cards.append({
            'id': f"official-{code}",
            'kind': 'CHARACTER',
            'code': code,
            'characterName': char_name,
            'nameKr': f"{name} (Lv.{lvl})" if 'Lv' not in name else name,
            'level': lvl,
            'element': element,
            'artUrl': img_url,
            'description': f"[{char_name}] 공식 라이선스 캐릭터 카드",
            'leaderSkill': f"리더 스킬: {char_name} 고유 전투 버프",
            'clashSkill': f"대결 스킬: {char_name} 대결 판정 지원",
            'isOfficial': True
        })
    else:
        # 액션 카드
        # 색상 판별: 이름 및 특성에 따라 분류
        color = 'RED'
        cost = 1
        speed = 4
        damage = 3
        pursuit = 0
        
        if any(w in name for w in ['회피', '바람', '나비', '추구', '날개', '영역']):
            color = 'GREEN'
            speed = 5
            damage = 2
            pursuit = 1
        elif any(w in name for w in ['가드', '얼음', '결계', '보호', '가호', '복어', '철벽', '서리', '버섯']):
            color = 'BLUE'
            speed = None
            damage = 1
        else:
            color = 'RED'
            speed = 3
            damage = 4
            
        # 전용 캐릭터 체크
        exclusive = None
        for cn in ['카멜리아', '파수인', '앙코', '방랑자', '양양', '치샤', '금희', '산화']:
            if cn in name:
                exclusive = cn
                break

        official_cards.append({
            'id': f"official-{code}",
            'kind': 'ACTION',
            'code': code,
            'nameKr': name,
            'color': color,
            'cost': cost,
            'speed': speed,
            'damage': damage,
            'pursuitCount': pursuit if pursuit > 0 else None,
            'characterExclusive': exclusive,
            'description': f"공식 액션 카드 [{name}]. {color} 속성 효과.",
            'artUrl': img_url,
            'isOfficial': True
        })

print(f"Generated {len(official_cards)} structured official cards.")

# TypeScript 파일 생성
ts_content = f"""// 공식 데이터베이스 기반 전체 카드 리스트 (총 {len(official_cards)}종)
// card_database.xlsx 및 public/cards/card_images/ 연동

export interface OfficialCardData {{
  id: string;
  kind: 'CHARACTER' | 'ACTION';
  code: string;
  nameKr: string;
  characterName?: string;
  level?: 0 | 1 | 2;
  element?: 'GLACIO' | 'FUSION' | 'AERO' | 'SPECTRO' | 'HAVOC';
  color?: 'RED' | 'GREEN' | 'BLUE';
  cost?: number;
  speed?: number;
  damage?: number;
  pursuitCount?: number;
  characterExclusive?: string;
  description: string;
  artUrl: string;
  leaderSkill?: string;
  clashSkill?: string;
  isOfficial: boolean;
}}

export const OFFICIAL_CARDS: OfficialCardData[] = {json.dumps(official_cards, ensure_ascii=False, indent=2)};
"""

with open(r'c:\Users\Lyicos\.gemini\antigravity\scratch\wuthering-tcg\src\data\officialCards.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print("Successfully written to src/data/officialCards.ts")
