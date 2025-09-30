import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";
import type { Document } from "@/store/useDocumentStore";

const DocumentCard = ({
  document_title: title,
  document_due: date,
  document_balance: amount,
  document_partner: partner,
  document_bank: bank,
  document_account_number: accountNumber,
  documentImage,
  isCompleted,
}: Document & { documentImage?: string; isCompleted?: boolean }) => {
  const navigate = useNavigate();

  const handleTransferClick = () => {
    navigate("/direct-transfer", {
      state: {
        recipientBank: bank,
        recipientAccount: accountNumber,
        transferAmount: amount,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <Title>{title}</Title>
        <MoreButton>더보기</MoreButton>
      </CardHeader>
      <CardBody>
        <Info>납부일: {date}</Info>
        <Info>금액: ₩{amount.toLocaleString()}</Info>
        <Info>거래상대: {partner}</Info>
        <Info>은행: {bank}</Info>
        <Info>계좌번호: {accountNumber}</Info>
        {documentImage && <DocumentImage src={documentImage} alt="Document" />}
      </CardBody>
      {!isCompleted && (
        <CardFooter>
          <TransferButton onClick={handleTransferClick}>
            송금하기
          </TransferButton>
        </CardFooter>
      )}
    </Card>
  );
};

export default DocumentCard;

const Card = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 16px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
`;

const MoreButton = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  margin-left: 8px;
  &:hover {
    color: #333;
  }
`;

const CardBody = styled.div`
  font-size: 14px;
  color: #555;
  flex-grow: 1;
`;

const Info = styled.div`
  margin-bottom: 4px;
`;

const CardFooter = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
`;

const TransferButton = styled.button`
  background-color: black;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background-color: #333;
  }
`;

const DocumentImage = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin-top: 10px;
`;
