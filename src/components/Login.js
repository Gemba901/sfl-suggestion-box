// src/components/Login.js
import { useState } from "react";
import { loginUser } from "../services/data";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

function Login({ onLogin }) {
  const [name, setName] = useState(localStorage.getItem("sfl_name") || "");
  const [phone, setPhone] = useState(localStorage.getItem("sfl_phone") || "");
  const [remember, setRemember] = useState(localStorage.getItem("sfl_remember") === "true");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Please enter your full name"); return; }
    if (!phone.trim()) { setError("Please enter your phone number"); return; }

    setLoading(true);
    try {
      const phoneToUse = phone.startsWith("+") ? phone : `+${phone}`;
const user = await loginUser(name, phoneToUse);
    if (user) {
        if (remember) { localStorage.setItem("sfl_name", name.trim()); localStorage.setItem("sfl_phone", phone); localStorage.setItem("sfl_remember", "true"); }
        else { localStorage.removeItem("sfl_name"); localStorage.removeItem("sfl_phone"); localStorage.removeItem("sfl_remember"); }
        onLogin(user);
      } else {
        setError("Name or phone number not found. Please check and try again.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/sfl-logo.png" alt="SFL" className="login-logo-img" />
        <h1 className="login-title">SFL Suggestion Box</h1>
        <p className="login-subtitle">Making SFL better, one idea at a time</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
  <label>Phone Number</label>

  <PhoneInput
  country={"ke"}
  value={phone}
  onChange={(value) => setPhone(value)}
  enableSearch
  countryCodeEditable={true}
  inputStyle={{ width: "100%" }}
/>
</div>

          {error && <div className="form-error">{error}</div>}
        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 18, height: 18 }} />
            <label htmlFor="remember" style={{ fontSize: 13, color: "#475569", cursor: "pointer" }}>Remember me</label>
          </div>
          
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="login-hint">
          Use your registered name and phone number to log in
        </p>
      </div>
    </div>
  );
}

export default Login;
