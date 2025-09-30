import { ReactNode } from 'react';
import styled from '@emotion/styled';

const Wrapper = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
`;

const PageWrapper = ({ children }: { children: ReactNode }) => {
  return <Wrapper>{children}</Wrapper>;
};

export default PageWrapper;
