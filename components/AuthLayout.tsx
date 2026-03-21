'use client';

import { Center, Flexbox, Text } from '@lobehub/ui';
import { type FC, type PropsWithChildren } from 'react';

import { styles } from './style';

/**
 * AuthContainer Component
 * 
 * 认证页面容器 - 复制自 LobeChat
 * @see https://github.com/lobehub/lobe-chat
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */
const AuthContainer: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Flexbox className={styles.outerContainer} height={'100%'} padding={8} width={'100%'}>
      <Flexbox
        className={styles.innerContainerLight}
        height={'100%'}
        width={'100%'}
      >
        <Flexbox
          horizontal
          align={'center'}
          gap={8}
          justify={'space-between'}
          padding={16}
          width={'100%'}
        >
          <Text fontSize={20} weight={'bold'}>
            Originium Kernel
          </Text>
        </Flexbox>
        <Center height={'100%'} padding={16} width={'100%'}>
          {children}
        </Center>
        <Center padding={24}>
          <Text align={'center'} type={'secondary'}>
            Originium Kernel © {new Date().getFullYear()}
          </Text>
        </Center>
      </Flexbox>
    </Flexbox>
  );
};

export default AuthContainer;
