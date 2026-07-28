import { useEffect, useState } from "react";
import { getRejectedUsers } from "../services/api";

function RejectedUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getRejectedUsers();
      setUsers(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load rejected users.");
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
          <h1>Rejected Users</h1>
          <p className="subtle">View all rejected user applications.</p>
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
                    <div className="empty-state">Loading rejected users...</div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                    <div className="empty-state">No Rejected Users Found</div>
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
                      <span className="badge failed">Rejected</span>
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

export default RejectedUsers;
