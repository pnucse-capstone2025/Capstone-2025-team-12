import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";

type Props = {
  id: number;
  title: string;
  dueDate: string;
  amount: string;
  partner: string;
  partner_bank: string;
  account: string;
  isCompleted: boolean;
  onComplete: () => void;
};

const Card = styled.div<{ completed: boolean }>`
  background-color: #fff;
  border-radius: min(1.5vh, 12px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: min(2vh, 16px);
  margin-bottom: 0;
  opacity: ${({ completed }) => (completed ? 0.5 : 1)};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: min(1vh, 8px);
  width: 100%;
  box-sizing: border-box;
  margin-bottom:1.5vh;

  @media (max-height: 600px) {
    padding: min(1.5vh, 12px);
    border-radius: min(1.2vh, 10px);
  }

  @media (max-width: 768px) {
    padding: min(1.8vh, 14px);
    flex-direction: column;
    align-items: flex-start;
    gap: min(1.2vh, 10px);
  }

  @media (max-width: 480px) {
    padding: min(1.5vh, 12px);
    border-radius: min(1vh, 8px);
  }
`;

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: min(0.5vh, 4px);
  flex: 1;
  min-width: 0;

  strong {
    font-size: min(1.8vh, 14px);
    font-weight: 600;
    color: #333;
    margin-bottom: min(0.3vh, 2px);

    @media (max-height: 600px) {
      font-size: min(1.6vh, 12px);
    }

    @media (max-width: 480px) {
      font-size: min(1.6vh, 12px);
    }
  }

  div {
    font-size: min(1.6vh, 12px);
    color: #666;
    line-height: 1.4;

    @media (max-height: 600px) {
      font-size: min(1.4vh, 10px);
    }

    @media (max-width: 480px) {
      font-size: min(1.4vh, 10px);
    }
  }
`;

const Button = styled.button<{ completed: boolean }>`
  background-color: ${({ completed }) => (completed ? "#28a745" : "black")};
  color: white;
  border: none;
  padding: min(1vh, 8px) min(1.5vw, 14px);
  border-radius: min(0.8vh, 6px);
  cursor: pointer;
  white-space: nowrap;
  font-size: min(1.6vh, 12px);
  font-weight: 500;
  transition: all 0.2s ease;
  flex-shrink: 0;

  @media (max-height: 600px) {
    padding: min(0.8vh, 6px) min(1.2vw, 10px);
    font-size: min(1.4vh, 10px);
    border-radius: min(0.6vh, 4px);
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: min(1.2vh, 10px) min(2vw, 16px);
    font-size: min(1.5vh, 12px);
    text-align: center;
  }

  @media (max-width: 480px) {
    padding: min(1vh, 8px) min(1.5vw, 12px);
    font-size: min(1.4vh, 10px);
  }

  &:hover {
    background-color: #333;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const AlertCard = ({
  title,
  dueDate,
  amount,
  partner,
  partner_bank,
  account,
  isCompleted,
}: Props) => {
  const navigate = useNavigate();

  const handleTransferClick = () => {
    navigate("/direct-transfer", {
      state: {
        recipientBank: partner_bank,
        recipientAccount: account,
        transferAmount: amount,
      },
    });
  };

  return (
    <Card completed={isCompleted}>
      <InfoContainer>
        <strong>{title}</strong>
        {dueDate && <div>납부일: {dueDate}</div>}
        {amount && <div>금액: {amount}</div>}
        {partner && <div>거래상대: {partner}</div>}
        {partner_bank && <div>은행: {partner_bank}</div>}
        {account && <div>계좌번호: {account}</div>}
      </InfoContainer>

      {!isCompleted && (
        <Button completed={false} onClick={handleTransferClick}>
          송금하기
        </Button>
      )}
    </Card>
  );
};

export default AlertCard;