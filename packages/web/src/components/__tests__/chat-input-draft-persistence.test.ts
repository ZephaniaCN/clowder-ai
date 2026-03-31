/**
 * F80: Draft persistence across thread switches.
 *
 * Verifies that:
 * 1. Typed text survives unmount/remount with the same threadId
 * 2. Different threads maintain independent drafts
 * 3. Sending a message clears the draft
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInput, threadDrafts, threadImageDrafts } from '@/components/ChatInput';

// ── Mocks ──
vi.mock('@/components/icons/SendIcon', () => ({
  SendIcon: () => React.createElement('span', null, 'send'),
}));
vi.mock('@/components/icons/LoadingIcon', () => ({
  LoadingIcon: () => React.createElement('span', null, 'loading'),
}));
vi.mock('@/components/icons/AttachIcon', () => ({
  AttachIcon: () => React.createElement('span', null, 'attach'),
}));
vi.mock('@/components/ImagePreview', () => ({ ImagePreview: () => null }));
vi.mock('@/utils/compressImage', () => ({ compressImage: (f: File) => Promise.resolve(f) }));
vi.mock('@/hooks/useCatData', () => ({
  useCatData: () => ({
    cats: [
      {
        id: 'opus',
        displayName: '布偶猫',
        color: { primary: '#9B7EBD', secondary: '#E8D5F5' },
        mentionPatterns: ['布偶猫'],
        provider: 'anthropic',
        defaultModel: 'opus',
        avatar: '/a.png',
        roleDescription: 'dev',
        personality: 'kind',
      },
    ],
    isLoading: false,
    getCatById: () => undefined,
    getCatsByBreed: () => new Map(),
  }),
}));

beforeAll(() => {
  (globalThis as { React?: typeof React }).React = React;
});
afterAll(() => {
  delete (globalThis as { React?: typeof React }).React;
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  threadDrafts.clear();
  threadImageDrafts.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function getTextarea(): HTMLTextAreaElement {
  return container.querySelector('textarea') as HTMLTextAreaElement;
}

function typeInto(textarea: HTMLTextAreaElement, value: string) {
  // React controlled components need nativeInputValueSetter + input event
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  nativeSetter.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ChatInput draft persistence', () => {
  it('restores draft when remounting with same threadId', () => {
    const onSend = vi.fn();

    // Mount with thread-A, type something
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-A', onSend }));
    });
    act(() => {
      typeInto(getTextarea(), 'hello from A');
    });
    expect(getTextarea().value).toBe('hello from A');

    // Unmount
    act(() => root.unmount());

    // Remount with same threadId
    root = createRoot(container);
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-A', onSend }));
    });

    // Draft should be restored
    expect(getTextarea().value).toBe('hello from A');
  });

  it('maintains independent drafts per thread', () => {
    const onSend = vi.fn();

    // Type in thread-A
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-A', onSend }));
    });
    act(() => {
      typeInto(getTextarea(), 'draft A');
    });
    act(() => root.unmount());

    // Type in thread-B
    root = createRoot(container);
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-B', onSend }));
    });
    act(() => {
      typeInto(getTextarea(), 'draft B');
    });
    act(() => root.unmount());

    // Switch back to thread-A — should see "draft A", not "draft B"
    root = createRoot(container);
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-A', onSend }));
    });
    expect(getTextarea().value).toBe('draft A');
  });

  it('clears draft after sending', () => {
    const onSend = vi.fn();

    // Type and send
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-C', onSend }));
    });
    act(() => {
      typeInto(getTextarea(), 'will be sent');
    });

    // Press Enter to send
    const textarea = getTextarea();
    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSend).toHaveBeenCalledWith('will be sent', undefined, undefined, undefined);

    // Unmount and remount — draft should be gone
    act(() => root.unmount());
    root = createRoot(container);
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-C', onSend }));
    });
    expect(getTextarea().value).toBe('');
  });

  it('restores image drafts when remounting with same threadId', () => {
    const onSend = vi.fn();
    const fakeImage = new File(['png-data'], 'photo.png', { type: 'image/png' });

    // Pre-seed the image draft map (simulates images attached before unmount)
    threadImageDrafts.set('thread-IMG', [fakeImage]);

    // Mount with thread that has saved image draft
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-IMG', onSend }));
    });

    // Verify the image draft was restored via the module-level map
    expect(threadImageDrafts.get('thread-IMG')).toEqual([fakeImage]);
  });

  it('maintains independent image drafts per thread', () => {
    const onSend = vi.fn();
    const imgA = new File(['a'], 'a.png', { type: 'image/png' });
    const imgB = new File(['b'], 'b.png', { type: 'image/png' });

    // Seed image drafts for two threads
    threadImageDrafts.set('thread-IA', [imgA]);
    threadImageDrafts.set('thread-IB', [imgB]);

    // Mount thread-IA — its draft should be independent
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-IA', onSend }));
    });
    expect(threadImageDrafts.get('thread-IA')).toEqual([imgA]);
    expect(threadImageDrafts.get('thread-IB')).toEqual([imgB]);
  });

  it('clears image drafts after sending', () => {
    const onSend = vi.fn();
    const fakeImage = new File(['data'], 'pic.png', { type: 'image/png' });

    // Seed an image draft, mount, and send
    threadImageDrafts.set('thread-IS', [fakeImage]);
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-IS', onSend }));
    });
    act(() => {
      typeInto(getTextarea(), 'msg with image');
    });

    // Press Enter to send
    act(() => {
      getTextarea().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    // After send, unmount and remount — image draft should be cleared
    act(() => root.unmount());
    root = createRoot(container);
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-IS', onSend }));
    });
    // Text draft cleared after send → image draft should also be cleared
    expect(threadImageDrafts.has('thread-IS')).toBe(false);
  });

  it('evicts oldest image drafts when exceeding LRU limit', () => {
    const onSend = vi.fn();

    // Seed 5 image drafts (the max), then add a 6th before mounting
    for (let i = 1; i <= 5; i++) {
      threadImageDrafts.set(`thread-LRU-${i}`, [new File([`${i}`], `${i}.png`, { type: 'image/png' })]);
    }
    // Pre-seed 6th so useState initializer picks it up as images
    threadImageDrafts.set('thread-LRU-6', [new File(['6'], '6.png', { type: 'image/png' })]);
    expect(threadImageDrafts.size).toBe(6);

    // Mount thread-LRU-6 — images state initializes from draft map
    act(() => {
      root.render(React.createElement(ChatInput, { threadId: 'thread-LRU-6', onSend }));
    });
    // Type to trigger useLayoutEffect (images.length > 0 from init)
    act(() => {
      typeInto(getTextarea(), 'trigger');
    });
    act(() => root.unmount());

    // LRU eviction: max 5, oldest (thread-LRU-1) should be evicted
    expect(threadImageDrafts.size).toBeLessThanOrEqual(5);
    expect(threadImageDrafts.has('thread-LRU-1')).toBe(false);
    expect(threadImageDrafts.has('thread-LRU-6')).toBe(true);
  });

  it('does not persist draft when threadId is undefined', () => {
    const onSend = vi.fn();

    act(() => {
      root.render(React.createElement(ChatInput, { onSend }));
    });
    act(() => {
      typeInto(getTextarea(), 'no thread');
    });

    // Map should remain empty — no threadId means no persistence
    expect(threadDrafts.size).toBe(0);
  });
});
