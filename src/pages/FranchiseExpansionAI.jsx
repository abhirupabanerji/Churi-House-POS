import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, MapPin, TrendingUp, Users, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EXISTING = ["Hyderabad - Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];

export default function FranchiseExpansionAI() {
  const [city, setCity] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyze = async () => {
    if (!city) return;
    setLoading(true);
    setResult(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a restaurant franchise expansion consultant for "Churi House", an Indian restaurant chain (North Indian cuisine, casual dining). 
Existing locations: ${EXISTING.join(", ")}.
The owner wants to expand to: ${city}.
${preferences ? `Additional preferences: ${preferences}` : ""}

Analyze and provide:
1. Top 3 recommended neighborhoods/areas in ${city} with reasons
2. Market opportunity score (0-100) for each area
3. Estimated setup cost range
4. Estimated monthly revenue potential
5. Key competitors to watch
6. Demographics insight
7. Risk factors
8. Overall recommendation (Go / Wait / Avoid)

Be specific, data-driven, and actionable.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          overall_recommendation: { type: "string", enum: ["Go", "Wait", "Avoid"] },
          recommendation_reason: { type: "string" },
          city_overview: { type: "string" },
          top_areas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area_name: { type: "string" },
                opportunity_score: { type: "number" },
                reason: { type: "string" },
                demographics: { type: "string" },
                estimated_setup_cost: { type: "string" },
                estimated_monthly_revenue: { type: "string" },
                key_competitors: { type: "array", items: { type: "string" } },
                risk_factors: { type: "array", items: { type: "string" } },
              }
            }
          },
          total_market_potential: { type: "string" },
          timeline_suggestion: { type: "string" },
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  const recColor = { Go: "text-green-400 bg-green-500/10 border-green-500/30", Wait: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", Avoid: "text-red-400 bg-red-500/10 border-red-500/30" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-orange"><Sparkles className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-2xl font-bold text-foreground">AI Franchise Expansion</h1><p className="text-sm text-muted-foreground">AI-powered location intelligence for new franchise openings</p></div>
      </div>

      {/* Existing Branches */}
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-muted-foreground mb-2">Existing Locations</p>
        <div className="flex flex-wrap gap-2">{EXISTING.map(l => <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1"><MapPin className="w-3 h-3" />{l}</span>)}</div>
      </div>

      {/* Input */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Analyze New Market</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Target City / Region *</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bangalore, Pune, Chennai..." className="h-10 bg-white/5 border-white/10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Additional Preferences</Label>
            <Input value={preferences} onChange={e => setPreferences(e.target.value)} placeholder="e.g. near IT park, high footfall area..." className="h-10 bg-white/5 border-white/10 text-sm" />
          </div>
        </div>
        <Button onClick={analyze} disabled={loading || !city} className="bg-primary hover:bg-primary/90 glow-orange">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analyze with AI</>}
        </Button>
        {loading && <p className="text-xs text-muted-foreground">Searching market data, competitor analysis, demographics... this may take 15-30 seconds.</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Recommendation Banner */}
          <div className={`glass rounded-2xl p-5 border ${recColor[result.overall_recommendation]}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-2xl font-black px-4 py-1 rounded-xl border ${recColor[result.overall_recommendation]}`}>{result.overall_recommendation}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">AI Recommendation for {city}</p>
                <p className="text-xs text-muted-foreground">{result.recommendation_reason}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{result.city_overview}</p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-primary"><TrendingUp className="w-3 h-3 inline mr-1" />Market: {result.total_market_potential}</span>
              <span className="text-foreground">Timeline: {result.timeline_suggestion}</span>
            </div>
          </div>

          {/* Area Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {result.top_areas?.map((area, i) => (
              <div key={i} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold text-foreground">{area.area_name}</h3></div>
                  <div className="text-right"><p className="text-xl font-black text-primary">{area.opportunity_score}</p><p className="text-[9px] text-muted-foreground">score</p></div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{area.reason}</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Setup Cost</span><span className="text-foreground font-medium">{area.estimated_setup_cost}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Revenue/Month</span><span className="text-green-400 font-medium">{area.estimated_monthly_revenue}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Demographics</span><span className="text-foreground text-[10px]">{area.demographics}</span></div>
                </div>
                {area.key_competitors?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-muted-foreground mb-1">Key Competitors</p>
                    <div className="flex flex-wrap gap-1">{area.key_competitors.map(c => <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{c}</span>)}</div>
                  </div>
                )}
                {area.risk_factors?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Risks</p>
                    {area.risk_factors.map(r => <p key={r} className="text-[9px] text-yellow-400">⚠ {r}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}