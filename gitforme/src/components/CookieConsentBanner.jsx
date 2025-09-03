// src/components/CookieConsentBanner.js
import React, { useState, useEffect } from "react";

const bannerStyle = {
  position: "fixed",
  bottom: "0",
  left: "0",
  width: "100%",
  backgroundColor: "#232323",
  color: "white",
  padding: "15px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  zIndex: 1000,
};

const buttonStyle = {
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "5px",
  cursor: "pointer",
};

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={bannerStyle}>
      <p style={{ margin: 0, paddingRight: "15px" }}>
        We use cookies to enhance your browsing experience and analyze our
        traffic. By clicking "Accept", you consent to our use of cookies.
      </p>
      <button style={buttonStyle} onClick={handleAccept}>
        Accept
      </button>
    </div>
  );
};

export default CookieConsentBanner;
