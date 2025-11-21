import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Phone, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// домены для подсказок
const emailDomains = [
  "gmail.com",
  "mail.ru",
  "yandex.ru",
  "yahoo.com",
  "icloud.com",
  "outlook.com",
  "bk.ru",
  "inbox.ru",
  "list.ru",
  "proton.me",
];

// маска email
function emailMask(value: string) {
  let v = value.replace(/[^a-zA-Z0-9@._-]/g, "");
  v = v.toLowerCase().replace(/\s+/g, "");

  const p = v.split("@");
  if (p.length > 2) v = p[0] + "@" + p.slice(1).join("");

  return v;
}

// подсказки email
function getEmailSuggestions(value: string) {
  if (!value) return [];
  const [name, domainPart] = value.split("@");
  if (!name) return [];

  if (!domainPart) return emailDomains.map((d) => `${name}@${d}`);

  return emailDomains
    .filter((d) => d.startsWith(domainPart))
    .map((d) => `${name}@${d}`);
}

// отображение телефона
function formatPhoneMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(-10);
  let r = "+7";

  if (digits.length > 0) r += " (" + digits.slice(0, 3);
  if (digits.length >= 4) r += ") " + digits.slice(3, 6);
  if (digits.length >= 7) r += "-" + digits.slice(6, 8);
  if (digits.length >= 9) r += "-" + digits.slice(8, 10);

  return r;
}

// превращение в E.164
function normalizePhoneToE164(value: string) {
  const d = value.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return null;
  return "+7" + d;
}

export default function LoginPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  // если уже авторизован — переход
  useEffect(() => {
    if (user) nav("/dashboard");
  }, [user]);

  const [mode, setMode] = useState<"phone" | "email">("phone");

  const [phone, setPhone] = useState(""); // хранит только цифры
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [smsCode, setSmsCode] = useState("");

  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState<string | null>(null);

  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const wrapper = (err: boolean) =>
    `w-full mb-2 p-3 rounded-lg border flex items-center gap-2 ${
      err ? "border-red-500" : "border-gray-300"
    }`;

  const input = "flex-1 outline-none bg-transparent text-sm";

  // телефон
  const handlePhoneInput = (v: string) => {
    const digits = v.replace(/\D/g, "");
    setPhone(digits.slice(-10));
  };

  const sendSMS = async () => {
    setFormError("");
    setPhoneError(null);

    const e164 = normalizePhoneToE164(phone);
    if (!e164) return setPhoneError("Некорректный номер");

    try {
      setLoading(true);

      window.recaptchaLoginVerifier = new RecaptchaVerifier(
        "recaptcha-login",
        { size: "invisible" },
        auth
      );

      const res = await signInWithPhoneNumber(auth, e164, window.recaptchaLoginVerifier);
      setConfirmResult(res);

    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifySMS = async () => {
    try {
      setLoading(true);
      await confirmResult.confirm(smsCode);
    } catch {
      setFormError("Неверный SMS-код");
    } finally {
      setLoading(false);
    }
  };

  // email
  const handleEmailInput = (v: string) => {
    const masked = emailMask(v);
    setEmail(masked);
    setSuggestions(getEmailSuggestions(masked));
  };

  const loginEmail = async () => {
    setEmailError(null);
    setPassError(null);
    setFormError("");

    if (!email.includes("@")) return setEmailError("Некорректный email");
    if (!pass.trim()) return setPassError("Введите пароль");

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);

    } catch (e: any) {
      setFormError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white shadow-lg p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Вход</h1>

        {formError && <p className="text-red-600 text-center">{formError}</p>}

        <div className="flex mb-4">
          <button
            className={`flex-1 p-2 border ${mode === "phone" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
            onClick={() => setMode("phone")}
          >
            Телефон
          </button>
          <button
            className={`flex-1 p-2 border ${mode === "email" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
            onClick={() => setMode("email")}
          >
            Email
          </button>
        </div>

        {/* PHONE MODE */}
        {mode === "phone" && (
          <>
            {/* phone input */}
            <div className={wrapper(!!phoneError)}>
              <Phone className="w-4 h-4 text-gray-400" />
              <input
                className={input}
                placeholder="+7 (999) 123-45-67"
                value={formatPhoneMask(phone)}
                onChange={(e) => handlePhoneInput(e.target.value)}
              />
            </div>
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}

            <div id="recaptcha-login"></div>

            {!confirmResult ? (
              <button
                onClick={sendSMS}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg flex justify-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Продолжить"}
              </button>
            ) : (
              <>
                <div className={wrapper(false)}>
                  <Lock className="w-4 h-4 text-gray-400" />
                  <input
                    className={input}
                    placeholder="Код из SMS"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                  />
                </div>

                <button
                  onClick={verifySMS}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg flex justify-center"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Войти"}
                </button>
              </>
            )}
          </>
        )}

        {/* EMAIL MODE */}
        {mode === "email" && (
          <>
            <div className={wrapper(!!emailError)}>
              <Mail className="w-4 h-4 text-gray-400" />
              <input
                className={input}
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => handleEmailInput(e.target.value)}
              />
            </div>

            {/* suggestions */}
            {suggestions.length > 0 && (
              <div className="border rounded-lg bg-white shadow-sm mb-2">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setEmail(s);
                      setSuggestions([]);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}

            {emailError && <p className="text-xs text-red-500">{emailError}</p>}

            <div className={wrapper(!!passError)}>
              <Lock className="w-4 h-4 text-gray-400" />
              <input
                className={input}
                type="password"
                placeholder="Пароль"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>

            {passError && <p className="text-xs text-red-500">{passError}</p>}

            <button
              onClick={loginEmail}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg flex justify-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Войти"}
            </button>
          </>
        )}

        <button
          onClick={() => nav("/")}
          className="w-full text-blue-600 mt-4 hover:underline"
        >
          Нет аккаунта? Регистрация
        </button>
      </div>
    </div>
  );
}
