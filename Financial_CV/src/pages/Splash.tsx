//스플래시 페이지
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./splash.css";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/home");
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="wrapper">
      <img
        src={"src/assets/firstsnow.png"}
        alt="첫눈 로고"
        className="logoImage"
      />
      <div className="textBox">
        <div className="ment">오늘도 그대의 눈이 되어 드리겠습니다.</div>
        <div className="team">team. 첫눈</div>
      </div>
    </div>
  );
};

export default Splash;