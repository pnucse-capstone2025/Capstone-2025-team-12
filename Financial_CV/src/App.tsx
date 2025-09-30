import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import DocumentList from "./pages/DocumentList";
import DocumentDetail from "./pages/DocumentDetail";
import CameraPage from "./pages/Camera";
import ManualRegister from "@/pages/ManualRegister";
import DocumentCategoryPage from "./pages/DocumentCategoryPage";
import LoginPage from "@/pages/LoginPage";
import SignUpPage from "@/pages/SignUpPage";
import TransferPage from "@/pages/TransferPage";
import MyPage from "@/pages/MyPage";
import DirectTransferPage from "@/pages/DirectTransferPage";
import AddAccountPage from "@/pages/AddAccountPage";
import EditProfilePage from "@/pages/EditProfilePage";
import TransactionHistoryPage from "@/pages/TransactionHistoryPage";
import DocumentScan from "./pages/DocumentScan";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/home" element={<Home />} />
        <Route path="/documents" element={<DocumentList />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />
        <Route path="/document-detail/:id" element={<DocumentDetail />} />
        <Route path="/Camera" element={<CameraPage />} />
        <Route path="/manual-register" element={<ManualRegister />} />
        <Route
          path="/documents/category/:category"
          element={<DocumentCategoryPage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/direct-transfer" element={<DirectTransferPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/add-account" element={<AddAccountPage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/history" element={<TransactionHistoryPage />} />
        <Route path="/document-scan" element={<DocumentScan />} />
      </Routes>
    </Router>
  );
}

export default App;
