import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./SearchBar.css";

const SearchBar = () => {
  const [inputText, setInputText] = useState("");
  const navigate = useNavigate();

  const handleSearch = async () => {
    const lowerText = inputText.trim().toLowerCase();

    if (lowerText === "로그인" || lowerText === "login") {
      navigate("/login");
      return;
    }

    try {
      const response = await axios.get("http://localhost:8000/api/hello");
      console.log("응답 메시지:", response.data.message);
    } catch (error: unknown) {
      console.error("API 호출 실패:", error);
    }
  };

  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="무엇을 도와드릴까요?"
        className="search-input"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <button className="search-button" onClick={handleSearch}>
        검색
      </button>
    </div>
  );
};

export default SearchBar;
