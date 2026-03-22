"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import ModalPortal from "@/components/ui/modal-portal";
import {
  X,
  User,
  Building2,
  Mail,
  Phone,
  Camera,
  Sun,
  Moon,
  Monitor,
  Users,
  Shield,
  ChevronRight,
  Save,
  Loader2,
  UserPlus,
  Trash2,
  Globe,
  Bell,
  Lock,
  MapPin,
} from "lucide-react";

type Tab = "profile" | "farm" | "preferences" | "users" | "security";

interface ProfileSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileSettings({ open, onClose }: ProfileSettingsProps) {
  const { user, profile, farm, signOut, refreshProfile } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || user?.email || "");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  // Farm fields
  const [farmName, setFarmName] = useState(farm?.name || "");
  const [producerName, setProducerName] = useState(farm?.producer_name || "");
  const [productionSystem, setProductionSystem] = useState(farm?.production_system || "cage-free");
  const [mainBreed, setMainBreed] = useState(farm?.main_breed || "");
  const [farmLocation, setFarmLocation] = useState("");
  const [totalBirdsFromBarns, setTotalBirdsFromBarns] = useState(0);

  useEffect(() => {
    if (!farm?.id) return;
    supabase
      .from("barns")
      .select("current_birds")
      .eq("farm_id", farm.id)
      .then(({ data }) => {
        if (data) setTotalBirdsFromBarns(data.reduce((s, b) => s + (b.current_birds ?? 0), 0));
      });
  }, [farm?.id, supabase]);

  // Preferences
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [language, setLanguage] = useState("pt-BR");
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Users management
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "worker">("worker");

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (profile) {
        await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            email: email,
            avatar_url: avatarUrl || null,
          })
          .eq("id", profile.id);
      }
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleSaveFarm = async () => {
    setSaving(true);
    try {
      if (farm) {
        await supabase
          .from("farms")
          .update({
            name: farmName,
            producer_name: producerName,
            production_system: productionSystem,
            main_breed: mainBreed,
          })
          .eq("id", farm.id);
      }
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return;
    setSaving(true);
    try {
      await supabase.auth.updateUser({ password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);

    setSaving(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

      if (uploadError) {
        // Storage may not exist — keep the local preview
        console.warn("Upload failed, using local preview:", uploadError.message);
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setAvatarUrl(data.publicUrl);
        await supabase
          .from("profiles")
          .update({ avatar_url: data.publicUrl })
          .eq("id", user.id);
        await refreshProfile();
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "farm", label: "Granja", icon: Building2 },
    { id: "preferences", label: "Preferências", icon: Sun },
    { id: "users", label: "Usuários", icon: Users },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <div className="relative w-full max-w-[920px] max-h-[90vh] min-h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden flex animate-in fade-in zoom-in-95 duration-200">
          {/* Sidebar tabs */}
          <div className="w-[250px] bg-gray-50 border-r border-gray-200/80 flex flex-col flex-shrink-0">
            {/* User header */}
            <div className="p-5 border-b border-gray-200/80">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{initials}</span>
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Camera className="w-2.5 h-2.5 text-gray-500" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{profile?.full_name || "Usuário"}</p>
                  <p className="text-[11px] text-gray-400 truncate">{profile?.role === "owner" ? "Proprietário" : profile?.role === "manager" ? "Gerente" : "Funcionário"}</p>
                </div>
              </div>
            </div>

            {/* Tab list */}
            <nav className="flex-1 p-3 space-y-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Sign out */}
            <div className="p-3 border-t border-gray-200/80">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.8} />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200/80 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-7">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Nome completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          placeholder="Seu nome completo"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          placeholder="seu@email.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Telefone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Cargo / Função
                    </label>
                    <div className="px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500">
                      {profile?.role === "owner" ? "Proprietário" : profile?.role === "manager" ? "Gerente" : "Funcionário"}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saved ? "Salvo!" : "Salvar alterações"}
                    </button>
                  </div>
                </div>
              )}

              {/* Farm Tab */}
              {activeTab === "farm" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Nome da granja
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={farmName}
                          onChange={(e) => setFarmName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          placeholder="Nome da granja"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Nome do produtor
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={producerName}
                          onChange={(e) => setProducerName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          placeholder="Nome do produtor"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Sistema de produção
                      </label>
                      <select
                        value={productionSystem}
                        onChange={(e) => setProductionSystem(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white cursor-pointer"
                      >
                        <option value="cage-free">Cage-free</option>
                        <option value="free-range">Free-range</option>
                        <option value="conventional">Convencional</option>
                        <option value="organic">Orgânico</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Raça principal
                      </label>
                      <input
                        type="text"
                        value={mainBreed}
                        onChange={(e) => setMainBreed(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        placeholder="Ex: Hy-Line Brown"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Localização
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={farmLocation}
                        onChange={(e) => setFarmLocation(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        placeholder="Cidade, Estado"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Total de aves
                      </label>
                      <div className="px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500">
                        {totalBirdsFromBarns.toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Venda direta de ovos
                      </label>
                      <div className="px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500">
                        {farm?.sells_eggs_directly ? "Sim" : "Não"}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveFarm}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saved ? "Salvo!" : "Salvar alterações"}
                    </button>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  {/* Theme */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Aparência</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "light" as const, label: "Claro", icon: Sun },
                        { id: "dark" as const, label: "Escuro", icon: Moon },
                        { id: "system" as const, label: "Sistema", icon: Monitor },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            theme === opt.id
                              ? "border-brand-500 bg-brand-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <opt.icon
                            className={`w-5 h-5 ${
                              theme === opt.id ? "text-brand-500" : "text-gray-400"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              theme === opt.id ? "text-brand-600" : "text-gray-500"
                            }`}
                          >
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Idioma</h3>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white cursor-pointer"
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Notificações</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Bell className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Notificações push</p>
                            <p className="text-[11px] text-gray-400">Alertas no navegador</p>
                          </div>
                        </div>
                        <div
                          onClick={() => setNotifications(!notifications)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                            notifications ? "bg-brand-500" : "bg-gray-300"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                              notifications ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </label>
                      <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Notificações por e-mail</p>
                            <p className="text-[11px] text-gray-400">Resumos e alertas importantes</p>
                          </div>
                        </div>
                        <div
                          onClick={() => setEmailNotifications(!emailNotifications)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                            emailNotifications ? "bg-brand-500" : "bg-gray-300"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                              emailNotifications ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-brand-50 border border-brand-100">
                    <h3 className="text-sm font-semibold text-brand-700 mb-3">Convidar novo usuário</h3>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "manager" | "worker")}
                        className="px-3 py-2.5 rounded-xl border border-brand-200 text-sm text-gray-800 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="worker">Funcionário</option>
                        <option value="manager">Gerente</option>
                      </select>
                      <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors cursor-pointer">
                        <UserPlus className="w-4 h-4" />
                        Convidar
                      </button>
                    </div>
                  </div>

                  {/* Current users list */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Membros da equipe</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">{initials}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{profile?.full_name}</p>
                            <p className="text-[11px] text-gray-400">{profile?.email}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                          Proprietário
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Alterar senha</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                          Senha atual
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                            Nova senha
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                            Confirmar nova senha
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </div>
                      {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500">As senhas não coincidem</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={saving || !newPassword || newPassword !== confirmPassword}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      {saved ? "Senha alterada!" : "Alterar senha"}
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-red-600 mb-3">Zona de perigo</h3>
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700">Excluir conta</p>
                          <p className="text-[11px] text-red-400 mt-0.5">
                            Esta ação é irreversível. Todos os dados serão apagados.
                          </p>
                        </div>
                        <button className="px-4 py-2 rounded-xl border border-red-300 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
