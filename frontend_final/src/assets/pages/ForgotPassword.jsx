import { useState, useEffect } from "react";
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

  const [timeLeft, setTimeLeft] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  useEffect(() => {

    if (timeLeft <= 0) {
        if (timeLeft === 0) {
            setOtpExpired(true);
        }
        return;
    }

    const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);

}, [timeLeft]);

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

    setTimeLeft(120);
    setOtpExpired(false);

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

const handleResendOtp = async () => {
    try {
        setResending(true);

        const response = await forgotPassword({
            email: form.email,
        });

        setFeedback({
            type: "success",
            message: "A new OTP has been sent successfully.",
        });

        setTimeLeft(120);
        setOtpExpired(false);

    } catch (error) {
        setFeedback({
            type: "error",
            message:
                error.response?.data?.message ||
                "Failed to resend OTP.",
        });
    } finally {
        setResending(false);
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

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

          {form.step === "verify" && (
            <div
              style={{
                marginTop: "12px",
                marginBottom: "16px",
                color: otpExpired ? "#dc2626" : "#2563eb",
                fontWeight: 600,
          }}
        >
          {otpExpired
            ? "OTP has expired. Please request a new OTP."
            : `OTP expires in ${formatTime(timeLeft)}`}
        </div>
  )}
        {form.step === "verify" && (
    <div style={{ marginBottom: "18px" }}>
        {otpExpired ? (
            <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                    fontSize: "15px",
                }}
            >
                {resending ? "Sending OTP..." : "🔄 Resend OTP"}
            </button>
        ) : (
            <span
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: 500,
              }}
          >
              Didn't receive the OTP?{" "}
              <span
                  style={{
                  color: "#2563eb",
                  fontWeight: 600,
                }}
              >
                Resend OTP
              </span>{" "}
              will be available after the timer expires.
            </span>
        )}
    </div>
)}
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
