import { useEffect, useState } from "react";
import { getPendingUsers, approveUser, rejectUser } from "../services/api";

function PendingUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getPendingUsers();
      setUsers(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pending users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveUser(id);
      setSuccess("User approved successfully.");
      setTimeout(() => setSuccess(""), 3000);
      setUsers(users.filter((user) => user.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve user.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectUser(id);
      setSuccess("User rejected successfully.");
      setTimeout(() => setSuccess(""), 3000);
      setUsers(users.filter((user) => user.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject user.");
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">User Management</div>
          <h1>Pending Users</h1>
          <p className="subtle">Review and approve or reject new registration requests.</p>
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ color: "#15803d", marginBottom: 16 }}>{success}</div>}

      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                    <div className="empty-state">Loading pending users...</div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                    <div className="empty-state">No Pending Users Found</div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.firstName} {user.lastName}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.roleName}</td>
                    <td>{user.phone || "-"}</td>
                    <td>
                      <span className="badge pending">Pending</span>
                    </td>
                    <td>
                      <button className="button primary" style={{ marginRight: 8, padding: "6px 12px", fontSize: 12 }} onClick={() => handleApprove(user.id)}>Approve</button>
                      <button className="button secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleReject(user.id)}>Reject</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default PendingUsers;
