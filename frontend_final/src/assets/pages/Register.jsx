import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { mapRole } from "../context/AuthContext";
import { getRoles, register as registerApi, sendRegistrationOtp, verifyRegistrationOtp } from "../services/api";
import OtpVerificationStep from "../components/register/OtpVerificationStep";

function Register() {
  const { googleLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [roles, setRoles] = useState([]);
  const [showOtp, setShowOtp] = useState(false);
  const [otpData, setOtpData] = useState({ expiresAt: 0, maskedEmail: '' });
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    roleId: "",
    companyName: "",
    gstNumber: "",
    businessType: "",
    website: "",
  });

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getRoles();
        console.log("Roles fetched:", response);
        setRoles(response.data);
      } catch (error) {
        console.error("Failed to load roles:", error);
        console.error("Error details:", error.response || error.message);
      }
    };
    fetchRoles();
  }, []);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    
    // First step: send OTP
    try {
      const response = await sendRegistrationOtp(form.email);
      setOtpData({
        expiresAt: response.data.expiresAt,
        maskedEmail: response.data.maskedEmail,
      });
      setShowOtp(true);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "Failed to send OTP.",
      });
    }
  };

  const handleVerifyOtp = async (otp) => {
    // This is called inside OtpVerificationStep which expects it to throw if invalid
    await verifyRegistrationOtp(form.email, otp);
    
    // Once verified, perform actual registration
    try {
        const result = await registerApi(form);
        if (result.status === 200 || result.status === 201) {
            setFeedback({
                type: "success",
                message: "Registration successful."
            });
            setShowOtp(false);
            navigate("/login");
        }
    } catch (error) {
        throw new Error(error.response?.data?.message || "Registration failed after OTP verification.");
    }
  };

  const handleResendOtp = async (emailToResend) => {
    try {
      const response = await sendRegistrationOtp(emailToResend);
      setOtpData({
        expiresAt: response.data.expiresAt,
        maskedEmail: response.data.maskedEmail,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || "Failed to resend OTP" };
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

          <div className="eyebrow">Account setup</div>
          <h1>Create your Shipment Tracker Pro account</h1>
          <p className="subtle">Choose the role that matches your milestone workflow access.</p>

          {feedback.message && <div className={`alert ${feedback.type}`}>{feedback.message}</div>}

        {showOtp ? (
          <OtpVerificationStep
            email={form.email}
            maskedEmail={otpData.maskedEmail}
            expiresAt={otpData.expiresAt}
            onVerified={handleVerifyOtp}
            onResend={handleResendOtp}
            onBack={() => setShowOtp(false)}
          />
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <>
    <div className="form-field">
      <label htmlFor="firstName">First Name</label>
      <input
        className="input"
        id="firstName"
        name="firstName"
        value={form.firstName}
        onChange={handleChange}
        required
        placeholder="Enter your first name"
      />
    </div>

    <div className="form-field">
      <label htmlFor="lastName">Last Name</label>
      <input
        className="input"
        id="lastName"
        name="lastName"
        value={form.lastName}
        onChange={handleChange}
        required
        placeholder="Enter your last name"
      />
    </div>

    <div className="form-field">
      <label htmlFor="email">Email</label>
      <input
        className="input"
        id="email"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        required
        placeholder="Enter your email"
      />
    </div>

    <div className="form-field">
      <label htmlFor="phone">Mobile Number (Optional)</label>
      <input
        className="input"
        id="phone"
        name="phone"
        type="tel"
        value={form.phone}
        onChange={handleChange}
        placeholder="Enter your mobile number"
      />
    </div>

    <div className="form-field">
      <label htmlFor="password">Password</label>
      <input
        className="input"
        id="password"
        name="password"
        type="password"
        value={form.password}
        onChange={handleChange}
        required
        minLength={6}
        placeholder="Enter your password"
      />
    </div>

    <div className="form-field">
      <label htmlFor="confirmPassword">Confirm Password</label>
      <input
        className="input"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        value={form.confirmPassword}
        onChange={handleChange}
        required
        placeholder="Re-enter your password"
      />
    </div>

    <div className="form-field">
      <label htmlFor="roleId">Role</label>
      <select
        className="select"
        id="roleId"
        name="roleId"
        value={form.roleId}
        onChange={handleChange}
        required
      >
        <option value="">Select Role</option>
        {roles.map((role) => (
          <option key={role.roleId} value={role.roleId}>
            {mapRole(role.roleName)}
          </option>
        ))}
      </select>
    </div>

    {roles.find(r => r.roleId === Number(form.roleId))?.roleName === 'BUSINESS_CLIENT' || Number(form.roleId) === 2 ? (
      <>
        <div className="form-field">
          <label>Company Name</label>
          <input
            className="input"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="Enter company name"
          />
        </div>

        <div className="form-field">
          <label>GST Number</label>
          <input
            className="input"
            name="gstNumber"
            value={form.gstNumber}
            onChange={handleChange}
            placeholder="Enter GST number"
          />
        </div>

        <div className="form-field">
          <label>Business Type</label>
          <input
            className="input"
            name="businessType"
            value={form.businessType}
            onChange={handleChange}
            placeholder="e.g. Logistics"
          />
        </div>

        <div className="form-field">
          <label>Website</label>
          <input
            className="input"
            type="url"
            name="website"
            value={form.website}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>
      </>
    ) : null}

    <button className="button primary" type="submit">
      Register
    </button>
  </>
</form>
)}

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <section className="auth-visual">
        <div className="auth-visual-inner">
          <h2>Register to Manage Your Shipment</h2>
          <p>
            Join a unified platform where customers, operators, and administrators collaborate to ensure smooth and reliable shipment management.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Register;
