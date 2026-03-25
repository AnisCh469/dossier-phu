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
    note_finale_estimee: 0
  },
  sections: [
    {
      id: 'anciennete',
      title: 'I. Ancienneté dans le grade',
      subtitle: 'Coefficient: 1 (8 pts / 4 ans)',
      iconName: 'Clock',
      color: 'text-slate-800',
      borderColor: 'border-l-slate-800',
      categories: [
        { id: 'anc_base', label: 'Ancienneté de base (4 ans révolus)', maxPoints: 8, color: 'bg-slate-600' },
        { id: 'anc_sup', label: 'Années supplémentaires', maxPoints: 12, color: 'bg-slate-400' },
      ],
      items: [
        { id: 1001, label: "Attestation d'exercice effectif (4 ans minimum)", status: "missing", date: null, file: null, required: true, category: 'anc_base' },
        { id: 1002, label: "Années supplémentaires (attestations additionnelles)", status: "missing", date: null, file: null, category: 'anc_sup' },
      ]
    },
    {
      id: 'titres_travaux',
      title: 'II. Titres, Travaux et Publications',
      subtitle: 'Coefficient: 1 (Publications 14 pts, Comms 6 pts)',
      iconName: 'BookOpen',
      color: 'text-blue-900',
      borderColor: 'border-l-blue-900',
      categories: [
        { id: 'pub', label: 'Publications Scientifiques',    maxPoints: 14, color: 'bg-blue-700' },
        { id: 'comm', label: 'Communications (quanti + quali)', maxPoints: 6,  color: 'bg-blue-400' },
        { id: 'ethique', label: 'Éthique et Prérequis',      maxPoints: null, color: 'bg-rose-500' },
      ],
      items: [
        { id: 2000, label: "Doctorat en Médecine (Texte intégral)",                         status: "missing", date: null, file: null, required: true, category: 'ethique' },
        { id: 2001, label: "Publications Scientifiques Indexées — avec IF et Scopus (Q1/Q2)", status: "missing", date: null, file: null, required: true, category: 'pub' },
        { id: 2002, label: "Communications Quantitatives (3 pts) — max 15/an",               status: "missing", date: null, file: null, category: 'comm' },
        { id: 2003, label: "Communications Qualitatives (3 pts) — 10 comms sélectionnées",  status: "missing", date: null, file: null, required: true, category: 'comm' },
        { id: 2004, label: "Fiches d'auto-analyse des 10 communications sélectionnées",      status: "missing", date: null, file: null, required: true, category: 'comm' },
        { id: 2005, label: "Preuve soumission et approbation Comité d'Éthique",             status: "missing", date: null, file: null, required: true, category: 'ethique' },
      ]
    },
    {
      id: 'pedagogie',
      title: 'III. Activités Pédagogiques',
      subtitle: 'Coefficient: 1',
      iconName: 'Users',
      color: 'text-teal-800',
      borderColor: 'border-l-teal-800',
      categories: [
        { id: 'docs', label: 'Documents pédagogiques',             maxPoints: null, color: 'bg-teal-600' },
        { id: 'encadrement', label: 'Encadrement (Thèses/Mémoires)', maxPoints: null, color: 'bg-teal-400' },
        { id: 'seminaires', label: 'Séminaires et Enseignement',    maxPoints: null, color: 'bg-teal-300' },
      ],
      items: [
        { id: 3001, label: "Productions de documents pédagogiques validés par la faculté", status: "missing", date: null, file: null, category: 'docs' },
        { id: 3002, label: "Attestation Direction Thèse de Médecine ou Mémoire",           status: "missing", date: null, file: null, category: 'encadrement' },
        { id: 3003, label: "Séminaires pédagogiques (participation, production, animation)", status: "missing", date: null, file: null, category: 'seminaires' },
        { id: 3004, label: "Enseignement universitaire (attesté par la faculté)",           status: "missing", date: null, file: null, required: true, category: 'seminaires' },
        { id: 3005, label: "Enseignement post-universitaire et conférences",                status: "missing", date: null, file: null, category: 'seminaires' },
      ]
    },
    {
      id: 'responsabilites',
      title: 'IV. Responsabilités Universitaires et Hospitalières',
      subtitle: 'Coefficient: 1 (Univ. sur 10, Rech. sur 6, Admin. sur 4)',
      iconName: 'Award',
      color: 'text-purple-800',
      borderColor: 'border-l-purple-800',
      categories: [
        { id: 'univ',  label: 'Responsabilités Universitaires', maxPoints: 10, color: 'bg-purple-700' },
        { id: 'rech',  label: 'Responsabilités de Recherche',   maxPoints: 6,  color: 'bg-purple-500' },
        { id: 'admin', label: 'Responsabilités Administratives', maxPoints: 4,  color: 'bg-purple-300' },
      ],
      items: [
        { id: 4001, label: "Responsabilités universitaires (Doyen, Dir. Études, etc.)",    status: "missing", date: null, file: null, category: 'univ' },
        { id: 4002, label: "Responsabilités de Recherche (Dir. Laboratoire, Unité)",       status: "missing", date: null, file: null, category: 'rech' },
        { id: 4003, label: "Responsabilités Administratives (Chef de service, etc.)",      status: "missing", date: null, file: null, category: 'admin' },
        { id: 4004, label: "Attestation d'exercice administratif (1 an minimum)",          status: "missing", date: null, file: null, required: true, category: 'admin' },
      ]
    },
    {
      id: 'epreuves',
      title: 'V. Épreuves JORT et Dossier Administratif',
      subtitle: 'Coefficient Pédagogique/Pratique et Documents',
      iconName: 'BrainCircuit',
      color: 'text-rose-800',
      borderColor: 'border-l-rose-800',
      categories: [
        { id: 'epreuves_oral', label: 'Épreuves Orales / Pratiques', maxPoints: null, color: 'bg-rose-600' },
        { id: 'admin_doc',    label: 'Documents Administratifs',     maxPoints: null, color: 'bg-rose-400' },
      ],
      items: [
        { id: 5001, label: "Préparation Présentation Pédagogique (Slides / Abstract)", status: "missing", date: null, file: null, category: 'epreuves_oral' },
        { id: 5002, label: "Préparation Épreuve Pratique (Cas clinique / Patient)",    status: "missing", date: null, file: null, category: 'epreuves_oral' },
        { id: 7001, label: "Notice Individuelle (Note de synthèse)",                   status: "missing", date: null, file: null, required: true, category: 'admin_doc' },
        { id: 7002, label: "Rapport anti-plagiat des publications",                    status: "missing", date: null, file: null, required: true, category: 'admin_doc' },
        { id: 7003, label: "2 Copies papier (Format A4, Reliure dos carré collé)",    status: "missing", date: null, file: null, required: true, category: 'admin_doc' },
        { id: 7004, label: "8 Copies numériques (Clés USB en PDF structuré)",         status: "missing", date: null, file: null, required: true, category: 'admin_doc' },
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
  MapPin: MapPin,
  Clock: Clock
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
    const adminSection = data.sections.find(s => s.id === 'epreuves');
    const adminMissing = adminSection?.items.some(i => i.id > 7000 && i.status !== 'completed');
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
  const [newItemCategory, setNewItemCategory] = useState(section.categories?.[0]?.id || '');
  const [uploadingId, setUploadingId] = useState(null);
  const Icon = IconMap[section.iconName] || FileText;

  const categories = section.categories || [];
  const hasCats = categories.length > 0;

  // Group items by category
  const grouped = hasCats
    ? categories.map(cat => ({
        cat,
        items: section.items.filter(i => i.category === cat.id)
      }))
    : [{ cat: null, items: section.items }];

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItemText.trim()) {
      onAddItem(section.id, newItemText, newItemCategory || null);
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
    setTimeout(() => {
      onFileUpload(section.id, itemId, file);
      setUploadingId(null);
    }, 1500);
  };

  const ItemRow = ({ item }) => (
    <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors group gap-4 border-b border-slate-100 last:border-0">
      <div className="flex items-start md:items-center gap-4 flex-1 pr-4">
        <button
          onClick={() => onUpdateStatus(section.id, item.id, nextStatus(item.status))}
          className="focus:outline-none transform active:scale-95 transition-transform shrink-0 mt-1 md:mt-0"
        >
          <Badge status={item.status} />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${item.status === 'completed' ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
              {item.label}
            </span>
            {item.required && <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Requis</span>}
          </div>
          {item.date && (
            <span className="text-xs text-slate-400 mt-1">Validé le {item.date}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        {!item.file ? (
          <label className={`cursor-pointer p-2 border rounded-md transition-colors flex items-center gap-2 text-xs font-semibold whitespace-nowrap shadow-sm ${uploadingId === item.id ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-wait' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
            {uploadingId === item.id ? (
              <><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /><span>Envoi...</span></>
            ) : (
              <><UploadCloud className="w-4 h-4" /><span>Joindre scan (PDF/Img)</span></>
            )}
            <input type="file" className="hidden" disabled={uploadingId === item.id} onChange={(e) => handleLocalUpload(item.id, e)} accept=".pdf,image/*" />
          </label>
        ) : (
          <div className="flex items-center bg-slate-100 rounded-md border border-slate-200 px-3 py-1.5 gap-2 max-w-[200px] shadow-sm">
            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
            <a
              href={item.file.data}
              download={item.file.name.includes('.') ? item.file.name : `${item.file.name}.${item.file.type ? item.file.type.split('/')[1] : 'pdf'}`}
              className="text-xs text-blue-700 font-medium truncate cursor-pointer hover:underline hover:text-blue-900"
              title="Cliquer pour télécharger"
            >{item.file.name}</a>
            <button onClick={() => onRemoveFile(section.id, item.id)} className="p-1 ml-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button onClick={() => onDeleteItem(section.id, item.id)} className="p-2 ml-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors bg-white border border-slate-200 shadow-sm">
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

      {/* Score par catégorie (si section a des catégories avec maxPoints) */}
      {hasCats && categories.some(c => c.maxPoints) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
          {categories.filter(c => c.maxPoints).map(cat => {
            const catItems = section.items.filter(i => i.category === cat.id);
            const done = catItems.filter(i => i.status === 'completed').length;
            const pct = catItems.length === 0 ? 0 : Math.round((done / catItems.length) * 100);
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-600 leading-tight">{cat.label}</span>
                  <span className="text-xs font-black text-slate-800 whitespace-nowrap ml-2">Max {cat.maxPoints} pts</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                  <div className={`${cat.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>{done} / {catItems.length} éléments validés</span>
                  <span>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Items groupés par catégorie */}
      <div className="space-y-4">
        {grouped.map(({ cat, items }) => (
          <Card key={cat?.id || 'default'} className="overflow-hidden">
            {cat && (
              <div className={`px-4 py-2.5 flex items-center justify-between border-b border-slate-100`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cat.color}`}></div>
                  <span className="text-sm font-bold text-slate-700">{cat.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {cat.maxPoints && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      Max {cat.maxPoints} pts
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{items.filter(i => i.status === 'completed').length}/{items.length} validés</span>
                </div>
              </div>
            )}
            <div className="divide-y divide-slate-50">
              {items.length === 0 && (
                <p className="px-4 py-3 text-xs text-slate-400 italic">Aucun élément dans cette catégorie.</p>
              )}
              {items.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          </Card>
        ))}
      </div>

      {/* Formulaire d'ajout */}
      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
        <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2">
          {hasCats && (
            <select
              value={newItemCategory}
              onChange={e => setNewItemCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-white text-slate-700 font-medium sm:w-64 shrink-0"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Ajouter un élément personnalisé..."
            className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </form>
      </div>
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
  const [exp, setExp] = useState(4);
  const [pubsPoints, setPubsPoints] = useState(7);
  const [commsPoints, setCommsPoints] = useState(3);
  const [pedagoPoints, setPedagoPoints] = useState(10);
  const [respPoints, setRespPoints] = useState(10);

  // Ancienneté (8 pts pour 4 ans, +2 pts par an sup. max 20)
  const scoreS1 = exp >= 4 ? Math.min(8 + (exp - 4) * 2, 20) : exp * 2;
  // Recherche (Pubs / 14 + Comms / 6)
  const scoreS2 = pubsPoints + commsPoints;
  // Pédagogie (/20)
  const scoreS3 = pedagoPoints;
  // Responsabilités (/20)
  const scoreS4 = respPoints;
  
  const scoreTotalBrut = scoreS1 + scoreS2 + scoreS3 + scoreS4; // /80
  const totalScorePercent = Math.round((scoreTotalBrut / 80) * 100);

  let resultClass = '';
  let barClass = '';
  let feedbackText = '';

  if (totalScorePercent < 50) {
    resultClass = 'text-rose-500';
    barClass = 'bg-rose-500';
    feedbackText = "Dossier préliminaire. Consolidez l'ancienneté et visez des publications Q1 à fort impact factor.";
  } else if (totalScorePercent < 75) {
    resultClass = 'text-yellow-500';
    barClass = 'bg-yellow-500';
    feedbackText = "Dossier sérieux. Maximisez la composante 'qualitative' des communications et variez vos implications pédagogiques.";
  } else {
    resultClass = 'text-emerald-500';
    barClass = 'bg-emerald-500';
    feedbackText = "Excellent JORT ! Votre total par rubriques est optimal. Structurez vos 10 fiches d'auto-analyse sereinement.";
  }

  return (
    <section id="simulateur" className="scroll-mt-24 bg-blue-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden mt-16 mb-12">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 text-9xl opacity-10">⏱️</div>
      <div className="mb-8 relative z-10">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span>🧮</span> Simulateur Rapide JORT 2021
        </h2>
        <p className="mt-4 text-blue-200 max-w-3xl text-lg">Testez la solidité de votre dossier selon la grille officielle détaillée. (Coefficients = 1 pour les 4 grandes mentions).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        <div className="space-y-6 bg-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">I - Ancienneté dans le grade (8 pts / 4 ans)</label>
            <input type="range" min="0" max="10" value={exp} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setExp(parseInt(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0 an</span><span className="font-bold text-white text-base">{exp} an{exp > 1 ? 's' : ''} ({scoreS1}/20)</span><span>10+ ans</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">II - Publications (Qualité Scopus / IF) - Max 14 pts</label>
            <input type="range" step="0.5" min="0" max="14" value={pubsPoints} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setPubsPoints(parseFloat(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0 pt</span><span className="font-bold text-white text-base">{pubsPoints}/14 pts</span><span>14 pts</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">II - Communications (Quanti + Quali) - Max 6 pts</label>
            <input type="range" step="0.5" min="0" max="6" value={commsPoints} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setCommsPoints(parseFloat(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0 pt</span><span className="font-bold text-white text-base">{commsPoints}/6 pts</span><span>6 pts</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">III - Activités Pédagogiques (Documents, Séminaires...)</label>
            <input type="range" min="0" max="20" value={pedagoPoints} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setPedagoPoints(parseInt(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0</span><span className="font-bold text-white text-base">{pedagoPoints}/20 pts</span><span>20 pts</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">IV - Responsabilités (Doyen, Labo, etc.)</label>
            <input type="range" min="0" max="20" value={respPoints} className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer" onChange={(e) => setRespPoints(parseInt(e.target.value))} />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>0</span><span className="font-bold text-white text-base">{respPoints}/20 pts</span><span>20 pts</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center bg-white p-8 rounded-2xl text-slate-800 text-center shadow-inner">
          <h4 className="text-sm uppercase tracking-wider font-semibold text-slate-500 mb-2">Score Estimé JORT</h4>
          <div className={`text-6xl font-extrabold mb-2 ${resultClass}`}>{totalScorePercent}%</div>
          <div className="text-xl font-bold text-slate-400 mb-4">soit {scoreTotalBrut} / 80 points</div>
          <div className="w-full bg-slate-200 rounded-full h-4 mb-4 overflow-hidden">
            <div className={`${barClass} h-4 rounded-full transition-all duration-500`} style={{ width: `${totalScorePercent}%` }}></div>
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

  // Migrates old saved data to include new fields (categories, item.category)
  const migrateData = (saved) => {
    const migrated = { ...saved };
    migrated.sections = saved.sections.map(savedSection => {
      const template = INITIAL_DATA.sections.find(s => s.id === savedSection.id);
      if (!template) return savedSection;
      // Inject categories from template if missing
      const withCats = savedSection.categories ? savedSection : { ...savedSection, categories: template.categories };
      // Inject category per item from template if missing
      const withItemCats = {
        ...withCats,
        items: withCats.items.map(item => {
          if (item.category) return item;
          const tItem = template.items.find(ti => ti.id === item.id);
          return tItem ? { ...item, category: tItem.category } : item;
        })
      };
      return withItemCats;
    });
    return migrated;
  };

  const loadUserDossier = async (email) => {
    try {
      const { data: remoteData, error } = await supabase.from('dossiers').select('data').eq('email', email).single();
      if (remoteData && remoteData.data) {
        setData(migrateData(remoteData.data));
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

  const handleAddItem = (sectionId, text, category) => {
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
            date: new Date().toLocaleDateString('fr-FR'),
            category: category || null,
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
