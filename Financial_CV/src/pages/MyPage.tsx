//마이페이지
import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import "./MyPage.css";
import { useNavigate } from "react-router-dom";
import { useAccountStore, Account } from "@/store/useAccountStore";
import NavigationBar from "@/components/NavigationBar";
import imageSrcPath from "@/assets/eyes_open_nobg.png";
import { getUserById } from "@/api";

interface UserProfile {
  user_id: number;
  user_name: string;
  user_mail: string;
  user_login_id: string;
  created_at: string;
}

const MyPage = () => {
  const { accounts, fetchAccounts, deleteAccount, setPrimaryAccount } =
    useAccountStore();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = !!localStorage.getItem("access_token");
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    } else {
      const userId = localStorage.getItem("user_id");
      if (userId) {
        fetchAccounts(Number(userId));
        // 사용자 정보 가져오기
        getUserById(Number(userId))
          .then((data) => {
            setUserData(data);
          })
          .catch((error: unknown) => {
            console.error("Failed to fetch user data:", error);
            alert("사용자 정보를 불러오는데 실패했습니다.");
          });
      }
    }
  }, [fetchAccounts, navigate]);

  const handleSetPrimary = (accountId: number) => {
    if (isEditing) return;

    const currentPrimary = accounts.find((acc) => acc.is_primary);
    if (currentPrimary && currentPrimary.account_id === accountId) return;

    if (window.confirm("대표 계좌를 변경하시겠습니까?")) {
      setPrimaryAccount(accountId);
    }
  };

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    setSelectedAccounts([]);
  };

  const handleSelectAccount = (accountId: number) => {
    setSelectedAccounts((prevSelected) =>
      prevSelected.includes(accountId)
        ? prevSelected.filter((id) => id !== accountId)
        : [...prevSelected, accountId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedAccounts.length === 0) return;

    const accountsToDelete = accounts.filter((acc) =>
      selectedAccounts.includes(acc.account_id)
    );
    const confirmMessage = accountsToDelete
      .map(
        (acc) => `${acc.account_bank} ${acc.account_number} (${acc.account_id})`
      )
      .join("\n");

    if (window.confirm(`다음 계좌를 삭제하시겠습니까?\n\n${confirmMessage}`)) {
      try {
        await Promise.all(selectedAccounts.map((id) => deleteAccount(id)));
        setSelectedAccounts([]);
        setIsEditing(false);
        alert("선택된 계좌가 삭제되었습니다.");
      } catch (error: unknown) {
        console.error("Failed to delete accounts:", error);
        alert("계좌 삭제에 실패했습니다.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    alert("로그아웃되었습니다.");
    navigate("/login");
  };

  return (
    <>
      <NavigationBar brandName="첫눈" imageSrcPath={imageSrcPath} />
      <PageWrapper>
        <h1>마이페이지</h1>

        {userData && (
          <div className="user-profile-section">
            <h2>내 프로필</h2>
            <p>
              <strong>이름:</strong> {userData.user_name}
            </p>
            <p>
              <strong>로그인 ID:</strong> {userData.user_login_id}
            </p>
            <p>
              <strong>가입일:</strong>{" "}
              {new Date(userData.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        )}

        <div className="account-actions">
          <button onClick={handleToggleEdit}>
            {isEditing ? "편집 완료" : "계좌 삭제"}
          </button>
          {isEditing && (
            <button
              onClick={handleDeleteSelected}
              disabled={selectedAccounts.length === 0}
              className={selectedAccounts.length === 0 ? "disabled-button" : ""}
            >
              선택 삭제 ({selectedAccounts.length})
            </button>
          )}
        </div>
        <div className="account-list">
          {accounts
            .sort((a, b) =>
              a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1
            )
            .map((account: Account) => (
              <div key={account.account_id} className="account-item">
                {isEditing && (
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(account.account_id)}
                    onChange={() => handleSelectAccount(account.account_id)}
                  />
                )}
                <div className="account-info">
                  <span
                    className={`star ${account.is_primary ? "primary" : ""}`}
                    onClick={() => handleSetPrimary(account.account_id)}
                  >
                    ★
                  </span>
                  <div>
                    <div className="account-bank">{account.account_bank}</div>
                    <div className="account-name">{account.account_number}</div>
                  </div>
                </div>
                <div className="account-balance">
                  {account.account_balance.toLocaleString()}원
                </div>
              </div>
            ))}
        </div>

        <button
          className="add-account-button"
          onClick={() => navigate("/add-account")}
        >
          계좌 추가하기
        </button>
        <button
          className="edit-profile-button"
          onClick={() => navigate("/edit-profile")}
        >
          정보 수정
        </button>
        <button className="logout-button" onClick={handleLogout}>
          로그아웃
        </button>
      </PageWrapper>
    </>
  );
};

export default MyPage;
