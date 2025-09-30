import styled from "@emotion/styled";
import { useState } from "react";
import NavigationBar from "@/components/NavigationBar";
import PageWrapper from "@/components/PageWrapper";
import imgPath from "@/assets/eyes_open_nobg.png";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 500;
  font-size: 15px;
  color: #333;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 15px;
`;

const RegisterButton = styled.button`
  padding: 14px 24px;
  background-color: black;
  color: white;
  font-weight: bold;
  font-size: 16px;
  border: none;
  border-radius: 16px;
  margin-top: 30px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #333;
  }
`;

const ManualRegisterPage = () => {
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [partner, setPartner] = useState("");
  const [partnerBank, setPartnerBank] = useState("");
  const [account, setAccount] = useState("");
  const [repeatMonthly, setRepeatMonthly] = useState(false);

  const handleSubmit = () => {
    if (!dueDate || !amount || !partner || !partnerBank || !account) {
      alert("모든 항목을 입력해주세요.");
      return;
    }

    alert(
      `✅ 서류 등록 완료\n\n납부일: ${dueDate}${
        repeatMonthly ? " (매달 반복)" : ""
      }\n금액: ${amount}\n거래상대: ${partner}\n은행: ${partnerBank}\n계좌: ${account}`
    );
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imgPath} />
      <PageWrapper>
        <h2 style={{ marginBottom: "30px" }}>📄 직접 서류 등록하기</h2>

        <Container>
          <InputRow>
            <Label>납부일</Label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ flex: 1 }}
              />
              <label
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <input
                  type="checkbox"
                  checked={repeatMonthly}
                  onChange={() => setRepeatMonthly(!repeatMonthly)}
                />
                <span style={{ whiteSpace: "nowrap" }}>매달 결제</span>
              </label>
            </div>
          </InputRow>

          <InputRow>
            <Label>금액</Label>
            <Input
              type="text"
              placeholder="₩2,500,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </InputRow>

          <InputRow>
            <Label>거래상대</Label>
            <Input
              type="text"
              placeholder="예: 김민수"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
            />
          </InputRow>

          <InputRow>
            <Label>은행</Label>
            <Input
              type="text"
              placeholder="예: 신한은행"
              value={partnerBank}
              onChange={(e) => setPartnerBank(e.target.value)}
            />
          </InputRow>

          <InputRow>
            <Label>계좌번호</Label>
            <Input
              type="text"
              placeholder="예: 1000-xxxx-xxxx"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </InputRow>

          <RegisterButton onClick={handleSubmit}>
            📄 서류 등록하기
          </RegisterButton>
        </Container>
      </PageWrapper>
    </>
  );
};

export default ManualRegisterPage;
