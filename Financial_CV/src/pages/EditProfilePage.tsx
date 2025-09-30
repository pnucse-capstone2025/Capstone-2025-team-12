//개인정보 편집 페이지
import { useState } from "react";
import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";
import PageWrapper from "@/components/PageWrapper";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";

const EditProfilePage = () => {
  const [name, setName] = useState("사용자 이름");
  const [email, setEmail] = useState("user@example.com");
  const [phone, setPhone] = useState("010-1234-5678");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    console.log("Updating profile:", { name, email, phone });
    alert("정보가 수정되었습니다.");
    navigate("/mypage");
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <EditProfileContainer>
          <h1>정보 수정</h1>
          <form onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="tel"
              placeholder="전화번호"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit">저장</Button>
          </form>
        </EditProfileContainer>
      </PageWrapper>
    </>
  );
};

export default EditProfilePage;

const EditProfileContainer = styled.div`
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  h1 {
    text-align: center;
    margin-bottom: 30px;
    color: #333;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background-color: black;
  color: white;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  cursor: pointer;
`;
