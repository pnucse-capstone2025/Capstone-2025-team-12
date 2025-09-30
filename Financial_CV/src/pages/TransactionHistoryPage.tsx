//거래내역 페이지
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import NavigationBar from "@/components/NavigationBar";
import PageWrapper from "@/components/PageWrapper";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useAccountStore } from "@/store/useAccountStore";

const TransactionHistoryPage = () => {
  const navigate = useNavigate();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { accounts: userAccounts, fetchAccounts } = useAccountStore();
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      setIsLoading(true);
      await Promise.all([
        fetchTransactions(Number(userId)),
        fetchAccounts(Number(userId)),
      ]);
      setIsLoading(false);
    }
  }, [fetchTransactions, fetchAccounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  const handleMoreClick = (transactionId: number) => {
    navigate(`/document-detail/${transactionId}`);
  };

  const primaryAccount =
    userAccounts.find((account) => account.is_primary) || userAccounts[0];

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <TransactionContainer>
          <Header>
            <h1>거래내역</h1>
            <RefreshButton onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? "갱신 중..." : "새로고침"}
            </RefreshButton>
          </Header>

          {primaryAccount && (
            <AccountInfo>
              <p>
                <strong>주계좌:</strong> {primaryAccount.account_bank}{" "}
                {primaryAccount.account_number}
              </p>
              <p>
                <strong>잔액:</strong>{" "}
                {primaryAccount.account_balance.toLocaleString()}원
              </p>
            </AccountInfo>
          )}

          {isLoading && transactions.length === 0 ? (
            <HistoryP>거래내역을 불러오는 중입니다...</HistoryP>
          ) : transactions.length === 0 ? (
            <HistoryP>완료된 거래내역이 없습니다.</HistoryP>
          ) : (
            <TransactionList>
              {transactions.map((tx) => (
                <TransactionItem key={tx.transaction_id} type={tx.type}>
                  <TransactionTypeLabel type={tx.type}>
                    {tx.type === "document" ? "서류 기반 거래" : "송금 거래"}
                  </TransactionTypeLabel>

                  <TransactionInfo>
                    <TransactionDate>
                      {new Date(
                        tx.created_at.replace("/", "T") + "Z"
                      ).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </TransactionDate>

                    <TransactionTitle>
                      {tx.transaction_title.replace("으로 송금", "(으)로 송금")}
                    </TransactionTitle>

                    <TransactionDetails>
                      <strong>거래 상대:</strong> {tx.partner_name}
                    </TransactionDetails>
                  </TransactionInfo>

                  <TransactionAmount>
                    {tx.transaction_balance.toLocaleString()}원
                  </TransactionAmount>

                  {tx.type === "document" && (
                    <MoreButton onClick={() => handleMoreClick(tx.transaction_id)}>
                      더보기
                    </MoreButton>
                  )}
                </TransactionItem>
              ))}
            </TransactionList>
          )}
        </TransactionContainer>
      </PageWrapper>
    </>
  );
};

export default TransactionHistoryPage;

/* ===== Responsive styled with vh units ===== */

const HistoryP = styled.div`
  font-size: 2.2vh
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(2vh, 3vh, 4vh);

  h1 {
    font-size: clamp(2.2vh, 3vh, 3.6vh);
    line-height: 1.2;
    margin: 0;
    color: #333;
    font-weight: 800;
  }
`;

const RefreshButton = styled.button`
  padding: clamp(1vh, 1.4vh, 1.8vh) clamp(1.6vh, 2.4vh, 3vh);
  font-size: clamp(1.4vh, 1.8vh, 2vh);
  background-color: black;
  color: white;
  border: none;
  border-radius: clamp(0.6vh, 0.9vh, 1.2vh);
  cursor: pointer;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background-color: #333;
  }
`;

const TransactionContainer = styled.div`
  padding: clamp(2vh, 3vh, 4vh);
  max-width: 85vh;            /* 폭도 vh 기준 */
  margin: 0 auto;
  background-color: #fff;
  border-radius: clamp(0.8vh, 1.2vh, 1.6vh);
  box-shadow: 0 0.4vh 1.2vh rgba(0, 0, 0, 0.1);
`;

const AccountInfo = styled.div`
  background-color: #f0f0f0;
  padding: clamp(1.2vh, 1.6vh, 2vh);
  border-radius: clamp(0.6vh, 0.9vh, 1.2vh);
  margin-bottom: clamp(1.6vh, 2.4vh, 3vh);

  p {
    margin-bottom: 0.8vh;
    font-size: clamp(1.6vh, 1.9vh, 2.1vh);
    line-height: 1.35;
  }

  strong {
    color: #222;
  }
`;

const TransactionList = styled.div`
  margin-top: 2vh;
`;

const TransactionItem = styled.div<{ type?: "transfer" | "document" }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(1.4vh, 1.8vh, 2.2vh);
  border: clamp(0.22vh, 0.28vh, 0.32vh) solid
    ${(props) => (props.type === "document" ? "#28a745" : "#007bff")};
  border-radius: clamp(0.8vh, 1.2vh, 1.6vh);
  margin-bottom: clamp(1.4vh, 1.8vh, 2.2vh);
  background-color: #f9f9f9;
  position: relative;
  flex-wrap: wrap;
  gap: 1vh;
`;

const TransactionTypeLabel = styled.div<{ type?: "transfer" | "document" }>`
  position: absolute;
  top: -1.2vh;
  left: 1.4vh;
  background-color: ${(props) =>
    props.type === "document" ? "#28a745" : "#007bff"};
  color: white;
  padding: 0.4vh 1.2vh;
  border-radius: 2vh;
  font-size: clamp(1.1vh, 1.4vh, 1.6vh);
  font-weight: bold;
`;

const TransactionInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding-top: 1.8vh; /* 라벨과 겹침 방지 */
  min-width: 0;      /* 긴 제목 줄바꿈 대비 */
`;

const TransactionDate = styled.div`
  font-size: clamp(1.3vh, 1.6vh, 1.8vh);
  color: #888;
  margin-bottom: 0.8vh;
`;

const TransactionTitle = styled.div`
  font-weight: 800;
  font-size: clamp(1.8vh, 2.2vh, 2.6vh);
  margin-bottom: 0.6vh;
  line-height: 1.3;
  word-break: break-word;
`;

const TransactionDetails = styled.div`
  font-size: clamp(1.4vh, 1.7vh, 1.9vh);
  color: #555;
`;

const TransactionAmount = styled.div`
  font-size: clamp(1.8vh, 2.2vh, 2.6vh);
  font-weight: 800;
  color: #333;
  margin-left: 1.2vh;
  white-space: nowrap;
`;

const MoreButton = styled.button`
  background-color: #6c757d;
  color: white;
  border: none;
  padding: clamp(0.9vh, 1.2vh, 1.5vh) clamp(1.2vh, 1.6vh, 2vh);
  border-radius: 0.8vh;
  cursor: pointer;
  font-size: clamp(1.3vh, 1.6vh, 1.8vh);
  margin-left: 1vh;

  &:hover {
    background-color: #5a6268;
  }
`;