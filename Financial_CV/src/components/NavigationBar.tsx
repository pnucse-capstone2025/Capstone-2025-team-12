// src/components/NavigationBar.tsx
import "./NavigationBar.css";
import "bootstrap/dist/css/bootstrap.css";
import { Link, useNavigate } from "react-router-dom";
import { useVoicePref } from "@/store/useVoicePref";

function unlockAudioOnce() {
  try {
    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination); src.start(0);
  } catch {}
}

interface NavigationBarProps {
  brandName: string;
  imageSrcPath: string;
}

const NavigationBar = ({ brandName, imageSrcPath }: NavigationBarProps) => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("access_token");
  const { enabled, setEnabled } = useVoicePref();

  const handleUserIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggedIn) navigate("/mypage"); else navigate("/login");
  };

  const handleToggleVoice = (e: React.MouseEvent) => {
    e.preventDefault();
    if (enabled) {
      try { window.speechSynthesis.cancel(); } catch {}
      setEnabled(false);
      // 비활성화 이벤트(선택)
      window.dispatchEvent(new CustomEvent("voice:disable"));
    } else {
      unlockAudioOnce();                  // 제스처 안에서 오디오 언락
      setEnabled(true);
      // 활성화 즉시 현재 페이지에 알림
      window.dispatchEvent(new CustomEvent("voice:enable"));
    }
  };

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-dark">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" to="/home">
          <img src={imageSrcPath} className="d-inline-block align-top-center navbar-logo" alt="logo" />
          <span className="navbar-brand-text ms-2">{brandName}</span>
        </Link>

        <div className="navbar-collapse d-flex justify-content-end" id="navbarSupportedContent">
          <ul className="navbar-nav align-items-center">
            <li className="nav-item"><Link className="nav-link" to="/home">홈 화면</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/direct-transfer">송금하기</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/Camera">서류등록</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/documents">서류보관함</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/history">거래내역</Link></li>

            <li className="nav-item">
              <a href="#" className="nav-link d-flex align-items-center" onClick={handleToggleVoice}>
                <i className={`bi ${enabled ? "bi-mic-mute" : "bi-mic"}`} />
                <span className="ms-1">{enabled ? "음성 비활성" : "음성 활성"}</span>
              </a>
            </li>

            <li className="nav-item">
              <a className="nav-link" href="#" onClick={handleUserIconClick}>
                <i className="bi bi-person-circle"></i>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
