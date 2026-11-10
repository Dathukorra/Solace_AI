import { createMarkerStreamFilter } from '../lib/markerStreamFilter';

describe('createMarkerStreamFilter', () => {
  it('strips activity and memory markers even when split across chunks', () => {
    let output = '';
    const filter = createMarkerStreamFilter((text) => {
      output += text;
    });

    const chunks = [
      'Hello ',
      '[[ACT',
      'IVITY:{"type":"breathing","title":"Calm","reason":"Tension"}]]',
      ' there',
      ' [[MEMORY:"',
      'likes tea"]]',
      '.',
    ];

    for (const chunk of chunks) filter.push(chunk);
    filter.flush();

    expect(output).toBe('Hello there.');
  });

  it('passes regular text through unchanged', () => {
    let output = '';
    const filter = createMarkerStreamFilter((text) => {
      output += text;
    });

    filter.push('Breathe ');
    filter.push('in slowly.');
    filter.flush();

    expect(output).toBe('Breathe in slowly.');
  });

  it('holds back a trailing bracket that may start a marker', () => {
    let output = '';
    const filter = createMarkerStreamFilter((text) => {
      output += text;
    });

    filter.push('Take a pause [');
    filter.push('[ACTIVITY:{"type":"selfcare"}]]');
    filter.flush();

    expect(output).toBe('Take a pause');
  });

  it('does not leak an unclosed marker at the end of the stream', () => {
    let output = '';
    const filter = createMarkerStreamFilter((text) => {
      output += text;
    });

    filter.push('Warm words [[ACTIVITY:{"type":"breathing"');
    filter.flush();

    expect(output).toBe('Warm words');
  });

  it('strips leaked double-brace notes even when split across chunks', () => {
    let output = '';
    const filter = createMarkerStreamFilter((text) => {
      output += text;
    });

    const chunks = [
      'Take one slow breath.',
      ' {{JSON block removed as we',
      ' don’t need a code block}}',
      ' Then let it out.',
    ];

    for (const chunk of chunks) filter.push(chunk);
    filter.flush();

    expect(output).toBe('Take one slow breath. Then let it out.');
  });

  it('strips nested double-brace notes as a single block', () => {
    let output = '';
    const filter = createMarkerStreamFilter((text) => {
      output += text;
    });

    filter.push('A gentle reply. {{outer {{inner note}} still hidden}} Done.');
    filter.flush();

    expect(output).toBe('A gentle reply. Done.');
  });

  it('does not leak an unclosed double-brace note at the end of the stream', () => {
    let output = '';
    const filter = createMarkerStreamFilter((text) => {
      output += text;
    });

    filter.push('Rest your eyes. {{internal note that never closes');
    filter.flush();

    expect(output).toBe('Rest your eyes.');
  });
});
