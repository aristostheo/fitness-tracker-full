import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">Sign up</h1>
        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
        <label className="block mb-2 text-sm">Email</label>
        <input className="w-full border rounded px-3 py-2 mb-4" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        <label className="block mb-2 text-sm">Password</label>
        <input className="w-full border rounded px-3 py-2 mb-6" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        <button className="w-full px-4 py-2 rounded bg-blue-600 text-white font-medium">Create account</button>
        <p className="mt-4 text-sm">
          Already have an account? <Link to="/login" className="text-blue-600 underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
