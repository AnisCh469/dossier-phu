import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen, Stethoscope, GraduationCap, FileText, CheckCircle2, Clock,
  AlertCircle, ChevronRight, BarChart3, Award, Users, ArrowLeft, Plus,
  Trash2, LogOut, Loader2, UserCircle, UploadCloud, X, Sparkles, Lightbulb,
  Printer, BrainCircuit, ShieldAlert, Heart, MapPin, Menu
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, signInWithCustomToken
} from 'firebase/auth';
import { supabase } from './supabase';

// --- DONNÉES INITIALES (Grille JORT 2021) ---
// Baseée sur l'arrêté du 1er juillet 2021
const INITIAL_DATA = {
  score: {
    total_estimatif: 0,
    target_total: 100,
    note_finale_estimee: 0 // Sur 20
  },
  sections: [
    {
      id: 'titres',
      title: 'I. Titres et Diplômes',
      subtitle: 'Coefficient: 10% (Max 10 pts)',
      iconName: 'GraduationCap',
      color: 'text-indigo-900',
      borderColor: 'border-l-indigo-900',
      items: [
        { id: 101, label: "Doctorat en Médecine", status: "missing", date: null, file: null, required: true },
        { id: 102, label: "Diplôme de Spécialité Médicale", status: "missing", date: null, file: null, required: true },
        { id: 103, label: "Doctorat en Sciences (Thèse ès-science)", status: "missing", date: null, file: null, optional: true },
        { id: 104, label: "Mastère de recherche (M1+M2)", status: "missing", date: null, file: null, optional: true },
        { id: 105, label: "CEC de Pédagogie Médicale (Recommandé)", status: "missing", date: null, file: null, optional: true },
      ]
    },
    {
      id: 'recherche',
      title: 'II. Activités de Recherche',
      subtitle: 'Coefficient: 25% (Publications, Congrès)',
      iconName: 'BookOpen',
      color: 'text-blue-900',
      borderColor: 'border-l-blue-900',
      items: [
        { id: 201, label: "Article Original Q1 (1er, 2ème ou Dernier Auteur)", status: "missing", date: null, file: null },
        { id: 202, label: "Article Original Q2 (1er, 2ème ou Dernier Auteur)", status: "missing", date: null, file: null },
        { id: 203, label: "Article Original Q3/Q4", status: "missing", date: null, file: null },
        { id: 204, label: "Communication Orale Internationale (Indexée)", status: "missing", date: null, file: null },
        { id: 205, label: "Preuve soumission et approbation Comité d'Éthique", status: "missing", date: null, file: null, required: true }, // Crucial selon JORT
      ]
    },
    {
      id: 'pedagogie',
      title: 'III. Activités Pédagogiques',
      subtitle: 'Coefficient: 22% (Encadrement, Outils)',
      iconName: 'Users',
      color: 'text-teal-800',
      borderColor: 'border-l-teal-800',
      items: [
        { id: 301, label: "Attestation Direction Thèse de Médecine (Soutenue)", status: "missing", date: null, file: null },
        { id: 302, label: "Création de Mini-module d'auto-apprentissage (MMD)", status: "missing", date: null, file: null },
        { id: 303, label: "Production d'ECOS / Vignettes Cliniques", status: "missing", date: null, file: null },
      ]
    },
    {
      id: 'responsabilites',
      title: 'IV. Responsabilités Sanitaires',
      subtitle: 'Coefficient: 7% (Administration, Comités)',
      iconName: 'Award',
      color: 'text-purple-800',
      borderColor: 'border-l-purple-800',
      items: [
        { id: 401, label: "Attestation d'exercice effectif (3 ans min. en tant que MCA)", status: "missing", date: null, file: null, required: true },
        { id: 402, label: "Membre commission médicale / scientifique locale", status: "missing", date: null, file: null },
        { id: 403, label: "Direction d'unité/laboratoire de recherche", status: "missing", date: null, file: null, optional: true },
      ]
    },
    {
      id: 'epreuves',
      title: 'V & VI. Épreuves JORT',
      subtitle: 'Coefficient: 26% (Pédagogique et Pratique)',
      iconName: 'BrainCircuit',
      color: 'text-rose-800',
      borderColor: 'border-l-rose-800',
      items: [
        { id: 501, label: "Préparation Présentation Pédagogique (Slides / Abstract)", status: "missing", date: null, file: null },
        { id: 502, label: "Préparation Épreuve Pratique (Cas clinique / Patient)", status: "missing", date: null, file: null },
      ]
    },
    {
      id: 'regions',
      title: 'VII. Engagement Régional',
      subtitle: 'Coefficient: 10% (Promotion sanitaire, Régions)',
      iconName: 'MapPin',
      color: 'text-amber-700',
      borderColor: 'border-l-amber-700',
      items: [
        { id: 601, label: "Attestation d'exercice dans une région prioritaire (Optionnel)", status: "missing", date: null, file: null, optional: true },
        { id: 602, label: "Participation missions de santé publique nationales", status: "missing", date: null, file: null, optional: true },
      ]
    },
    {
      id: 'administratif',
      title: 'Dossier Administratif',
      subtitle: 'Constitution physique et numérique (Pré-requis)',
      iconName: 'FileText',
      color: 'text-slate-600',
      borderColor: 'border-l-slate-500',
      items: [
        { id: 701, label: "Notice Individuelle (Note de synthèse)", status: "missing", date: null, file: null, required: true },
        { id: 702, label: "Rapport anti-plagiat des publications", status: "missing", date: null, file: null, required: true },
        { id: 703, label: "2 Copies papier (Format A4, Reliure dos carré collé)", status: "missing", date: null, file: null, required: true },
        { id: 704, label: "8 Copies numériques (Clés USB en PDF structuré)", status: "missing", date: null, file: null, required: true },
      ]
    }
  ]
};

const IconMap = {
  GraduationCap: GraduationCap,
  BookOpen: BookOpen,
  Stethoscope: Stethoscope,
  FileText: FileText,
  Users: Users,
  Award: Award,
  BrainCircuit: BrainCircuit,
  MapPin: MapPin
};

// --- COMPOSANTS UI DE BASE ---
const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const config = {
    completed: { style: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Terminé", icon: CheckCircle2 },
    in_progress: { style: "bg-blue-100 text-blue-800 border-blue-200", label: "En cours", icon: Clock },
    missing: { style: "bg-rose-100 text-rose-800 border-rose-200", label: "À récupérer", icon: AlertCircle },
  };
  const { style, label, icon: Icon } = config[status];
  return (
    <span className={`flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </span>
  );
};

const ProgressBar = ({ progress }) => (
  <div className="w-full bg-slate-200 rounded-full h-2.5">
    <div
      className="bg-blue-900 h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm relative overflow-hidden"
      style={{ width: `${progress}%` }}
    >
      <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-pulse"></div>
    </div>
  </div>
);

// --- MOTEUR DE COACHING / RECOMMANDATIONS (Avancé JORT) ---
const CoachingEngine = ({ data }) => {
  const [tips, setTips] = useState([]);

  useEffect(() => {
    if (!data) return;
    const newTips = [];
    let hasEthics = false;
    let hasPlagiarismReport = false;
    let missingRequired = [];

    data.sections.forEach(s => {
      s.items.forEach(i => {
        if (i.label.includes('éthique') && i.status === 'completed') hasEthics = true;
        if (i.label.includes('anti-plagiat') && i.status === 'completed') hasPlagiarismReport = true;

        if (i.required && (i.status === 'missing' || i.status === 'in_progress')) {
          missingRequired.push(i.label);
        }
      });
    });

    // Alertes Critiques / Eliminatoires
    if (!hasPlagiarismReport) {
      newTips.push({ type: 'critical', msg: `Alerte JORT : La fraude et le plagiat sont éliminatoires. Soumettez vos travaux au logiciel anti-plagiat avant l'impression finale.` });
    }
    if (!hasEthics) {
      newTips.push({ type: 'critical', msg: `Alerte JORT : Toute recherche clinique sans approbation d'un comité d'éthique local/national sera ignorée par le jury.` });
    }

    // Stratégie & Conseils
    newTips.push({ type: 'strategy', msg: `Qualité > Quantité : Le jury privilégie un article 1er auteur en Q1/Q2 avec un fort Impact Factor plutôt que dix cas cliniques mineurs.` });

    // Checklist Administrative
    const adminSection = data.sections.find(s => s.id === 'administratif');
    const adminMissing = adminSection?.items.some(i => i.status !== 'completed');
    if (adminMissing) {
      newTips.push({ type: 'admin', msg: `Rigueur Administrative : Préparez exactement 2 copies papier avec reliure "dos carré collé" et 8 clés USB contenant des PDF proprement nommés.` });
    }

    if (missingRequired.length === 0) {
      newTips.push({ type: 'success', msg: `Félicitations Dr NAIJA ! Toutes les pièces requises semblent réunies. Assurez-vous du dépôt 48h avant la clôture.` });
    }

    setTips(newTips);
  }, [data]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="w-6 h-6 text-blue-700" />
        <h3 className="text-lg font-bold text-blue-900">Expertise JORT & Stratégie</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tips.map((tip, idx) => (
          <div key={idx} className={`p-4 rounded-lg text-sm border ${tip.type === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              tip.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                tip.type === 'strategy' ? 'bg-white border-indigo-200 text-indigo-800' :
                  'bg-amber-50 border-amber-200 text-amber-800'
            } flex items-start gap-3 shadow-sm transition-transform hover:-translate-y-0.5`}>
            {tip.type === 'critical' && <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0 text-rose-600" />}
            {tip.type === 'success' && <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />}
            {tip.type === 'strategy' && <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500" />}
            {tip.type === 'admin' && <FileText className="w-5 h-5 mt-0.5 flex-shrink-0 text-slate-500" />}
            <p className="font-medium leading-relaxed">{tip.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
};


// --- VUE DÉTAIL DE SECTION ---
const SectionDetail = ({ section, onBack, onUpdateStatus, onAddItem, onDeleteItem, onFileUpload, onRemoveFile }) => {
  const [newItemText, setNewItemText] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const Icon = IconMap[section.iconName] || FileText;

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItemText.trim()) {
      onAddItem(section.id, newItemText);
      setNewItemText("");
    }
  };

  const nextStatus = (current) => {
    if (current === 'missing') return 'in_progress';
    if (current === 'in_progress') return 'completed';
    return 'missing';
  };

  const handleLocalUpload = (itemId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingId(itemId);
    // Délai artificiel pour le feedback visuel (UX)
    setTimeout(() => {
      onFileUpload(section.id, itemId, file);
      setUploadingId(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors bg-white border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-6 h-6 text-blue-900" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Icon className={`w-8 h-8 ${section.color}`} />
            {section.title}
          </h2>
          <p className="text-slate-500">{section.subtitle}</p>
        </div>
      </div>

      <Card className="divide-y divide-slate-100 border focus-within:border-blue-300 transition-colors">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Composantes de la grille</h3>
          <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200 text-slate-500 shadow-sm">
            {section.items.length} éléments
          </span>
        </div>

        {section.items.map((item) => (
          <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors group gap-4">
            <div className="flex items-start md:items-center gap-4 flex-1 pr-4">
              <button
                onClick={() => onUpdateStatus(section.id, item.id, nextStatus(item.status))}
                className="focus:outline-none tooltip transform active:scale-95 transition-transform shrink-0 mt-1 md:mt-0"
              >
                <Badge status={item.status} />
              </button>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${item.status === 'completed' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
                    {item.label}
                  </span>
                  {item.required && <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Requis</span>}
                </div>
                {item.date && (
                  <span className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    Validé le {item.date}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:justify-end">
              {!item.file ? (
                <label className={`cursor-pointer p-2 border rounded-md transition-colors flex items-center gap-2 text-xs font-semibold whitespace-nowrap shadow-sm ${uploadingId === item.id ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-wait' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                  {uploadingId === item.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Exportation...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Joindre scan (PDF/Img)</span>
                    </>
                  )}
                  <input type="file" className="hidden" disabled={uploadingId === item.id} onChange={(e) => handleLocalUpload(item.id, e)} accept=".pdf,image/*" />
                </label>
              ) : (
                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200 px-3 py-1.5 gap-2 max-w-[200px] shadow-sm">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <a href={item.file.data} download={item.file.name} target="_blank" rel="noreferrer" className="text-xs text-blue-700 font-medium truncate cursor-pointer hover:underline hover:text-blue-900" title={item.file.name}>
                    {item.file.name}
                  </a>
                  <button
                    onClick={() => onRemoveFile(section.id, item.id)}
                    className="p-1 ml-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {/* Optionnel: Bouton pour visualiser la data base64 stockée ci on le souhaitait */}
                </div>
              )}

              <button
                onClick={() => onDeleteItem(section.id, item.id)}
                className="p-2 ml-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                title="Supprimer la ligne"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        <div className="p-4 bg-blue-50/50">
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Ajouter une ligne personnalisée..."
              className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
            />
            <button
              type="submit"
              disabled={!newItemText.trim()}
              className="px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
};

// --- AUTH SCREEN ---
const AuthScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    onLoginSuccess(email);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full opacity-50"></div>
        <div className="bg-blue-950 p-8 text-center relative z-10 border-b-4 border-indigo-500">
          <Heart className="w-12 h-12 text-rose-400 mx-auto mb-3 animate-pulse" />
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">Concours PHU</h1>
          <p className="text-blue-200 text-sm mt-2 font-medium">Préparation Dossier JORT 2021</p>
        </div>

        <div className="p-8 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Identifiant Candidat</label>
              <input
                type="email" required placeholder="dr.naija@hopital.tn"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Mot de passe / Code d'accès</label>
              <input
                type="password" required placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-3 px-4 bg-blue-900 text-white text-lg font-bold rounded-lg hover:bg-blue-800 transition-colors shadow-md mt-4 flex justify-center items-center gap-2">
              <LogOut className="w-5 h-5 rotate-180" />
              Accéder au portail
            </button>
          </form>
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-slate-500">
        Données persistées localement via IndexedDB pour garantir la sécurité de vos scans.
      </div>
    </div>
  );
};

// --- VUE IMPRESSION (CV JORT) ---
const ReportView = ({ data, user }) => {
  return (
    <div className="hidden print:block p-8 bg-white text-black min-h-screen font-serif">
      <div className="text-center mb-8 border-b-2 border-slate-800 pb-6 relative">
        <h1 className="text-3xl font-black uppercase tracking-widest mb-2 text-slate-900 leading-tight">Notice Individuelle et <br /> Curriculum Vitae</h1>
        <h2 className="text-xl font-bold text-slate-700 uppercase tracking-wide mt-4">Concours de Recrutement des Médecins Hospitalo-Universitaires</h2>
        <h3 className="text-lg font-semibold text-slate-600">(Grade de Professeur)</h3>

        <div className="mt-8 text-2xl font-bold text-blue-900 bg-slate-100 py-3 rounded border border-slate-300 inline-block px-12">
          {user?.displayName || "Candidat"}
        </div>
      </div>

      <div className="mb-10 p-5 bg-slate-50 border-2 border-slate-400 rounded-lg text-sm text-slate-800 leading-relaxed font-sans">
        <strong>Déclaration sur l'honneur :</strong> Je soussigné(e), certifie l'exactitude des informations portées sur ce document. Conscient(e) que les fraudes scientifiques et le plagiat exposent à des sanctions éliminatoires de la part des jurys tunisiens, l'ensemble de mes travaux a été vérifié.
      </div>

      <div className="space-y-8">
        {data.sections.map((section, idx) => (
          <div key={section.id} className="break-inside-avoid">
            <h3 className="text-xl font-bold mb-3 text-blue-900 border-b-2 border-blue-900 pb-1 flex justify-between items-end">
              <span>{section.title}</span>
              <span className="text-xs font-normal text-slate-500 uppercase">{section.subtitle}</span>
            </h3>
            <ul className="list-none pl-2 space-y-3">
              {section.items.map(item => (
                <li key={item.id} className="text-base text-slate-800 pb-2 border-b border-slate-100 border-dashed flex justify-between items-center">
                  <div className="flex bg-white">
                    <span className={`inline-block w-4 h-4 mr-2 border ${item.status === 'completed' ? 'bg-black border-black' : 'border-slate-400'}`}>
                      {item.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-white -mt-[1px] -ml-[1px] opacity-0" />}
                    </span>
                    <span className={item.status === 'completed' ? 'font-bold' : 'text-slate-500'}>{item.label}</span>
                  </div>
                  {item.file && <span className="ml-2 text-xs text-slate-500 italic">Annexe jointe ({item.file.name})</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 pt-8 border-t border-slate-300 text-sm flex justify-between items-end pb-12">
        <div>Impression Automatisée - Plateforme JORT</div>
        <div className="text-right">
          Fait à Tunis, le {new Date().toLocaleDateString('fr-FR')} <br /><br />
          <span className="mt-6 inline-block font-semibold border-t border-black pt-1 w-48 text-center text-slate-400">Signature du Candidat</span>
        </div>
      </div>
    </div>
  );
};


// --- SIMULATEUR ---
const Simulateur = () => {
  const [pubs, setPubs] = useState(5);
  const [theses, setTheses] = useState(2);
  const [exp, setExp] = useState(3);

  const scorePubs = Math.min(pubs * 3.33, 50);
  const scoreTheses = Math.min(theses * 5, 25);
  const scoreExp = Math.min(exp * 2.5, 25);
  
  let totalScore = Math.round(scorePubs + scoreTheses + scoreExp);
  if (totalScore > 100) totalScore = 100;

  let resultClass = '';
  let barClass = '';
  let feedbackText = '';

  if (totalScore < 40) {
    resultClass = 'text-rose-500';
    barClass = 'bg-rose-500';
    feedbackText = "Dossier embryonnaire. Focalisez-vous massivement sur la publication en 1er auteur.";
  } else if (totalScore < 70) {
    resultClass = 'text-yellow-500';
    barClass = 'bg-yellow-500';
    feedbackText = "Dossier intermédiaire. Consolidez l'encadrement et variez les types de publications.";
  } else {
    resultClass = 'text-emerald-500';
    barClass = 'bg-emerald-500';
    feedbackText = "Dossier très compétitif ! Peaufinez la rédaction de votre polycopié et préparez l'oral.";
  }

  return (
    <section id="simulateur" className="scroll-mt-24 bg-blue-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden mt-16 mb-12">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 text-9xl opacity-10">⏱️</div>
      <div className="mb-8 relative z-10">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span>🧮</span> Simulateur Rapide de Potentiel
        </h2>
        <p className="mt-4 text-blue-200 max-w-3xl text-lg">Testez la solidité de votre dossier. Cet outil interactif fournit une estimation basique de votre préparation basée sur des métriques clés. Modifiez les valeurs pour voir l'impact immédiat sur votre "Score de Prêtitude".</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        <div className="space-y-6 bg-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Publications (1er/Dernier Auteur) - Indexées</label>
            <input type="range" min="0" max="30" value={pubs} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setPubs(parseInt(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0</span><span className="font-bold text-white text-base">{pubs} article{pubs > 1 ? 's' : ''}</span><span>30+</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Thèses/Mémoires Encadrés (Validés)</label>
            <input type="range" min="0" max="15" value={theses} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setTheses(parseInt(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0</span><span className="font-bold text-white text-base">{theses} thèse{theses > 1 ? 's' : ''}</span><span>15+</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Années d'Ancienneté (Post-Assistanat)</label>
            <input type="range" min="0" max="10" value={exp} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setExp(parseInt(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0</span><span className="font-bold text-white text-base">{exp} an{exp > 1 ? 's' : ''}</span><span>10+</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center bg-white p-8 rounded-2xl text-slate-800 text-center shadow-inner">
          <h4 className="text-sm uppercase tracking-wider font-semibold text-slate-500 mb-2">Indice de Compétitivité Estimé</h4>
          <div className={`text-6xl font-extrabold mb-4 ${resultClass}`}>{totalScore}%</div>
          <div className="w-full bg-slate-200 rounded-full h-4 mb-4 overflow-hidden">
            <div className={`${barClass} h-4 rounded-full transition-all duration-500`} style={{ width: `${totalScore}%` }}></div>
          </div>
          <p className="text-sm font-medium text-slate-600">{feedbackText}</p>
        </div>
      </div>
    </section>
  );
};

// --- PLAN D'ACTION ---
const PlanAction = () => {
  return (
    <section id="plan" className="scroll-mt-24 my-16">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center md:justify-start gap-2">
          <span>🗓️</span> Plan d'Action Stratégique
        </h2>
        <p className="mt-4 text-slate-600 max-w-4xl text-lg">Ne laissez rien au hasard. La préparation commence au minimum 2 ans avant la date prévue du concours. Voici une structure chronologique pour organiser votre progression, de la phase de renforcement du CV jusqu'au jour de l'épreuve orale.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="hover:-translate-y-1 hover:shadow-lg transition-all duration-300 bg-white p-6 rounded-2xl border border-slate-200 border-t-4 border-t-slate-400 relative">
          <div className="absolute -top-4 -right-4 bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-slate-500 shadow-sm">1</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">M-24 à M-12</h3>
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">L'Accumulation</h4>
          <ul className="text-sm text-slate-600 space-y-3">
            <li className="flex gap-2"><span>🎯</span> <span>Finaliser et soumettre les articles en attente (viser indexation stricte).</span></li>
            <li className="flex gap-2"><span>🎯</span> <span>Prendre en charge l'encadrement de 2 à 3 thèses urgentes.</span></li>
            <li className="flex gap-2"><span>🎯</span> <span>Multiplier les communications orales internationales.</span></li>
          </ul>
        </div>

        <div className="hover:-translate-y-1 hover:shadow-lg transition-all duration-300 bg-white p-6 rounded-2xl border border-slate-200 border-t-4 border-t-blue-400 relative">
          <div className="absolute -top-4 -right-4 bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-blue-600 shadow-sm">2</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">M-12 à M-6</h3>
          <h4 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4">Le Bilan & Tri</h4>
          <ul className="text-sm text-slate-600 space-y-3">
            <li className="flex gap-2"><span>📝</span> <span>Télécharger la dernière grille JORT et faire une auto-évaluation stricte.</span></li>
            <li className="flex gap-2"><span>📝</span> <span>Commencer la collecte de TOUS les justificatifs (attestations, tirés à part).</span></li>
            <li className="flex gap-2"><span>📝</span> <span>Structurer le plan du document "Titres et Travaux".</span></li>
          </ul>
        </div>

        <div className="hover:-translate-y-1 hover:shadow-lg transition-all duration-300 bg-white p-6 rounded-2xl border border-slate-200 border-t-4 border-t-indigo-500 relative">
          <div className="absolute -top-4 -right-4 bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600 shadow-sm">3</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">M-6 à M-2</h3>
          <h4 className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-4">La Rédaction</h4>
          <ul className="text-sm text-slate-600 space-y-3">
            <li className="flex gap-2"><span>✍️</span> <span>Rédiger le polycopié de T&T. Soigner la mise en page et la clarté.</span></li>
            <li className="flex gap-2"><span>✍️</span> <span>Rédiger les fiches synthétiques des travaux de recherche (impact clinique).</span></li>
            <li className="flex gap-2"><span>✍️</span> <span>Faire relire le dossier par un senior/maître de stage.</span></li>
          </ul>
        </div>

        <div className="hover:-translate-y-1 hover:shadow-lg transition-all duration-300 bg-white p-6 rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 relative">
          <div className="absolute -top-4 -right-4 bg-emerald-100 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-emerald-600 shadow-sm">4</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">M-2 à Jour J</h3>
          <h4 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-4">La Soutenance</h4>
          <ul className="text-sm text-slate-600 space-y-3">
            <li className="flex gap-2"><span>🎤</span> <span>Préparer la présentation orale (généralement 15-20 min).</span></li>
            <li className="flex gap-2"><span>🎤</span> <span>Organiser au moins 3 "concours blancs" avec un jury fictif (seniors).</span></li>
            <li className="flex gap-2"><span>🎤</span> <span>Anticiper les questions pièges sur la méthodologie de vos articles.</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
};

// --- RECOMMANDATIONS ---
const Recommandations = () => {
  return (
    <section id="conseils" className="scroll-mt-24 mb-24 mt-16">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center md:justify-start gap-2">
          <span>💡</span> Recommandations & Secrets du Jury
        </h2>
        <p className="mt-4 text-slate-600 max-w-4xl text-lg">Au-delà des chiffres, le jury évalue une personnalité, un parcours cohérent et une capacité à transmettre le savoir. Ces cartes interactives dévoilent les astuces qualitatives pour faire la différence lors de l'évaluation de votre dossier et de votre prestation orale.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100">
          <div className="text-3xl mb-4">🌟</div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Cohérence du Fil Conducteur</h3>
          <p className="text-slate-600 text-sm">Votre dossier ne doit pas être un empilement aléatoire. Lors de l'oral, montrez un "fil rouge" dans votre recherche (ex: focus sur une pathologie spécifique) qui justifie votre expertise.</p>
        </div>
        
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className="text-3xl mb-4">📖</div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Lisibilité du "Titres et Travaux"</h3>
          <p className="text-slate-600 text-sm">Les jurys lisent des dizaines de dossiers. Utilisez des tableaux récapitulatifs clairs au début de chaque section. Mettez en gras votre nom dans les listes bibliographiques.</p>
        </div>

        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
          <div className="text-3xl mb-4">🤝</div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Posture lors de l'Oral</h3>
          <p className="text-slate-600 text-sm">Le jury recrute un futur collègue, pas un étudiant. Restez humble, acceptez la critique scientifique de vos travaux avec élégance, et démontrez votre vision d'avenir pour votre spécialité.</p>
        </div>
        
        <div className="bg-rose-50 rounded-xl p-6 border border-rose-100">
          <div className="text-3xl mb-4">⚠️</div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Piège de l'Indexation</h3>
          <p className="text-slate-600 text-sm">Attention aux revues prédatrices. Le jury tunisien est de plus en plus intransigeant. Ne citez que les publications réellement indexées dans des bases reconnues (Pubmed, Web of Science, Scopus).</p>
        </div>

        <div className="bg-purple-50 rounded-xl p-6 border border-purple-100 md:col-span-2 text-center md:text-left md:flex items-center gap-6">
          <div className="text-5xl mb-4 md:mb-0">📑</div>
          <div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">La Preuve par l'Original</h3>
            <p className="text-slate-600 text-sm">Classez minutieusement vos tirés à part, attestations de communications et certificats d'encadrement dans des classeurs identifiés. Ne déclarez JAMAIS un travail "sous presse" sans la lettre d'acceptation officielle de l'éditeur.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- COMPOSANT PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialisation Database Supabase
  useEffect(() => {
    const initDB = async () => {
      try {
        const savedSession = localStorage.getItem('phu_user_session');
        if (savedSession) {
          const email = savedSession;
          setUser({ email: email, displayName: 'Dr. Sonia NAIJA' });
          await loadUserDossier(email);
        }
        setDbReady(true);
      } catch (err) {
        console.error("Erreur de chargement Supabase", err);
        setDbReady(true);
      }
    };
    initDB();
  }, []);

  const loadUserDossier = async (email) => {
    try {
      const { data: remoteData, error } = await supabase.from('dossiers').select('data').eq('email', email).single();
      if (remoteData && remoteData.data) {
        setData(remoteData.data);
      } else {
        setData(INITIAL_DATA);
        await supabase.from('dossiers').insert({ email, data: INITIAL_DATA });
      }
    } catch(err) {
      console.log('Mode Hors-ligne (ou Supabase non créé) utilisé temporairement');
      setData(INITIAL_DATA);
    }
  };

  const handleLogin = async (email) => {
    const newUser = { uid: Date.now().toString(), displayName: 'Dr. Sonia NAIJA', email: email };
    setUser(newUser);
    localStorage.setItem('phu_user_session', email);
    await loadUserDossier(email);
  };

  const handleLogout = async () => {
    localStorage.removeItem('phu_user_session');
    setUser(null);
    setData(null);
  };

  const saveToLocalDB = async (newData) => {
    setData(newData); // Optimistic Update UI
    if (user) {
      try {
        await supabase.from('dossiers').update({ data: newData }).eq('email', user.email);
      } catch (e) {
        console.error("Erreur sauvegarde Cloud", e);
      }
    }
  };

  // ACTIONS
  const handleUpdateStatus = (sectionId, itemId, newStatus) => {
    if (!data) return;
    const newData = {
      ...data,
      sections: data.sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, status: newStatus, date: new Date().toLocaleDateString('fr-FR') };
          })
        };
      })
    };
    saveToLocalDB(newData);
  };

  const handleFileUpload = (sectionId, itemId, file) => {
    if (!file) return;

    // Convert to Base64 to save in IndexedDB
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      const fileData = {
        name: file.name,
        size: Math.round(file.size / 1024) + ' KB',
        type: file.type,
        data: base64String // Le scan est persisté localement sans limite serveur (utile en mode local!)
      };

      if (!data) return;
      const newData = {
        ...data,
        sections: data.sections.map(section => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            items: section.items.map(item => {
              if (item.id !== itemId) return item;
              return { ...item, status: 'completed', file: fileData, date: new Date().toLocaleDateString('fr-FR') };
            })
          };
        })
      };
      saveToLocalDB(newData);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (sectionId, itemId) => {
    if (!data) return;
    if (window.confirm("Supprimer ce scan de la base de données locale ?")) {
      const newData = {
        ...data,
        sections: data.sections.map(section => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            items: section.items.map(item => {
              if (item.id !== itemId) return item;
              return { ...item, file: null, status: 'missing' };
            })
          };
        })
      };
      saveToLocalDB(newData);
    }
  };

  const handleAddItem = (sectionId, text) => {
    if (!data) return;
    const newData = {
      ...data,
      sections: data.sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: [...section.items, {
            id: Date.now(),
            label: text,
            status: 'missing',
            date: new Date().toLocaleDateString('fr-FR')
          }]
        };
      })
    };
    saveToLocalDB(newData);
  };

  const handleDeleteItem = (sectionId, itemId) => {
    if (!data) return;
    if (window.confirm("Supprimer définitivement cet élément de la grille ?")) {
      const newData = {
        ...data,
        sections: data.sections.map(section => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            items: section.items.filter(item => item.id !== itemId)
          };
        })
      };
      saveToLocalDB(newData);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const stats = useMemo(() => {
    if (!data) return { total: 0, completed: 0, inProgress: 0, missing: 0, progress: 0 };
    let total = 0, completed = 0, inProgress = 0, missing = 0;

    data.sections.forEach(section => {
      section.items.forEach(item => {
        total++;
        if (item.status === 'completed') completed++;
        if (item.status === 'in_progress') inProgress++;
        if (item.status === 'missing') missing++;
      });
    });

    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, missing, progress };
  }, [data]);

  if (!dbReady) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-900 animate-spin" /><p className="ml-3 font-semibold text-blue-900">Connexion Cloud / Supabase...</p></div>;
  if (!user || !data) return <AuthScreen onLoginSuccess={handleLogin} />;

  const activeSectionData = data.sections.find(s => s.id === activeSectionId);

  return (
    <>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 print:hidden pb-16">
        {/* HEADER */}
        <header className="bg-blue-950 text-white shadow-lg sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center gap-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveSectionId(null)}>
              <div className="bg-white/10 p-2 rounded-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <Award className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-wide">Dossier Candidature</h1>
                <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold mt-0.5">Professorat Médecine</p>
              </div>
            </div>

            {/* Menu Hamburger Bouton Mode Mobile */}
            <div className="lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-blue-900 rounded-lg text-white">
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {!activeSectionId && (
              <div className="hidden lg:flex items-center space-x-1">
                <a href="#grille" className="px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:text-white hover:bg-white/10 transition-all">Grille JORT</a>
                <a href="#simulateur" className="px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:text-white hover:bg-white/10 transition-all">Simulateur</a>
                <a href="#plan" className="px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:text-white hover:bg-white/10 transition-all">Plan d'Action</a>
                <a href="#conseils" className="px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:text-white hover:bg-white/10 transition-all">Recommandations</a>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-4">
              <button onClick={handlePrint} className="flex px-4 py-2 bg-indigo-700 text-white rounded-md text-sm font-bold hover:bg-indigo-600 items-center gap-2 shadow-sm transition-colors border border-indigo-500">
                <Printer className="w-4 h-4" />
                Dossier Officiel (PDF)
              </button>
              <div className="text-right ml-4 border-l border-blue-800 pl-4">
                <div className="text-sm font-bold text-white mb-0.5 flex items-center justify-end gap-2">
                  <UserCircle className="w-4 h-4 text-blue-300" />
                  {user.displayName}
                </div>
                <div className="flex items-center gap-2 justify-end text-xs text-blue-200">
                  <span className={`w-2 h-2 rounded-full ${stats.progress === 100 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}`}></span>
                  {stats.progress === 100 ? 'Complet' : 'En cours'}
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 ml-2 bg-blue-900 rounded-lg hover:bg-rose-900 border border-blue-800 hover:border-rose-800 transition-colors text-blue-200" title="Déconnecter et fermer le dossier local">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Menu Mobile Rétractable */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-blue-800 bg-blue-900 px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                 <a onClick={() => setIsMobileMenuOpen(false)} href="#grille" className="p-3 rounded-md bg-white/5 font-medium text-blue-100 hover:text-white hover:bg-white/10">Grille JORT</a>
                 <a onClick={() => setIsMobileMenuOpen(false)} href="#simulateur" className="p-3 rounded-md bg-white/5 font-medium text-blue-100 hover:text-white hover:bg-white/10">Simulateur</a>
                 <a onClick={() => setIsMobileMenuOpen(false)} href="#plan" className="p-3 rounded-md bg-white/5 font-medium text-blue-100 hover:text-white hover:bg-white/10">Plan d'Action</a>
                 <a onClick={() => setIsMobileMenuOpen(false)} href="#conseils" className="p-3 rounded-md bg-white/5 font-medium text-blue-100 hover:text-white hover:bg-white/10">Recommandations</a>
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-blue-800/50">
                 <button onClick={handlePrint} className="w-full flex justify-center px-4 py-3 bg-indigo-700 text-white rounded-md text-sm font-bold hover:bg-indigo-600 items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Télécharger PDF
                 </button>
                 <button onClick={handleLogout} className="w-full flex justify-center px-4 py-3 bg-rose-900 text-white rounded-md text-sm font-bold hover:bg-rose-800 items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                 </button>
              </div>
            </div>
          )}
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

          {activeSectionId ? (
            <SectionDetail
              section={activeSectionData}
              onBack={() => setActiveSectionId(null)}
              onUpdateStatus={handleUpdateStatus}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onFileUpload={handleFileUpload}
              onRemoveFile={handleRemoveFile}
            />
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">

              <CoachingEngine data={data} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* PROGRESSION */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-bl-full -mr-12 -mt-12 opacity-50"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Progression Globale</h2>
                        <p className="text-sm text-slate-500 mt-1">Avancement sur l'ensemble de la grille JORT</p>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl font-black text-blue-900">{stats.progress}%</span>
                      </div>
                    </div>
                    <ProgressBar progress={stats.progress} />
                    <div className="mt-4 flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span>{stats.completed} pièces validées et scannées</span>
                      <span>{stats.total - stats.completed} actions à mener</span>
                    </div>
                  </div>
                </div>

                {/* Database Indicator */}
                <Card className="p-6 flex flex-col justify-center border-l-4 border-l-blue-500 relative overflow-hidden bg-blue-50/30">
                  <div className="flex justify-between mb-4">
                    <span className="p-2 bg-blue-100 rounded-full text-blue-700">
                      <UploadCloud className="w-6 h-6" />
                    </span>
                    <span className="text-xs uppercase font-bold text-blue-700 tracking-wider">Cloud Sync</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Sauvegarde Cloud Supabase</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Vos avancées sont automatiquement synchronisées sur toutes vos plateformes (Supabase Cloud).
                  </p>
                </Card>
              </div>

              {/* SECTIONS JORT */}
              <section id="grille" className="scroll-mt-24">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-5 h-5 text-indigo-900" />
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide">Les 7 Composantes de l'Évaluation</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.sections.map((section) => {
                    const Icon = IconMap[section.iconName] || FileText;
                    const sectionTotal = section.items.length;
                    const sectionCompleted = section.items.filter(i => i.status === 'completed').length;
                    const sectionProgress = sectionTotal === 0 ? 0 : Math.round((sectionCompleted / sectionTotal) * 100);
                    const hasScans = section.items.some(i => i.file !== null);

                    return (
                      <Card key={section.id} className="flex flex-col h-full hover:shadow-lg transition-all duration-300 group cursor-pointer border-t-4 transform hover:-translate-y-1" style={{ borderTopColor: section.borderColor.replace('border-l-', '').replace('text-', '') }} onClick={() => setActiveSectionId(section.id)}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white relative overflow-hidden">
                          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-slate-50 to-transparent"></div>
                          <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 bg-slate-50 rounded-[10px] shadow-inner border border-slate-100 ${section.color}`}>
                              <Icon className="w-6 h-6 stroke-[1.5]" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm xl:text-base leading-tight pr-4">{section.title}</h4>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-center bg-slate-50/30">
                          <p className="text-xs text-slate-500 font-medium mb-4 italic">{section.subtitle}</p>

                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Complétion</span>
                            <span className="text-sm font-black text-slate-800">{sectionProgress}%</span>
                          </div>
                          <ProgressBar progress={sectionProgress} />

                          <div className="flex justify-between items-center mt-5">
                            <div className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                              {sectionCompleted} / {sectionTotal} validés
                            </div>
                            {hasScans && (
                              <div className="flex items-center text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                <FileText className="w-3 h-3 mr-1" /> Scans inclus
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-auto p-4 bg-white border-t border-slate-100 group-hover:bg-indigo-900 transition-colors duration-300">
                          <button
                            className="text-sm font-bold text-indigo-700 group-hover:text-white flex items-center justify-center gap-2 w-full transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSectionId(section.id);
                            }}
                          >
                            Éditer et Attacher des preuves
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>

              <Simulateur />
              <PlanAction />
              <Recommandations />

            </div>
          )}
        </main>
      </div>

      <ReportView data={data} user={user} />
    </>
  );
}
