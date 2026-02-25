// src/components/Login.js
import { useState } from "react";
import { loginUser } from "../services/data";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
