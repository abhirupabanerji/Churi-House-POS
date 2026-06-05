import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Login() {
  const canvasRef = useRef(null);

  // Step: "credentials" | "pin"
  const [step, setStep] = useState("credentials");
  const [authedUser, setAuthedUser] = useState(null);

  // Credentials step
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // PIN step
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState("");

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    let user = null;
    try {
      user = await loginUser(username, password, "Churi House");
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

  // Auto-submit when 4 digits entered
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <FloatingScene canvasRef={canvasRef} />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 mb-4 glow-orange">
            <span className="text-2xl font-bold text-primary">CH</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Churi House</h1>
          <p className="text-muted-foreground text-sm mt-1">Restaurant &amp; Franchise Management</p>
        </div>

        {/* Step 1: Credentials */}
        {step === "credentials" && (
          <div className="glass-strong rounded-2xl p-8 glow-orange">
            <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
            <p className="text-sm text-muted-foreground mb-5">Sign in to your dashboard</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/20 text-destructive text-sm">{error}</div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground glow-orange"
                disabled={loading}
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Login"}
              </Button>
            </form>
          </div>
        )}

        {/* Step 2: PIN Entry */}
        {step === "pin" && (
          <div className="glass-strong rounded-2xl p-8 glow-orange flex flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-xl font-semibold text-foreground">Enter Your PIN</h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter your 4-digit PIN to access the dashboard
              </p>
            </div>

            {/* PIN dots */}
            <div className="flex gap-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                    pinEntry.length > i
                      ? "bg-primary border-primary"
                      : "bg-transparent border-muted-foreground/40"
                  }`}
                />
              ))}
            </div>

            {pinError && <p className="text-xs text-red-400 font-medium">{pinError}</p>}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
                <button
                  key={i}
                  disabled={k === ""}
                  onClick={() => {
                    if (k === "⌫") {
                      setPinEntry(p => p.slice(0, -1));
                      setPinError("");
                    } else if (k !== "") {
                      handlePinKey(String(k));
                    }
                  }}
                  className={`w-16 h-16 rounded-2xl text-lg font-semibold transition-all duration-150 ${
                    k === ""
                      ? "invisible"
                      : k === "⌫"
                      ? "glass border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                      : "glass border border-white/10 text-foreground hover:bg-primary/20 hover:border-primary/40 active:scale-95"
                  }`}
                >
                  {k === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : k}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setStep("credentials"); setPinEntry(""); setPinError(""); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              ← Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}