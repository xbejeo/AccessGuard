import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function RegistrationPage() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const register = async () => {
    setError("");

    if (!fullName.trim()) {
      return setError("Введите ФИО");
    }

    if (pass !== confirm) {
      return setError("Пароли не совпадают");
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);


      await setDoc(doc(db, "users", res.user.uid), {
        fullName,
        email,
        phone: "",
        visitsLeft: 0,
        subscriptionEnd: null,
      });

      nav("/dashboard");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white shadow-lg p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-4">Регистрация</h1>

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <input
          className="w-full mb-3 p-3 rounded-lg border"
          placeholder="ФИО"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full mb-3 p-3 rounded-lg border"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full mb-3 p-3 rounded-lg border"
          type="password"
          placeholder="Пароль"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        <input
          className="w-full mb-3 p-3 rounded-lg border"
          type="password"
          placeholder="Повторите пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
          onClick={register}
        >
          Создать аккаунт
        </button>
      </div>
    </div>
  );
}
