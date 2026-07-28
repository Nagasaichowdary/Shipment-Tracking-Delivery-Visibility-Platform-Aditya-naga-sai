import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, verifyOtp, resetPassword,} from "../services/api";

function ForgotPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
    step: "request",
  });
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

const handleOtpRequest = async (event) => {
  event.preventDefault();

  try {
    const response = await forgotPassword({
      email: form.email,
    });

    setFeedback({
      type: "success",
      message: response.data.message,
    });

    setForm((current) => ({
      ...current,
      step: "verify",
    }));
  } catch (error) {
    setFeedback({
      type: "error",
      message:
        error.response?.data?.message || "Failed to send OTP.",
    });
  }
};

 const handleResetSubmit = async (event) => {
  event.preventDefault();

  if (form.password.length < 6) {
    setFeedback({
      type: "error",
      message: "Use a password with at least 6 characters.",
    });
    return;
  }

  if (form.password !== form.confirmPassword) {
    setFeedback({
      type: "error",
      message: "Passwords do not match.",
    });
    return;
  }

  try {
    await verifyOtp({
      email: form.email,
      otp: form.otp,
    });

    const response = await resetPassword({
      email: form.email,
      otp: form.otp,
      newPassword: form.password,
    });

    setFeedback({
      type: "success",
      message: response.data.message,
    });

    navigate("/login", {
  replace: true,
  state: {
    message: "Password reset successfully. Please sign in with your new password.",
  },
});

  } catch (error) {
    setFeedback({
      type: "error",
      message:
        error.response?.data?.message || "Failed to reset password.",
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

          <div className="eyebrow">Password recovery</div>
          <h1>Reset your password</h1>
          <p className="subtle">
            Enter your email, verify the one-time code, and choose a new password.
          </p>

          {feedback.message && <div className={`alert ${feedback.type}`}>{feedback.message}</div>}

          {form.step === "request" ? (
            <form className="auth-form" onSubmit={handleOtpRequest}>
              <div className="form-field">
                <label htmlFor="resetEmail">Email</label>
                <input
                  className="input"
                  id="resetEmail"
                  name="email"
                  onChange={handleChange}
                  required
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                />
              </div>

              <button className="button primary" type="submit">
                Send reset code
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleResetSubmit}>
              <div className="form-field">
                <label htmlFor="otp">Verification code</label>
                <input
                  className="input"
                  id="otp"
                  name="otp"
                  onChange={handleChange}
                  required
                  placeholder="Enter the 6-digit code"
                  value={form.otp}
                />
              </div>

              <div className="form-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  className="input"
                  id="newPassword"
                  name="password"
                  onChange={handleChange}
                  required
                  type="password"
                  placeholder="Create a new password"
                  value={form.password}
                />
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  className="input"
                  id="confirmPassword"
                  name="confirmPassword"
                  onChange={handleChange}
                  required
                  type="password"
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                />
              </div>

              <button className="button primary" type="submit">
                Reset password
              </button>
            </form>
          )}

          <p className="auth-switch">
            Remembered your password? <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </section>

      <section className="auth-visual">
        <div className="auth-visual-inner">
          <h2>Secure recovery for every account.</h2>
          <p>
            Verify ownership with a one-time code and restore access quickly without disrupting your
            shipment workflows.
          </p>
        </div>
      </section>
    </div>
  );
}

export default ForgotPassword;
