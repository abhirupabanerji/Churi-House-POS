import { useState, useRef, useEffect } from "react";
import { User, Lock, Loader2, Delete } from "lucide-react";
import { loginUser, logAudit } from "@/lib/restaurantAuth";
import * as THREE from "three";

function FloatingScene({ canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xea580c, transparent: true, opacity: 0.7 });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.5 });
    const shapes = [];
    const geos = [
      new THREE.TorusGeometry(0.4, 0.15, 16, 32),
      new THREE.OctahedronGeometry(0.35),
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.ConeGeometry(0.3, 0.6, 8),
      new THREE.TorusKnotGeometry(0.25, 0.08, 64, 8),
    ];
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(geos[i % geos.length], i % 3 === 0 ? orangeMat : darkMat);
      mesh.position.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4 - 1
      );
      mesh.userData = {
        speedX: (Math.random() - 0.5) * 0.003,
        speedY: (Math.random() - 0.5) * 0.003,
        rotSpeed: (Math.random() - 0.5) * 0.01,
      };
      scene.add(mesh);
      shapes.push(mesh);
    }
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pl = new THREE.PointLight(0xea580c, 2, 20);
    pl.position.set(2, 3, 4);
    scene.add(pl);
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      shapes.forEach(s => {
        s.position.x += s.userData.speedX;
        s.position.y += s.userData.speedY;
        s.rotation.x += s.userData.rotSpeed;
        s.rotation.y += s.userData.rotSpeed * 0.7;
        if (Math.abs(s.position.x) > 5) s.userData.speedX *= -1;
        if (Math.abs(s.position.y) > 4) s.userData.speedY *= -1;
      });
      renderer.render(scene, camera);
    };
    animate();
    const onResize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);
  return null;
}

// Inline styles that are fully theme-independent
const cardStyle = {
  background: "rgba(18, 18, 18, 0.75)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "1rem",
  padding: "2rem",
  boxShadow: "0 0 40px rgba(234,88,12,0.15)",
};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#ffffff",
  height: "2.75rem",
  borderRadius: "0.5rem",
  paddingLeft: "2.5rem",
  width: "100%",
  fontSize: "0.875rem",
  outline: "none",
};

const labelStyle = {
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "1.25rem",
  marginBottom: "0.25rem",
};

const subStyle = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "0.875rem",
  marginBottom: "1.25rem",
};

const pinDotActive = {
  width: "1rem", height: "1rem", borderRadius: "50%",
  background: "#ea580c", border: "2px solid #ea580c",
  transition: "all 0.15s",
};

const pinDotInactive = {
  width: "1rem", height: "1rem", borderRadius: "50%",
  background: "transparent", border: "2px solid rgba(255,255,255,0.25)",
  transition: "all 0.15s",
};

const numBtnBase = {
  width: "4rem", height: "4rem", borderRadius: "0.75rem",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#ffffff", fontSize: "1.125rem", fontWeight: 600,
  cursor: "pointer", transition: "all 0.15s", display: "flex",
  alignItems: "center", justifyContent: "center",
};

export default function Login() {
  const canvasRef = useRef(null);
  const [step, setStep] = useState("credentials");
  const [authedUser, setAuthedUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState("");

  // ── Read branding from localStorage ──────────────────────────────────────
  const logoUrl = localStorage.getItem("branding_logo") || "";
  const savedSettings = (() => {
    try { return JSON.parse(localStorage.getItem("churi_settings") || "{}"); }
    catch { return {}; }
  })();
  const restaurantName = savedSettings.restaurant_name || "Churi House";
  const tagline = savedSettings.tagline || "Restaurant & Franchise Management";

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    let user = null;
    try {
      user = await loginUser(username, password, restaurantName);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    const storedPin = localStorage.getItem(`app_pin_${user.username}`);
    if (storedPin) {
      setAuthedUser(user);
      setStep("pin");
      setLoading(false);
    } else {
      await logAudit("User Login", `${user.username} logged in`, "auth");
      window.location.href = "/";
    }
  };

  useEffect(() => {
    if (step !== "pin" || pinEntry.length !== 4 || !authedUser) return;
    const storedPin = localStorage.getItem(`app_pin_${authedUser.username}`);
    if (pinEntry === storedPin) {
      logAudit("User Login", `${authedUser.username} logged in`, "auth");
      window.location.href = "/";
    } else {
      setPinError("Wrong PIN. Try again.");
      setPinEntry("");
    }
  }, [pinEntry, step, authedUser]);

  const handlePinKey = (k) => {
    if (pinEntry.length >= 4) return;
    setPinEntry(p => p + k);
    setPinError("");
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflow: "hidden", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <FloatingScene canvasRef={canvasRef} />

      {/* Ambient glow blobs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "25%", left: "25%", width: "24rem", height: "24rem", background: "rgba(234,88,12,0.10)", borderRadius: "50%", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", bottom: "25%", right: "25%", width: "20rem", height: "20rem", background: "rgba(234,88,12,0.07)", borderRadius: "50%", filter: "blur(100px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "28rem", padding: "0 1rem" }}>

        {/* ── Branding ── */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>

          {/* Logo: uploaded image or initials fallback */}
          {logoUrl ? (
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "4.5rem", height: "4.5rem", borderRadius: "1rem", background: "rgba(234,88,12,0.15)", border: "1px solid rgba(234,88,12,0.3)", marginBottom: "1rem", boxShadow: "0 0 20px rgba(234,88,12,0.3)", overflow: "hidden" }}>
              <img
                src={logoUrl}
                alt={restaurantName}
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: "0.35rem" }}
                onError={(e) => {
                  // If image fails to load, fall back to initials
                  e.target.style.display = "none";
                  e.target.parentNode.innerHTML = `<span style="font-size:1.5rem;font-weight:700;color:#ea580c">${restaurantName.slice(0, 2).toUpperCase()}</span>`;
                }}
              />
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "4rem", height: "4rem", borderRadius: "1rem", background: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.3)", marginBottom: "1rem", boxShadow: "0 0 20px rgba(234,88,12,0.3)" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ea580c" }}>
                {restaurantName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.025em" }}>
            {restaurantName}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {tagline}
          </p>
        </div>

        {/* ── Step 1: Credentials ── */}
        {step === "credentials" && (
          <div style={cardStyle}>
            <p style={labelStyle}>Welcome back</p>
            <p style={subStyle}>Sign in to your dashboard</p>

            {error && (
              <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: "0.875rem" }}>{error}</div>
            )}

            <form onSubmit={handleCredentialsSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ position: "relative" }}>
                <User style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", width: "1rem", height: "1rem", color: "rgba(255,255,255,0.35)" }} />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", width: "1rem", height: "1rem", color: "rgba(255,255,255,0.35)" }} />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", height: "2.75rem", borderRadius: "0.5rem", background: "#ea580c", color: "#ffffff", fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 0 20px rgba(234,88,12,0.4)" }}
              >
                {loading ? <><Loader2 style={{ width: "1rem", height: "1rem", animation: "spin 1s linear infinite" }} /> Signing in...</> : "Login"}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: PIN Entry ── */}
        {step === "pin" && (
          <div style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ ...labelStyle, textAlign: "center" }}>Enter Your PIN</p>
              <p style={{ ...subStyle, marginBottom: 0 }}>Enter your 4-digit PIN to access the dashboard</p>
            </div>

            {/* PIN dots */}
            <div style={{ display: "flex", gap: "1rem" }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={pinEntry.length > i ? pinDotActive : pinDotInactive} />
              ))}
            </div>

            {pinError && <p style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: 500 }}>{pinError}</p>}

            {/* Numpad */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
                <button
                  key={i}
                  disabled={k === ""}
                  onClick={() => {
                    if (k === "⌫") { setPinEntry(p => p.slice(0, -1)); setPinError(""); }
                    else if (k !== "") handlePinKey(String(k));
                  }}
                  style={k === "" ? { ...numBtnBase, visibility: "hidden" } : numBtnBase}
                  onMouseEnter={e => { if (k !== "") e.currentTarget.style.background = "rgba(234,88,12,0.2)"; }}
                  onMouseLeave={e => { if (k !== "") e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                >
                  {k === "⌫" ? <Delete style={{ width: "1.25rem", height: "1.25rem" }} /> : k}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setStep("credentials"); setPinEntry(""); setPinError(""); }}
              style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", marginTop: "0.25rem" }}
              onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
            >
              ← Back to login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
