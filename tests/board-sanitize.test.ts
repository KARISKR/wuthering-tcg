// @vitest-environment jsdom
// 게시글·로비 공지 HTML 정리: 예전 정규식이 통과시킨 공격 문자열이 이제 막히는지 확인
import { describe, it, expect } from 'vitest';
import { renderFormattedContent } from '../src/components/CommunityBoard';
import { sanitizeNotice } from '../src/components/Lobby';

const ATTACKS = [
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  '<iframe src="https://example.com"></iframe>',
  '![x](x" onerror="alert(1))',
];

describe.each([
  ['게시글 renderFormattedContent', (s: string) => renderFormattedContent(s)],
  ['로비 공지 sanitizeNotice', sanitizeNotice],
])('%s', (_name, render) => {
  it.each(ATTACKS)('스크립트 실행 경로를 제거한다: %s', (attack) => {
    const html = render(attack);
    expect(html).not.toMatch(/onerror|onload|javascript:|<iframe|<script/i);
  });

  it('정상 서식(굵게, 이미지)은 유지한다', () => {
    const html = render('**굵게** ![사진](/cards/a.webp)');
    expect(html).toContain('<b>굵게</b>');
    expect(html).toContain('src="/cards/a.webp"');
  });
});
