import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { login as loginApi, googleLoginApi } from "../services/api";
import { GoogleLogin } from '@react-oauth/google';
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateAuth } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });
const [showPassword, setShowPassword] = useState(false);
const [feedback, setFeedback] = useState({
  type: "",
  message: "",
});
useEffect(() => {
  if (location.state?.message) {
    setFeedback({
      type: "success",
      message: location.state.message,
    });

    window.history.replaceState({}, document.title);
    return;
  }

  const params = new URLSearchParams(location.search);
  const error = params.get("error");

  if (error) {
    setFeedback({
      type: "error",
      message: error,
    });

    navigate("/login", { replace: true });
  }
}, [location, navigate]);
 const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
 
 try {
    const result = await loginApi(form);

    if (result.status === 200) {
        sessionStorage.setItem("token", result.data.token);
        sessionStorage.setItem("role", result.data.role);
        updateAuth(result.data.token, result.data.role, {
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
        });
        setFeedback({
            type: "success",
            message: "Login successful."
        });
        navigate("/dashboard");
    }
} catch (error) {
    setFeedback({
        type: "error",
        message: error.response?.data?.message || "Invalid email or password."
    });
}
   
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const result = await googleLoginApi(credentialResponse.credential);

      if (result.status === 200) {
        sessionStorage.setItem("token", result.data.token);
        sessionStorage.setItem("role", result.data.role);
        updateAuth(result.data.token, result.data.role, {
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
        });
        setFeedback({
          type: "success",
          message: "Google Login successful."
        });
        navigate("/dashboard");
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "Google login failed."
      });
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <div className="auth-panel-content">
          <div className="brand" style={{ paddingInline: 0 }}>
            <div className="brand-mark">ST</div>
            <div>
              <div className="brand-title" style={{ color: "#132238" }}>
                Shipment Tracker Pro
              </div>
              <div className="brand-subtitle" style={{ color: "#657184" }}>
                Smart Logistics. Smarter Tracking.
              </div>
            </div>
          </div>

          <div className="eyebrow">Secure access</div>
          <h1>Sign in to operations</h1>
          <p className="subtle">
            Use the seeded administrator account or a registered user to open the dashboard.
          </p>

          {feedback.message && <div className={`alert ${feedback.type}`}>{feedback.message}</div>}

          <div className="auth-actions" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setFeedback({ type: "error", message: "Google login failed." })}
              text="continue_with"
              theme="outline"
              size="large"
              width="100%"
            />
          </div>

          <div className="auth-divider">or use your email</div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                className="input"
                id="email"
                name="email"
                onChange={handleChange}
                required
                type="email"
                placeholder="Enter your email"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  className="input"
                  id="password"
                  name="password"
                  onChange={handleChange}
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#657184",
                    fontWeight: "500",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button className="button primary" type="submit">
              Sign in
            </button>
          </form>

          <p className="auth-switch">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>

          <p className="auth-switch">
            New user? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>

      <section className="auth-visual">
        <div className="auth-visual-inner">
          <div className="auth-visual-copy">
            <h2>From shipment to delivery proof, one control tower.</h2>
            <p>
              Real-time visibility
              <br />
              Smarter decisions
              <br />
              Happier customers
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;
