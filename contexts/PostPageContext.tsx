'use client';

import { createContext, useState, useEffect, useMemo, useContext } from 'react';

interface PostPageContextValue {
  /** 当前文章标题（帖子页设置，导航栏读取） */
  postTitle: string;
  /** 设置文章标题 */
  setPostTitle: (title: string) => void;
}

const PostPageContext = createContext<PostPageContextValue>({
  postTitle: '',
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  setPostTitle: () => {},
});

/**
 * 帖子页上下文 Provider — 让导航栏获取当前文章标题
 * 仅在帖子详情页使用
 */
export function PostPageProvider({ children }: { children: React.ReactNode }) {
  const [postTitle, setPostTitle] = useState('');
  // 用 useMemo 缓存 value，避免每次渲染创建新对象导致消费者不必要的重渲染
  const value = useMemo(() => ({ postTitle, setPostTitle }), [postTitle, setPostTitle]);
  return (
    <PostPageContext.Provider value={value}>
      {children}
    </PostPageContext.Provider>
  );
}

export function usePostPage() {
  return useContext(PostPageContext);
}

/**
 * 帖子页设置标题的 Hook
 * 在 PostDetailBody 中使用，设置当前文章标题
 */
export function useSetPostTitle(title: string) {
  const { setPostTitle } = usePostPage();
  useEffect(() => {
    setPostTitle(title);
    return () => setPostTitle('');
  }, [title, setPostTitle]);
}
