import axiosInstance from "./base";

interface SignUpUserData {
  user_name: string;
  user_mail: string;
  password?: string;
}

interface UpdateUserData {
  name: string;
  userID: string;
  password?: string;
}

interface LoginCredentials {
  user_mail: string;
  password?: string;
}

interface DocumentData {
  user_id: number;
  classification_id: number;
}

interface AccountData {
  account_user_id: number;
  account_number: string;
  account_bank: string;
  account_balance: number;
}

interface UpdateAccountData {
  account_number?: string;
  account_bank?: string;
  account_balance?: number;
}

interface TransferData {
  from_account_number: string;
  withdraw_amount: number;
  to_account_number: string;
  deposit_amount: number;
}

// 파일 업로드
export const uploadFile = async (postId: number, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  const response = await axiosInstance.post(
    `/v1/post/${postId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

// 파일 정보 가져오기
export const getFiles = async (postId: number) => {
  const response = await axiosInstance.get(
    `/v1/post/${postId}/files`
  );
  return response.data;
};

// 유저 리스트 가져오기
export const getUsers = async () => {
  const response = await axiosInstance.get("/users/");
  return response.data;
};

// 유저 등록하기(회원가입)
export const signUp = async (userData: SignUpUserData) => {
  const response = await axiosInstance.post(
    "/users/register",
    {
      user_name: userData.user_name,
      user_mail: userData.user_mail,
      password: userData.password,
      user_login_id: userData.user_mail,
    }
  );
  return response.data;
};

// Id 유저 정보 가져오기
export const getUserById = async (userId: number) => {
  const response = await axiosInstance.get(
    `/users/${userId}`
  );
  return response.data;
};

// Id 유저 정보 수정하기
export const updateUser = async (userId: number, userData: UpdateUserData) => {
  const response = await axiosInstance.put(
    `/users/${userId}`,
    userData
  );
  return response.data;
};

// Id 유저 정보 삭제하기
export const deleteUser = async (userId: number) => {
  const response = await axiosInstance.delete(
    `/users/${userId}`
  );
  return response.data;
};

// 로그인
export const login = async (credentials: LoginCredentials) => {
  const response = await axiosInstance.post(
    "/users/login",
    {
      user_login_id: credentials.user_mail, // user_login_id를 user_mail로 대체
      password: credentials.password,
    }
  );
  return response.data.data || response.data;
};

// 문서 리스트 가져오기
export const getDocuments = async () => {
  const response = await axiosInstance.get("/documents/");
  return response.data;
};

// 문서 등록하기
export const createDocument = async (docData: DocumentData) => {
  const response = await axiosInstance.post(
    "/documents/",
    docData
  );
  return response.data;
};

// user_Id가 가지고 있는 문서 리스트
export const getUserDocuments = async (userId: number) => {
  const response = await axiosInstance.get(
    `/documents/user/${userId}`
  );
  return response.data.data || response.data || [];
};

// classification_id에 해당하는 문서 삭제하기
export const deleteDocumentByClassification = async (
  classificationId: number
) => {
  const response = await axiosInstance.delete(
    `/documents/${classificationId}`
  );
  return response.data;
};

// 계좌 등록하기
export const createAccount = async (accountData: AccountData) => {
  const response = await axiosInstance.post(
    "/accounts/",
    accountData
  );
  return response.data.data || response.data;
};

// user_id의 계좌 리스트 불러오기
export const getUserAccounts = async (userId: number) => {
  const response = await axiosInstance.get(
    `/accounts/user/${userId}`
  );
  return response.data.data || response.data || [];
};

// account_id의 계좌 정보 불러오기
export const getAccountById = async (accountId: number) => {
  const response = await axiosInstance.get(
    `/accounts/${accountId}`
  );
  return response.data;
};

// account_id의 계좌 정보 수정하기
export const updateAccount = async (
  accountId: number,
  accountData: UpdateAccountData
) => {
  const response = await axiosInstance.put(
    `/accounts/${accountId}`,
    accountData
  );
  return response.data;
};

// account_id의 계좌 삭제하기
export const deleteAccount = async (accountId: number) => {
  const response = await axiosInstance.delete(
    `/accounts/${accountId}`
  );
  return response.data;
};

// account_name(계좌번호)로 계좌 검색하기
export const getAccountByNumber = async (accountNumber: string) => {
  const response = await axiosInstance.get(
    `/accounts/number/${accountNumber}`
  );
  return response.data;
};

// 계좌 송금하기
export const transferAmount = async (transferData: TransferData) => {
  const response = await axiosInstance.post(
    "/accounts/transfer",
    transferData
  );
  return response.data.data || response.data;
};


// 거래내역 불러오기
export const getTransactionsByUserId = async (userId: number) => {
  const response = await axiosInstance.get(`/transactions/user/${userId}`);
  return response.data;
};

// 거래내역 등록하기
export const createTransaction = async (transactionData: {
  transaction_user_id: number;
  transaction_partner_id: number;
  transaction_title: string;
  transaction_balance: number;
  transaction_due: string;
  transaction_close: boolean;
  transaction_recurring: boolean;
}) => {
  const response = await axiosInstance.post(
    "/transactions",
    transactionData
  );
  return response.data.data || response.data;
};

// 거래내역 수정하기
export const updateTransaction = async (
  transactionId: number,
  transactionData: {
    transaction_user_id: number;
    transaction_partner_id: number;
    transaction_title: string;
    transaction_balance: number;
    transaction_due: string;
    transaction_close: boolean;
  }
) => {
  const response = await axiosInstance.patch(
    `/transactions/${transactionId}`,
    transactionData
  );
  return response.data.data || response.data;
};

// 거래내역 삭제하기
export const deleteTransaction = async (transactionId: number) => {
  const response = await axiosInstance.delete(
    `/transactions/${transactionId}`
  );
  return response.data;
};

// 리마인더 리스트 가져오기
export const getReminders = async () => {
  const response = await axiosInstance.get("/reminders/");
  return response.data.data || response.data || [];
};

// user_id의 리마인더 리스트 가져오기
export const getRemindersByUserId = async (userId: number) => {
  const response = await axiosInstance.get(`/reminders/user/${userId}`);
  return response.data.data || response.data || [];
};