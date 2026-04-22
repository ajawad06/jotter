import PropTypes from "prop-types";

function DashboardPage({ user = null, onLogout }) {
  return (
    <section className="dashboard-card">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome, {user?.name || user?.email}.</p>
        </div>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="notes-placeholder">
        <h2>Your notes</h2>
        <p>
          Day 3 complete: authentication flow is connected. Notes CRUD starts
          next.
        </p>
      </div>
    </section>
  );
}

DashboardPage.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
};

export default DashboardPage;
