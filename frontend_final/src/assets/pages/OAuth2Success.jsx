import { useContext, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/auth";
function OAuth2Success() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { updateAuth } = useContext(AuthContext);
  const role = token
  ? JSON.parse(atob(token.split(".")[1])).role
  : null;
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("role", role);
  useEffect(() => {
  if (!token) {
    navigate("/login", { replace: true });
    return;
  }

  updateAuth(token, role);

  navigate("/dashboard", { replace: true });

}, [token, role, navigate, updateAuth]);
  return (
    <div>
      <h2>Signing you in...</h2>
    </div>
  );
}

export default OAuth2Success;