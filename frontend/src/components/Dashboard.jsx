import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="center-content">
      <h1>Welcome to Dashboard </h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;
