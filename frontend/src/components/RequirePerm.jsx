// frontend/src/components/RequirePerm.jsx
import { Navigate } from "react-router-dom";
import { can, getSafePath } from "../utils/perm";

import { useAuth } from "../context/AuthContext";

export default function RequirePerm({ perm, children }) {
  const { userData, perms } = useAuth();
  
  if (!can(perm, userData, perms)) {
    return <Navigate to={getSafePath(userData, perms)} replace />;
  }
  return children;
}


