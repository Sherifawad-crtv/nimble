import { describe, expect, it } from 'vitest';
import { classify, fitWithin, payloadSize } from './attachments';

describe('classify', () => {
  it('recognises a PDF by type or by extension', () => {
    expect(classify({ name: 'plan', type: 'application/pdf' })).toBe('pdf');
    expect(classify({ name: 'Plan.PDF', type: '' })).toBe('pdf');
  });

  it('treats any picture as an image, including phone formats the model cannot read directly', () => {
    expect(classify({ name: 'IMG_0001.jpg', type: 'image/jpeg' })).toBe('image');
    expect(classify({ name: 'IMG_0002.HEIC', type: '' })).toBe('image');
    expect(classify({ name: 'whiteboard.webp', type: 'image/webp' })).toBe('image');
  });

  it('reads text, CSV and markdown as text', () => {
    expect(classify({ name: 'week1.csv', type: 'text/csv' })).toBe('text');
    expect(classify({ name: 'notes.md', type: '' })).toBe('text');
    expect(classify({ name: 'plan.txt', type: 'text/plain' })).toBe('text');
  });

  it('rejects what it cannot read rather than guessing', () => {
    expect(classify({ name: 'plan.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).toBe('unsupported');
    expect(classify({ name: 'plan.docx', type: '' })).toBe('unsupported');
    expect(classify({ name: 'clip.mp4', type: 'video/mp4' })).toBe('unsupported');
  });
});

describe('fitWithin', () => {
  it('scales the longer edge down to the limit and keeps the proportions', () => {
    expect(fitWithin(4032, 3024, 1568)).toEqual({ width: 1568, height: 1176 });
    expect(fitWithin(3024, 4032, 1568)).toEqual({ width: 1176, height: 1568 });
  });

  it('never enlarges a small image', () => {
    expect(fitWithin(800, 600, 1568)).toEqual({ width: 800, height: 600 });
  });

  it('never collapses a very thin image to nothing', () => {
    expect(fitWithin(5000, 1, 1568).height).toBeGreaterThanOrEqual(1);
  });
});

describe('payloadSize', () => {
  it('counts text characters and base64 characters alike', () => {
    expect(payloadSize([{ name: 'a.txt', text: 'abcd' }, { name: 'b.pdf', mediaType: 'application/pdf', data: 'AAAAAA' }])).toBe(10);
    expect(payloadSize([])).toBe(0);
  });
});
