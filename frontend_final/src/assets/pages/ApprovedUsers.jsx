import { useEffect, useState } from "react";
import { getApprovedUsers } from "../services/api";

function ApprovedUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getApprovedUsers();
      setUsers(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load approved users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">User Management</div>
          <h1>Approved Users</h1>
          <p className="subtle">View all active approved users in the system.</p>
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</div>}

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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                    <div className="empty-state">Loading approved users...</div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                    <div className="empty-state">No Approved Users Found</div>
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
                      <span className="badge delivered">Approved</span>
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

export default ApprovedUsers;
