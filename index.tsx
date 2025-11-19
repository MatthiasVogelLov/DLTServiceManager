
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Factory, 
  Cpu, 
  Wrench, 
  ArrowLeft, 
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Calendar,
  ShoppingCart,
  Camera,
  Edit2,
  Save,
  X,
  Image as ImageIcon,
  Box,
  FileText,
  Printer,
  Upload,
  Paperclip,
  LogOut,
  GripVertical,
  CalendarDays,
  Briefcase,
  Trash2,
  UserPlus,
  Shield,
  Database,
  ChevronLeft,
  Filter,
  Truck,
  Package,
  Search,
  User,
  BarChart3,
  PieChart,
  History,
  Link as LinkIcon,
  ArrowRight,
  Undo2,
  CheckSquare,
  Bell,
  AlertCircle,
  ClipboardCheck,
  PenTool,
  Navigation,
  Map,
  Menu
} from 'lucide-react';

// --- Types & Interfaces ---

type EntityType = 'customer' | 'station' | 'sub_station' | 'assembly' | 'machine' | 'component' | 'part';
type ServiceSize = 'S' | 'M' | 'L';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'img' | 'doc';
  date: string;
}

interface Entity {
  id: string;
  parentId?: string; 
  type: EntityType;
  name: string;
  description?: string;
  images?: string[];
  documents?: Document[];
  customerNumber?: string; 
  
  details?: {
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    operatingHours?: number;
    nextServiceHours?: number;
    lastServiceDate?: string;
    nextServiceDate?: string;
    status?: 'ok' | 'warning' | 'critical';
    articleNumber?: string;
    quantity?: number;
    serviceSize?: ServiceSize; // S, M, L
  };
}

interface Technician {
  id: string;
  name: string;
  role: string;
  location: string;
  avatarColor: string;
  avatarUrl?: string; 
  maxHours: number;
  workDayStart: number;
  workDayEnd: number;
}

interface Assignment {
  id: string;
  entityId: string; // Can be entity ID or package ID
  isPackage?: boolean;
  customName?: string;
  technicianId: string;
  date: string;
  duration: number; // in hours
  startTime?: number; // Hour of day (e.g. 8.5 for 08:30)
  status: 'planned' | 'completed';
}

interface ServiceConfig {
  s: number;
  m: number;
  l: number;
}

interface WorkPackage {
  id: string;
  name: string;
  duration: number;
}

interface AuditLog {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'reminder' | 'planning' | 'info' | 'warning';
  date?: string;
  relatedId?: string;
}

// --- Protocol / Checklist Types ---
type FieldType = 'text' | 'number' | 'checkbox' | 'select' | 'signature' | 'header';

interface ProtocolField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; // for select
  value?: any;
  required?: boolean;
}

interface ProtocolSection {
  id: string;
  title: string;
  fields: ProtocolField[];
}

// --- Helper Functions ---

const getMonday = (d: Date) => {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(d.setDate(diff));
}

const addWeeks = (d: Date, weeks: number) => {
  const newDate = new Date(d);
  newDate.setDate(newDate.getDate() + (weeks * 7));
  return newDate;
}

const getKw = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// German Holidays Calculation
const getGermanHolidays = (year: number) => {
  const holidays: Record<string, string> = {};
  
  // Fixed
  holidays[`${year}-01-01`] = 'Neujahr';
  holidays[`${year}-05-01`] = 'Tag der Arbeit';
  holidays[`${year}-10-03`] = 'Tag der Deutschen Einheit';
  holidays[`${year}-12-25`] = '1. Weihnachtstag';
  holidays[`${year}-12-26`] = '2. Weihnachtstag';

  // Easter Calculation (Gauss)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  
  let month = Math.floor((h + l - 7 * m + 114) / 31);
  let day = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(year, month - 1, day);
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Easter dependent
  const karfreitag = new Date(easterDate); karfreitag.setDate(easterDate.getDate() - 2);
  const ostermontag = new Date(easterDate); ostermontag.setDate(easterDate.getDate() + 1);
  const himmelfahrt = new Date(easterDate); himmelfahrt.setDate(easterDate.getDate() + 39);
  const pfingstmontag = new Date(easterDate); pfingstmontag.setDate(easterDate.getDate() + 50);

  holidays[formatDate(karfreitag)] = 'Karfreitag';
  holidays[formatDate(ostermontag)] = 'Ostermontag';
  holidays[formatDate(himmelfahrt)] = 'Christi Himmelfahrt';
  holidays[formatDate(pfingstmontag)] = 'Pfingstmontag';

  return holidays;
};

const generateMockData = (): Entity[] => {
  const customers = [];
  const firstNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'];
  const industries = ['Automotive', 'Chemie', 'Lebensmittel', 'Logistik', 'Pharma', 'Papier', 'Metall', 'Kunststoff', 'Energie', 'Bau'];

  for (let i = 0; i < 15; i++) {
    const custId = `cust_${i}`;
    customers.push({
      id: custId,
      type: 'customer' as EntityType,
      name: `${firstNames[i % 10]} ${industries[i % 10]} GmbH`,
      customerNumber: `KD-${10000 + i}`,
      description: `Kunde im Bereich ${industries[i % 10]}`,
      images: []
    });

    // Station
    const stationId = `stat_${i}`;
    customers.push({
      id: stationId,
      parentId: custId,
      type: 'station' as EntityType,
      name: `Werk ${i + 1}`,
      description: 'Hauptstandort',
    });

    // Machine
    const machId = `mach_${i}`;
    const hours = Math.floor(Math.random() * 5000);
    
    // FORCE Planned Stock:
    const isUrgent = i < 8; // First 8 machines are urgent
    const today = new Date();
    const nextDate = new Date(today);
    
    if (isUrgent) {
      // Due between yesterday and in 3 days
      nextDate.setDate(today.getDate() + (Math.floor(Math.random() * 5) - 1));
    } else {
      // Due later
      nextDate.setDate(today.getDate() + 30 + Math.floor(Math.random() * 60));
    }
    
    customers.push({
      id: machId,
      parentId: stationId,
      type: 'machine' as EntityType,
      name: `Kompressor X-${i}00`,
      details: {
        manufacturer: 'CompAir',
        model: `L${i}0`,
        operatingHours: hours,
        nextServiceHours: hours + 200,
        nextServiceDate: nextDate.toISOString().split('T')[0],
        status: isUrgent ? 'warning' : 'ok',
        serviceSize: Math.random() > 0.7 ? 'L' : 'M'
      }
    });
    
    // Component
    customers.push({
      id: `comp_${i}`,
      parentId: machId,
      type: 'component' as EntityType,
      name: 'Ölabscheider',
      description: 'Standard'
    });
    
    // Part
    customers.push({
      id: `part_${i}`,
      parentId: `comp_${i}`,
      type: 'part' as EntityType,
      name: 'Dichtungssatz',
      details: { articleNumber: `DS-${i}99`, quantity: 1 }
    });
  }
  return customers;
};

const generateMockAssignments = (entities: Entity[], techs: Technician[]): Assignment[] => {
  const assignments: Assignment[] = [];
  const machines = entities.filter(e => e.type === 'machine');
  const today = new Date();
  
  // Past assignments (for reports)
  for (let i = 0; i < 25; i++) {
    const tech = techs[Math.floor(Math.random() * techs.length)];
    const machine = machines[Math.floor(Math.random() * machines.length)];
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
    
    if (machine) {
      assignments.push({
        id: `past_${i}`,
        entityId: machine.id,
        technicianId: tech.id,
        date: date.toISOString().split('T')[0],
        duration: Math.floor(Math.random() * 4) + 2,
        startTime: tech.workDayStart + Math.floor(Math.random() * 2),
        status: 'completed'
      });
    }
  }

  // Future assignments - But leave some machines free for the "Planning Stock"
  // Only assign about 30% of machines to future dates
  for (let i = 0; i < 5; i++) {
    const tech = techs[Math.floor(Math.random() * techs.length)];
    const machine = machines[machines.length - 1 - i]; // Use last few machines
    const date = new Date(today);
    date.setDate(date.getDate() + Math.floor(Math.random() * 5) + 1); // Next week

    if (machine) {
      assignments.push({
        id: `future_${i}`,
        entityId: machine.id,
        technicianId: tech.id,
        date: date.toISOString().split('T')[0],
        duration: Math.floor(Math.random() * 4) + 2,
        startTime: tech.workDayStart + Math.floor(Math.random() * 2),
        status: 'planned'
      });
    }
  }

  return assignments;
}

const generateAuditLogs = (): AuditLog[] => {
  return [
    { id: 'l1', user: 'Max Mustermann', action: 'Statusänderung', details: 'Kompressor GA 37 auf "Wartung" gesetzt', timestamp: '2023-10-24 09:15' },
    { id: 'l2', user: 'Julia Service', action: 'Dokument Upload', details: 'Wartungsprotokoll.pdf hochgeladen', timestamp: '2023-10-24 11:30' },
    { id: 'l3', user: 'Admin', action: 'Techniker angelegt', details: 'Neuer Techniker: Tom Bross', timestamp: '2023-10-23 14:00' },
    { id: 'l4', user: 'Max Mustermann', action: 'Termin verschoben', details: 'Wartung KD-10004 auf 27.10. verschoben', timestamp: '2023-10-23 16:45' },
    { id: 'l5', user: 'System', action: 'Backup', details: 'Tägliches Backup erfolgreich', timestamp: '2023-10-23 23:00' },
  ];
};

const initialData: Entity[] = [
  { id: 'c1', type: 'customer', customerNumber: 'KD-10001', name: 'Müller Produktionstechnik GmbH', description: 'Hauptkunde Automotive', images: [], documents: [{id: 'd1', name: 'Rahmenvertrag.pdf', type: 'pdf', date: '2023-01-01'}] },
  { id: 's1', parentId: 'c1', type: 'station', name: 'Werk Berlin', description: 'Hauptfertigung', images: [] },
  { id: 'ss1', parentId: 's1', type: 'sub_station', name: 'Halle 3 (Spritzguss)', description: 'Nordflügel', images: [] },
  { id: 'bg1', parentId: 'ss1', type: 'assembly', name: 'Druckluftversorgung Linie A', description: 'Versorgt Spritzgussmaschinen 1-4', images: [] },
  { 
    id: 'm1', parentId: 'bg1', type: 'machine', name: 'Schraubenkompressor GA 37', 
    description: 'Hauptkompressor',
    images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=300&h=200'],
    documents: [
      {id: 'd2', name: 'Handbuch_GA37.pdf', type: 'pdf', date: '2022-05-10'},
      {id: 'd3', name: 'Wartungsprotokoll_2023.pdf', type: 'pdf', date: '2023-05-10'}
    ],
    details: { 
      manufacturer: 'Atlas Copco', 
      model: 'GA 37', 
      serialNumber: 'APP-88221', 
      operatingHours: 1950, 
      nextServiceHours: 2000, 
      lastServiceDate: '2023-05-10',
      nextServiceDate: new Date().toISOString().split('T')[0], // Due TODAY
      status: 'warning',
      serviceSize: 'M'
    } 
  },
  { id: 'cmp1', parentId: 'm1', type: 'component', name: 'Filtereinheit', description: 'Ansaugbereich', images: [] },
  { id: 'art1', parentId: 'cmp1', type: 'part', name: 'Luftfiltereinsatz C1140', details: { articleNumber: 'LF-992', manufacturer: 'Mann+Hummel', quantity: 1 } },
  { id: 'art2', parentId: 'cmp1', type: 'part', name: 'O-Ring Dichtung', details: { articleNumber: 'OR-55', quantity: 2 } },
  { id: 'm2', parentId: 'bg1', type: 'machine', name: 'Kältetrockner TE 141', details: { status: 'ok', manufacturer: 'Kaeser', nextServiceDate: '2024-02-01', serviceSize: 'S' } },
  { id: 'c2', type: 'customer', customerNumber: 'KD-10002', name: 'Bäckerei Schmidt', description: 'Filialnetz Nord', details: { status: 'critical' } },
  { id: 's2', parentId: 'c2', type: 'station', name: 'Filiale Hamburg Mitte', description: 'Backstube', details: { nextServiceDate: '2023-10-28' } },
  { id: 'm3', parentId: 's2', type: 'machine', name: 'Teigteilmaschine Hydr.', description: 'Linie 1', details: { status: 'critical', nextServiceDate: '2023-10-25', manufacturer: 'Diosna', serviceSize: 'L' } },
  { id: 'cmp2', parentId: 'm3', type: 'component', name: 'Hydraulikaggregat', description: 'Druckaufbau' },
  { id: 'art3', parentId: 'cmp2', type: 'part', name: 'Hydraulikfilter H-200', details: { articleNumber: 'HF-200', quantity: 1 } },
];

const initialTechnicians: Technician[] = [
  { id: 't1', name: 'Max Mustermann', role: 'Meister', location: 'Berlin', avatarColor: 'bg-blue-500', maxHours: 8, workDayStart: 8, workDayEnd: 17, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 't2', name: 'Julia Service', role: 'Elektrik', location: 'Hamburg', avatarColor: 'bg-emerald-500', maxHours: 8, workDayStart: 8, workDayEnd: 16, avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 't3', name: 'Klaus Montage', role: 'Mechanik', location: 'Berlin', avatarColor: 'bg-orange-500', maxHours: 8, workDayStart: 7, workDayEnd: 16 },
  { id: 't4', name: 'Ahmet Yilmaz', role: 'Hydraulik', location: 'München', avatarColor: 'bg-purple-500', maxHours: 8, workDayStart: 9, workDayEnd: 18, avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 't5', name: 'Sarah Weber', role: 'Azubi', location: 'Hamburg', avatarColor: 'bg-pink-500', maxHours: 6, workDayStart: 8, workDayEnd: 14 },
  { id: 't6', name: 'Tom Bross', role: 'Meister', location: 'München', avatarColor: 'bg-indigo-500', maxHours: 8, workDayStart: 10, workDayEnd: 19 },
];

const initialPackages: WorkPackage[] = [
  { id: 'pkg_1', name: 'Anfahrt (Pauschale)', duration: 1 },
  { id: 'pkg_2', name: 'Abfahrt / Rüstzeit', duration: 0.5 },
  { id: 'pkg_3', name: 'Nacharbeit / Doku', duration: 0.5 },
  { id: 'pkg_4', name: 'Hotelübernachtung', duration: 0 },
];

// Template for the Maintenance Protocol (based on PDF screenshots)
const maintenanceProtocolTemplate: ProtocolSection[] = [
  {
    id: 's_header',
    title: 'Stammdaten',
    fields: [
      { id: 'customer', label: 'Kunde', type: 'select', options: ['Müller Produktionstechnik', 'Bäckerei Schmidt'], required: true },
      { id: 'machine', label: 'Maschine/Kompressor', type: 'text', value: 'Kompressor X-100', required: true }
    ]
  },
  {
    id: 's_10',
    title: '10 Druckluft-Öl-Separator-Kit',
    fields: [
      { id: 'f_10_art', label: 'Artikelnummer wählen', type: 'select', options: ['Kit-A (Standard)', 'Kit-B (Premium)'] },
      { id: 'f_10_qty', label: 'Anzahl / Menge', type: 'number' },
      { id: 'f_10_opt', label: 'Altteile vorgelegt?', type: 'checkbox' }
    ]
  },
  {
    id: 's_11',
    title: '11 Luftansaugfilterpatrone',
    fields: [
      { id: 'f_11_art', label: 'Artikelnummer wählen', type: 'select', options: ['LF-992', 'LF-100'] },
      { id: 'f_11_qty', label: 'Anzahl / Menge', type: 'number' }
    ]
  },
  {
    id: 's_12',
    title: '12 Ölfilter-Kit',
    fields: [
      { id: 'f_12_art', label: 'Artikelnummer wählen', type: 'select', options: ['OF-200', 'OF-X'] },
      { id: 'f_12_qty', label: 'Anzahl / Menge', type: 'number' }
    ]
  },
  {
    id: 's_13',
    title: '13 Ölfüllung für Kompressor',
    fields: [
      { id: 'f_13_art', label: 'Ölsorte wählen', type: 'select', options: ['Standard Mineral', 'Synthetik Hochleist.'] },
      { id: 'f_13_qty', label: 'Menge (Liter)', type: 'number' }
    ]
  },
  {
    id: 's_100',
    title: 'Messwerte & Einstellungen',
    fields: [
      { id: 'f_100_p', label: 'Einstellung Druckschalter (bar)', type: 'number' },
      { id: 'f_101_t', label: 'Einstellung Stern-Dreieck-Zeit (sec)', type: 'number' },
      { id: 'f_103_a', label: 'Einstellung Überstromauslöser (A)', type: 'number' },
      { id: 'f_104_v', label: 'Messung Stromaufnahme (A bei 400V)', type: 'number' }
    ]
  },
  {
    id: 's_hours',
    title: 'Betriebsstunden',
    fields: [
      { id: 'f_h_run', label: 'Betriebsstunden-Nr. I (Gesamt)', type: 'number' },
      { id: 'f_h_load', label: 'Laststunden-Nr. II', type: 'number' }
    ]
  },
  {
    id: 's_sig',
    title: 'Abschluss & Unterschrift',
    fields: [
      { id: 'f_sig_tech', label: 'Unterschrift Servicetechniker', type: 'signature' },
      { id: 'f_sig_cust', label: 'Unterschrift Kunde', type: 'signature' }
    ]
  }
];

const getRecursiveParts = (entityId: string, allData: Entity[]): Entity[] => {
  let parts: Entity[] = [];
  const directChildren = allData.filter(e => e.parentId === entityId);
  
  directChildren.forEach(child => {
    if (child.type === 'part') {
      parts.push(child);
    } else {
      parts = [...parts, ...getRecursiveParts(child.id, allData)];
    }
  });
  return parts;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const StatusBadge = ({ status }: { status?: 'ok' | 'warning' | 'critical' }) => {
  if (!status) return null;
  const config = {
    ok: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, text: 'OK' },
    warning: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Wartung' },
    critical: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: 'Kritisch' },
  };
  const { color, icon: Icon, text } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </span>
  );
};

const EntityIcon = ({ type }: { type: EntityType }) => {
  switch (type) {
    case 'customer': return <Building2 className="w-4 h-4 text-blue-600" />;
    case 'station': return <MapPin className="w-4 h-4 text-emerald-600" />;
    case 'sub_station': return <Factory className="w-4 h-4 text-purple-600" />;
    case 'assembly': return <Box className="w-4 h-4 text-amber-600" />;
    case 'machine': return <Cpu className="w-4 h-4 text-orange-600" />;
    case 'component': return <Wrench className="w-4 h-4 text-slate-600" />;
    case 'part': return <FileText className="w-4 h-4 text-gray-500" />;
    default: return <Building2 className="w-4 h-4" />;
  }
};

const EntityLabel = ({ type }: { type: EntityType }) => {
  const labels: Record<EntityType, string> = {
    customer: 'Kunde',
    station: 'Werk',
    sub_station: 'Bereich',
    assembly: 'Baugruppe',
    machine: 'Maschine',
    component: 'Komponente',
    part: 'Bauteil'
  };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
      {labels[type]}
    </span>
  );
};

const TechAvatar = ({ tech }: { tech: Technician }) => {
  if (tech.avatarUrl) {
    return <img src={tech.avatarUrl} alt={tech.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />;
  }
  return (
    <div className={`w-8 h-8 rounded-full ${tech.avatarColor} flex items-center justify-center text-white text-xs`}>
      {tech.name.substring(0,2)}
    </div>
  );
};

// --- Views ---

const LoginScreen = ({ onLogin }: { onLogin: (username: string) => void }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("Service_Techniker_01");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin(username);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-slate-50 border-b border-gray-100">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
             <LayoutDashboard className="w-8 h-8 text-blue-600" />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">MAkte Login</h1>
           <p className="text-slate-500 mt-2">Service & Asset Management</p>
        </div>
        <div className="p-8">
           <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
                <input 
                  type="password" 
                  defaultValue="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
              >
                {loading ? 'Anmeldung läuft...' : 'Anmelden'}
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};

const ProtocolsView = () => {
  const [sections, setSections] = useState<ProtocolSection[]>(maintenanceProtocolTemplate);
  const [activeCustomer, setActiveCustomer] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);

  const handleFieldChange = (sectionId: string, fieldId: string, value: any) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: s.fields.map(f => f.id === fieldId ? { ...f, value } : f)
      };
    }));
  };

  if (isComplete) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center">
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Protokoll gespeichert</h2>
          <p className="text-gray-500 mb-8">Das Wartungsprotokoll wurde erfolgreich erstellt und als PDF an den Kunden versendet.</p>
          <button onClick={() => setIsComplete(false)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Neues Protokoll erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wartungsprotokoll</h1>
          <p className="text-gray-500">Digitales Formular (Tablet-Optimiert)</p>
        </div>
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
          <Printer className="w-4 h-4 mr-2" /> Druckvorschau
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Form Generator */}
        <div className="divide-y divide-gray-200">
          {sections.map(section => (
            <div key={section.id} className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <ClipboardCheck className="w-5 h-5 mr-2 text-blue-600" />
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map(field => (
                  <div key={field.id} className={field.type === 'checkbox' ? 'flex items-center mt-4' : ''}>
                    {field.type !== 'checkbox' && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                    )}
                    
                    {field.type === 'text' && (
                      <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={field.value || ''}
                        onChange={e => handleFieldChange(section.id, field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'number' && (
                      <input 
                        type="number" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={field.value || ''}
                        onChange={e => handleFieldChange(section.id, field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'select' && (
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={field.value || ''}
                        onChange={e => handleFieldChange(section.id, field.id, e.target.value)}
                      >
                        <option value="">Bitte wählen...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {field.type === 'checkbox' && (
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={field.value || false}
                          onChange={e => handleFieldChange(section.id, field.id, e.target.checked)}
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">{field.label}</span>
                      </label>
                    )}

                    {field.type === 'signature' && (
                      <div className="col-span-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                        <PenTool className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Hier tippen zum Unterschreiben</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-end">
          <button 
            onClick={() => setIsComplete(true)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm"
          >
            Protokoll abschließen
          </button>
        </div>
      </div>
    </div>
  );
};

const TasksView = ({ data, technicians, assignments }: { data: Entity[], technicians: Technician[], assignments: Assignment[] }) => {
  const tasks: Task[] = useMemo(() => {
    const list: Task[] = [];
    const today = new Date();

    // 1. Bevorstehende Wartungen ohne Termin
    const machines = data.filter(e => e.type === 'machine' && e.details?.nextServiceDate);
    machines.forEach(m => {
      const nextDate = new Date(m.details!.nextServiceDate!);
      const diffTime = nextDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Hat die Maschine schon einen Termin in der Zukunft?
      const hasAssignment = assignments.some(a => a.entityId === m.id && new Date(a.date) >= today);
      
      if (!hasAssignment && diffDays > -10 && diffDays < 30) { // include slightly overdue
         const parentName = data.find(p => p.id === m.parentId)?.name;
         list.push({
           id: `task_m_${m.id}`,
           title: diffDays < 0 ? 'Wartung überfällig' : 'Wartungserinnerung',
           description: `Kunde "${parentName}" auf ${diffDays < 0 ? 'überfällige' : 'bevorstehende'} Wartung für "${m.name}" hinweisen (${diffDays < 0 ? 'Überfällig seit ' + Math.abs(diffDays) : 'Fällig in ' + diffDays} Tagen).`,
           type: diffDays < 0 ? 'warning' : 'reminder',
           relatedId: m.id
         });
      }
    });

    // 2. Techniker Planung für nächste Woche
    const nextWeekStart = getMonday(new Date(today));
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 4);

    technicians.forEach(t => {
       // Prüfen ob Techniker nächste Woche überhaupt Einsätze hat
       const hasJobsNextWeek = assignments.some(a => {
         const d = new Date(a.date);
         return a.technicianId === t.id && d >= nextWeekStart && d <= nextWeekEnd;
       });

       if (!hasJobsNextWeek) {
         list.push({
           id: `task_t_${t.id}`,
           title: 'Planung erforderlich',
           description: `Kollege ${t.name} hat für die nächste Woche (KW ${getKw(nextWeekStart)}) noch keine Einsätze geplant.`,
           type: 'planning',
           relatedId: t.id
         });
       }
    });

    // 3. Freie Kapazitäten (Beispiel: Nächster Freitag)
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7); // simple logic for upcoming friday
    const nextFridayStr = nextFriday.toISOString().split('T')[0];
    
    technicians.forEach(t => {
       const jobsOnFriday = assignments.filter(a => a.technicianId === t.id && a.date === nextFridayStr);
       const hoursUsed = jobsOnFriday.reduce((sum, a) => sum + a.duration, 0);
       const hoursLeft = (t.workDayEnd - t.workDayStart) - hoursUsed;

       if (hoursLeft > 4) {
         list.push({
           id: `task_cap_${t.id}`,
           title: 'Freie Kapazität',
           description: `Kollege ${t.name} hat am nächsten Freitag (${formatDate(nextFridayStr)}) noch ${hoursLeft} Stunden Freilauf.`,
           type: 'info',
           relatedId: t.id
         });
       }
    });

    // 4. Statische Dummy Aufgaben
    list.push({
      id: 'static_1',
      title: 'Einkauf',
      description: 'Monatliche Sammelbestellung für Filter und Dichtungen vorbereiten.',
      type: 'warning'
    });
    list.push({
      id: 'static_2',
      title: 'Dokumentation',
      description: 'Neuer Servicebericht von Atlas Copco eingetroffen - bitte prüfen und ablegen.',
      type: 'info'
    });

    return list;
  }, [data, technicians, assignments]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aufgaben & Hinweise</h1>
          <p className="text-gray-500">Automatisierte Benachrichtigungen und To-Dos</p>
        </div>
        <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{tasks.length} Offen</span>
      </div>

      <div className="grid grid-cols-1 gap-4 pb-8">
        {tasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-full mr-4 flex-shrink-0 ${
              task.type === 'reminder' ? 'bg-amber-100 text-amber-600' :
              task.type === 'planning' ? 'bg-purple-100 text-purple-600' :
              task.type === 'warning' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {task.type === 'reminder' ? <Clock className="w-6 h-6" /> :
               task.type === 'planning' ? <Calendar className="w-6 h-6" /> :
               task.type === 'warning' ? <AlertCircle className="w-6 h-6" /> :
               <Bell className="w-6 h-6" />}
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-start">
                 <h3 className="font-bold text-gray-900">{task.title}</h3>
                 <div className="flex space-x-2">
                   <button className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">Anzeigen</button>
                   <button className="text-gray-400 hover:text-green-600"><CheckCircle2 className="w-5 h-5" /></button>
                 </div>
               </div>
               <p className="text-gray-600 mt-1 text-sm leading-relaxed">{task.description}</p>
               {task.date && <span className="text-xs text-gray-400 mt-2 block">Bezieht sich auf: {formatDate(task.date)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AssetBrowser = ({ data, onUpdateEntity }: { data: Entity[], onUpdateEntity: (e: Entity) => void }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState(30); 
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const selectedEntity = selectedId ? data.find(e => e.id === selectedId) : null;
  const children = selectedEntity ? data.filter(e => e.parentId === selectedEntity.id) : data.filter(e => !e.parentId);
  
  // Search Logic
  const filteredChildren = useMemo(() => {
    if (!searchQuery) return children;
    if (!selectedEntity && searchQuery) {
      // Global Search on top level or just filter top level?
      // Let's do a global search for Customers if top level
      return data.filter(e => e.type === 'customer' && (
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.customerNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    }
    return children.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [children, searchQuery, data, selectedEntity]);

  const getBreadcrumbs = (id: string | null): Entity[] => {
    if (!id) return [];
    const entity = data.find(e => e.id === id);
    if (!entity) return [];
    return [...getBreadcrumbs(entity.parentId || null), entity];
  };

  const breadcrumbs = getBreadcrumbs(selectedId);

  const handleResize = (e: MouseEvent) => {
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 15 && newWidth < 60) setListWidth(newWidth);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', () => setIsResizing(false));
    }
    return () => window.removeEventListener('mousemove', handleResize);
  }, [isResizing]);

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* List Column */}
      <div 
        style={{ width: window.innerWidth < 768 ? '100%' : `${listWidth}%` }} 
        className={`flex flex-col border-r border-gray-200 bg-white flex-shrink-0 ${selectedId && window.innerWidth < 768 ? 'hidden' : 'flex'}`}
      >
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Hierarchie</div>
          <div className="relative mb-2">
             <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
             <input 
               type="text" 
               placeholder="Kunde suchen (Name oder KD-Nr)..." 
               className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div className="flex flex-wrap gap-1 items-center text-sm">
            <button 
              onClick={() => setSelectedId(null)} 
              className={`hover:underline ${breadcrumbs.length === 0 ? 'font-bold text-gray-900' : 'text-blue-600'}`}
            >
              Alle Kunden
            </button>
            {breadcrumbs.map((b, i) => (
              <div key={b.id} className="flex items-center">
                <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                <button 
                  onClick={() => setSelectedId(b.id)}
                  className={`hover:underline truncate max-w-[150px] ${i === breadcrumbs.length - 1 ? 'font-bold text-gray-900' : 'text-blue-600'}`}
                >
                  {b.name}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
          {filteredChildren.map(item => (
            <div 
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className="group flex items-center justify-between p-4 mb-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                  <EntityIcon type={item.type} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <div className="flex items-center space-x-2">
                     <EntityLabel type={item.type} />
                     <StatusBadge status={item.details?.status} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                 {item.customerNumber && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 rounded">{item.customerNumber}</span>}
                 <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              </div>
            </div>
          ))}
          {filteredChildren.length === 0 && (
            <div className="text-center p-8 text-gray-400 text-sm">Keine Elemente gefunden.</div>
          )}
        </div>
      </div>

      {/* Resizer - Desktop Only */}
      <div 
        className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors hidden md:flex items-center justify-center"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="w-0.5 h-8 bg-gray-400 rounded-full"></div>
      </div>

      {/* Detail Column */}
      <div className={`flex-1 bg-white flex flex-col overflow-hidden min-w-0 ${!selectedId && window.innerWidth < 768 ? 'hidden' : 'flex'}`}>
        {selectedEntity ? (
          <div className="flex flex-col h-full">
            {/* Mobile Back Button */}
            <div className="md:hidden p-4 border-b border-gray-200 flex items-center text-blue-600 font-medium cursor-pointer" onClick={() => setSelectedId(selectedEntity.parentId || null)}>
               <ChevronLeft className="w-5 h-5 mr-1" /> Zurück
            </div>

            {/* Detail Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <EntityIcon type={selectedEntity.type} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                     <EntityLabel type={selectedEntity.type} />
                     {selectedEntity.customerNumber && <span className="text-xs font-mono text-gray-400">| ID: {selectedEntity.customerNumber}</span>}
                  </div>
                  {isEditing ? (
                    <input 
                      className="text-2xl font-bold text-gray-900 border-b border-blue-500 outline-none w-full mt-1"
                      value={selectedEntity.name}
                      onChange={(e) => onUpdateEntity({...selectedEntity, name: e.target.value})}
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">{selectedEntity.name}</h1>
                  )}
                  <p className="text-gray-500 mt-1">{selectedEntity.description || 'Keine Beschreibung'}</p>
                </div>
              </div>
              <div className="flex space-x-2 print:hidden">
                 <button onClick={() => window.print()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                   <Printer className="w-5 h-5" />
                 </button>
                 <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2 rounded-lg border flex items-center ${isEditing ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                   {isEditing ? <><Save className="w-4 h-4 mr-2"/> Speichern</> : <><Edit2 className="w-4 h-4 mr-2"/> Bearbeiten</>}
                 </button>
              </div>
            </div>
            
            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0">
               {/* Image Gallery */}
               <div className="mb-8">
                 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                   <Camera className="w-4 h-4 mr-2" /> Fotos & Dokumentation
                 </h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {selectedEntity.images?.map((img, idx) => (
                     <img key={idx} src={img} className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                   ))}
                   <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">Foto hinzufügen</span>
                   </div>
                 </div>
               </div>

               {/* Technical Details */}
               {selectedEntity.details && (
                 <div className="mb-8">
                   <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                     <Cpu className="w-4 h-4 mr-2" /> Technische Daten
                   </h3>
                   <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                      {Object.entries(selectedEntity.details).map(([key, value]) => (
                        <div key={key}>
                           <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                           <dd className="text-sm font-medium text-gray-900">{value}</dd>
                        </div>
                      ))}
                   </div>
                 </div>
               )}

               {/* Documents */}
               <div className="mb-8">
                 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                   <Paperclip className="w-4 h-4 mr-2" /> Anhänge
                 </h3>
                 <div className="space-y-2">
                   {selectedEntity.documents?.map(doc => (
                     <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                       <div className="flex items-center">
                         <FileText className="w-5 h-5 text-blue-500 mr-3" />
                         <div>
                           <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                           <p className="text-xs text-gray-500">{doc.date}</p>
                         </div>
                       </div>
                       <button className="text-gray-400 hover:text-blue-600"><Upload className="w-4 h-4" /></button>
                     </div>
                   ))}
                   <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" /> Datei hochladen
                   </div>
                 </div>
               </div>

               {/* Actions */}
               <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 print:hidden">
                 <button className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors">
                   Wartungsprotokoll erstellen
                 </button>
                 <button className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors">
                   Ersatzteile bestellen
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
             <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
               <LayoutDashboard className="w-8 h-8 text-gray-400" />
             </div>
             <p>Wählen Sie ein Asset aus der Liste</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PlanningView = ({ 
  data, 
  technicians,
  assignments,
  setAssignments,
  serviceConfig,
  workPackages
}: { 
  data: Entity[], 
  technicians: Technician[],
  assignments: Assignment[],
  setAssignments: (a: Assignment[]) => void,
  serviceConfig: ServiceConfig,
  workPackages: WorkPackage[]
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [draggedItem, setDraggedItem] = useState<{id: string, type: 'entity' | 'package' | 'assignment', origin: 'stock' | 'board', duration?: number} | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  const [filterStart, setFilterStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterEnd, setFilterEnd] = useState<string>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [sidebarTab, setSidebarTab] = useState<'machines' | 'services'>('machines');
  const [isDraggingOverStock, setIsDraggingOverStock] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [showRouteOverlay, setShowRouteOverlay] = useState<{techId: string, date: string} | null>(null);
  
  // Mobile Stock Toggle
  const [isMobileStockOpen, setIsMobileStockOpen] = useState(false);

  const uniqueLocations = useMemo(() => Array.from(new Set(technicians.map(t => t.location))), [technicians]);
  const filteredTechnicians = useMemo(() => selectedLocation === 'All' ? technicians : technicians.filter(t => t.location === selectedLocation), [technicians, selectedLocation]);

  const minHour = Math.min(...filteredTechnicians.map(t => t.workDayStart)) || 8;
  const maxHour = Math.max(...filteredTechnicians.map(t => t.workDayEnd)) || 18;
  const dayDuration = maxHour - minHour;

  // Holidays
  const holidays = useMemo(() => getGermanHolidays(currentWeekStart.getFullYear()), [currentWeekStart]);

  const isInRange = (dateStr: string | undefined) => {
    if (!dateStr) return false; 
    const d = new Date(dateStr);
    const start = new Date(filterStart);
    const end = new Date(filterEnd);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return d >= start && d <= end;
  };

  const unscheduledEntities = useMemo(() => {
    const assignedIds = assignments.filter(a => !a.isPackage).map(a => a.entityId);
    return data.filter(e => {
      if (e.type !== 'machine') return false;
      const status = e.details?.status;
      const nextDate = e.details?.nextServiceDate;
      // Allow warning/critical status OR if date is set and overdue/in range
      const needsService = status === 'warning' || status === 'critical' || nextDate;
      
      if (!needsService) return false;
      if (assignedIds.includes(e.id)) return false;
      if (!nextDate) return true; 
      
      const d = new Date(nextDate);
      const now = new Date();
      now.setHours(0,0,0,0);
      // Show if overdue or in range
      if (d < now) return true; 
      return isInRange(nextDate);
    });
  }, [data, assignments, filterStart, filterEnd]);

  const handleDragStart = (e: React.DragEvent, id: string, type: 'entity' | 'package' | 'assignment', origin: 'stock' | 'board', duration?: number) => {
    const payload = { id, type, origin, duration };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    setDraggedItem(payload);
  };

  const handleDropOnBoard = (e: React.DragEvent, techId: string, date: string, droppedHour?: number) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    
    const { id, type, origin, duration: oldDuration } = JSON.parse(rawData);
    
    if (origin === 'board') {
      // Reassign
      const assignmentId = id;
      setAssignments(assignments.map(a => {
        if (a.id === assignmentId) {
          return { 
            ...a, 
            technicianId: techId, 
            date: date,
            startTime: droppedHour || 8 
          };
        }
        return a;
      }));
    } else {
      // New Assignment
      let newAssignment: Assignment;
      let duration = 1;
      let customName = '';
      let isPackage = false;

      if (type === 'package') {
        const pkg = workPackages.find(p => p.id === id);
        if (!pkg) return;
        duration = pkg.duration;
        customName = pkg.name;
        isPackage = true;
      } else {
        const entity = data.find(en => en.id === id);
        const size = entity?.details?.serviceSize || 'M';
        duration = size === 'S' ? serviceConfig.s : size === 'M' ? serviceConfig.m : serviceConfig.l;
      }

      let startTime = droppedHour || 8;
      if (!droppedHour) {
        const existing = assignments.filter(a => a.technicianId === techId && a.date === date);
        if (existing.length > 0) {
          existing.sort((a,b) => (a.startTime || 8) - (b.startTime || 8));
          const last = existing[existing.length - 1];
          startTime = (last.startTime || 8) + last.duration;
        }
      }

      newAssignment = {
        id: Math.random().toString(),
        entityId: id,
        isPackage,
        customName,
        technicianId: techId,
        date: date,
        duration: duration,
        startTime: startTime,
        status: 'planned'
      };
      setAssignments([...assignments, newAssignment]);
    }
    setDraggedItem(null);
  };

  const handleDropOnStock = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverStock(false);
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    const { id, origin } = JSON.parse(rawData);

    if (origin === 'board') {
      setAssignments(assignments.filter(a => a.id !== id));
    }
    setDraggedItem(null);
  }

  const navigateWeek = (dir: number) => {
    setCurrentWeekStart(addWeeks(currentWeekStart, dir));
  }

  const handleDeleteAssignment = (id: string) => {
    setAssignments(assignments.filter(a => a.id !== id));
  }

  // Route Calc Mock
  const calculateRoute = (techId: string, date: string) => {
    const daysAssignments = assignments.filter(a => a.technicianId === techId && a.date === date);
    daysAssignments.sort((a,b) => (a.startTime || 0) - (b.startTime || 0));
    return daysAssignments;
  }

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Middle: Board */}
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-50 print:w-full print:border-none min-w-0">
        <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto">
            <CalendarDays className="w-5 h-5 text-gray-500 hidden md:block" />
            <h2 className="text-lg font-bold text-gray-900 hidden md:block">Einsatzplanung</h2>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
               <button onClick={() => setViewMode('day')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Tag</button>
               <button onClick={() => setViewMode('week')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Woche</button>
               <button onClick={() => setViewMode('month')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Monat</button>
            </div>
            
            {/* Location Filter */}
            <select 
              className="bg-gray-50 border border-gray-300 rounded px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 hidden md:block"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="All">Alle Standorte</option>
              {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>

            {viewMode === 'day' && (
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-gray-50 border border-gray-300 rounded px-3 py-1 text-sm" />
            )}
            {viewMode === 'week' && (
              <div className="flex items-center space-x-2 text-sm">
                 <button onClick={() => navigateWeek(-1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4"/></button>
                 <span className="font-mono whitespace-nowrap">KW {getKw(currentWeekStart)}</span>
                 <button onClick={() => navigateWeek(1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4"/></button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsMobileStockOpen(!isMobileStockOpen)} className="md:hidden px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow">
               📦 Vorrat
            </button>
            <button onClick={() => window.print()} className="p-2 text-gray-500 hover:bg-blue-50 rounded-lg hidden md:block"><Printer className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 print:bg-white print:p-0 relative">
           {viewMode === 'day' && (
             <div className="flex min-h-full bg-white shadow-sm m-4 rounded-xl border border-gray-200 overflow-hidden">
                <div className="w-12 md:w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                   <div className="h-12 border-b border-gray-200 bg-white"></div>
                   {Array.from({ length: dayDuration + 1 }).map((_, i) => {
                     const hour = minHour + i;
                     return (
                       <div key={hour} className="h-20 border-b border-gray-200 text-xs text-gray-400 text-center pt-2">{hour}:00</div>
                     )
                   })}
                </div>
                <div className="flex-1 flex overflow-x-auto">
                  {filteredTechnicians.map(tech => (
                    <div 
                       key={tech.id} 
                       className="flex-1 min-w-[200px] border-r border-gray-200 bg-white relative group"
                       onDragOver={(e) => e.preventDefault()}
                       onDrop={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const offsetY = e.clientY - rect.top - 48; 
                          const hourIndex = Math.floor(offsetY / 80); 
                          const droppedHour = minHour + Math.max(0, hourIndex);
                          handleDropOnBoard(e, tech.id, selectedDate, droppedHour);
                       }}
                    >
                       <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between px-2 sticky top-0 z-10">
                          <div className="flex items-center space-x-2 overflow-hidden">
                             <div className="w-6 h-6 flex-shrink-0"><TechAvatar tech={tech} /></div>
                             <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate">{tech.name}</span>
                             </div>
                          </div>
                          <button 
                            onClick={() => setShowRouteOverlay({ techId: tech.id, date: selectedDate })}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-medium flex items-center"
                          >
                            <Map className="w-3 h-3 mr-1" /> Route
                          </button>
                       </div>
                       {Array.from({ length: dayDuration + 1 }).map((_, i) => (
                         <div key={i} className={`h-20 border-b border-gray-100 pointer-events-none ${minHour + i < tech.workDayStart || minHour + i >= tech.workDayEnd ? 'bg-gray-50/50' : ''}`}></div>
                       ))}
                       {assignments.filter(a => a.technicianId === tech.id && a.date === selectedDate).map(a => {
                          const startHour = a.startTime || 8;
                          const topPos = (startHour - minHour) * 80; 
                          const height = a.duration * 80;
                          return (
                            <div 
                              key={a.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, a.id, 'assignment', 'board', a.duration)}
                              className={`absolute left-1 right-1 rounded p-2 overflow-hidden shadow-sm border cursor-move transition-shadow hover:shadow-md z-20 ${a.isPackage ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-blue-100 border-blue-200 text-blue-800'}`}
                              style={{ top: `${topPos + 48}px`, height: `${height - 4}px` }}
                            >
                              <div className="text-[10px] font-bold mb-0.5">{startHour}:00 - {startHour + a.duration}:00</div>
                              <div className="text-xs font-medium truncate leading-tight">{a.isPackage ? a.customName : data.find(e => e.id === a.entityId)?.name}</div>
                            </div>
                          );
                       })}
                    </div>
                  ))}
                </div>
             </div>
           )}

           {viewMode === 'week' && (
             <div className="p-4 md:p-6 overflow-x-auto">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 min-w-[800px]">
                <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
                   <div className="p-3 text-xs font-bold text-gray-500 uppercase border-r border-gray-200">Techniker</div>
                   {Array.from({length: 5}).map((_, i) => {
                     const d = new Date(currentWeekStart);
                     d.setDate(d.getDate() + i);
                     const dateStr = d.toISOString().split('T')[0];
                     const isHoliday = holidays[dateStr];
                     return (
                       <div key={i} className={`p-3 text-xs font-bold uppercase border-l border-gray-200 text-center ${isHoliday ? 'bg-red-50 text-red-600' : 'text-gray-500'}`}>
                         {d.toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: '2-digit'})}
                         {isHoliday && <div className="text-[9px] font-normal mt-1">{isHoliday}</div>}
                       </div>
                     )
                   })}
                </div>
                {filteredTechnicians.map(tech => (
                  <div key={tech.id} className="grid grid-cols-6 border-b border-gray-100 min-h-[120px]">
                     <div className="p-3 border-r border-gray-200 flex flex-col justify-center bg-white z-10 sticky left-0">
                       <div className="flex items-center">
                         <TechAvatar tech={tech} />
                         <div className="flex flex-col ml-2 overflow-hidden">
                            <span className="text-sm font-medium truncate">{tech.name}</span>
                            <span className="text-[10px] text-gray-400">{tech.location}</span>
                         </div>
                       </div>
                       <span className="text-[10px] text-gray-400 mt-1 ml-10">{tech.workDayStart}:00 - {tech.workDayEnd}:00</span>
                     </div>
                     {Array.from({length: 5}).map((_, i) => {
                       const d = new Date(currentWeekStart);
                       d.setDate(d.getDate() + i);
                       const dateStr = d.toISOString().split('T')[0];
                       const daysAssignments = assignments.filter(a => a.technicianId === tech.id && a.date === dateStr);
                       const isHoliday = holidays[dateStr];

                       return (
                         <div 
                           key={i} 
                           onDragOver={(e) => e.preventDefault()}
                           onDrop={(e) => handleDropOnBoard(e, tech.id, dateStr)}
                           className={`border-l border-gray-200 relative transition-colors h-40 ${isHoliday ? 'bg-red-50/30' : 'bg-gray-50/30 hover:bg-gray-50'}`}
                         >
                           <div className="absolute inset-0 pointer-events-none flex flex-col opacity-10">
                             {Array.from({length: 5}).map((_, idx) => (<div key={idx} className="flex-1 border-b border-gray-900"></div>))}
                           </div>
                           <div className="absolute top-0 left-0 text-[8px] text-gray-400 p-0.5">{minHour}:00</div>
                           <div className="absolute bottom-0 left-0 text-[8px] text-gray-400 p-0.5">{maxHour}:00</div>

                           {daysAssignments.map((a) => {
                             const startHour = a.startTime || 8;
                             const topPos = ((startHour - minHour) / dayDuration) * 100; 
                             const height = (a.duration / dayDuration) * 100;
                             return (
                               <div 
                                 key={a.id}
                                 draggable
                                 onDragStart={(e) => handleDragStart(e, a.id, 'assignment', 'board', a.duration)}
                                 className={`absolute left-1 right-1 rounded p-1 overflow-hidden shadow-sm border group cursor-move z-10 ${a.isPackage ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-blue-100 border-blue-200 text-blue-800'}`}
                                 style={{ top: `${Math.max(0, Math.min(topPos, 100))}%`, height: `${Math.max(height, 5)}%` }}
                                 title={`${startHour}:00 - ${startHour + a.duration}:00`}
                               >
                                 <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-bold">{startHour}:00</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(a.id); }} className="hidden group-hover:block text-gray-500 hover:text-red-500 bg-white/50 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                                 </div>
                                 <div className="text-[10px] font-medium truncate leading-tight">{a.isPackage ? a.customName : data.find(e => e.id === a.entityId)?.name}</div>
                               </div>
                             );
                           })}
                         </div>
                       );
                     })}
                  </div>
                ))}
             </div>
            </div>
           )}

           {viewMode === 'month' && (
             <div className="p-6">
               <div className="bg-white rounded-xl shadow-sm p-6">
                 <div className="grid grid-cols-7 gap-2 mb-2">
                   {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (<div key={d} className="text-center text-xs font-bold text-gray-500 py-2">{d}</div>))}
                 </div>
                 <div className="grid grid-cols-7 gap-2">
                   {Array.from({ length: 35 }).map((_, i) => {
                     const dayOffset = i - 2; 
                     const d = new Date(); d.setDate(1); d.setDate(d.getDate() + dayOffset);
                     const dateStr = d.toISOString().split('T')[0];
                     const isToday = dateStr === new Date().toISOString().split('T')[0];
                     const dayAssignments = assignments.filter(a => a.date === dateStr);
                     return (
                       <div key={i} className={`h-24 border border-gray-100 rounded-lg p-2 flex flex-col ${dayOffset >= 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-300'}`}>
                         <div className="flex justify-between items-start mb-1">
                           <span className={`text-sm font-medium ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-700'}`}>{d.getDate()}</span>
                           {dayAssignments.length > 0 && (<span className="text-[10px] bg-gray-100 px-1 rounded font-bold text-gray-600">{dayAssignments.length}</span>)}
                         </div>
                         <div className="flex-1 overflow-hidden space-y-1">
                           {dayAssignments.slice(0, 3).map((a, idx) => (<div key={idx} className="h-1.5 w-full rounded-full bg-blue-400"></div>))}
                         </div>
                       </div>
                     )
                   })}
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Right: Stock (Responsive) */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverStock(true); }}
        onDragLeave={() => setIsDraggingOverStock(false)}
        onDrop={handleDropOnStock}
        className={`
          fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300
          md:relative md:transform-none md:shadow-none
          ${isMobileStockOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          ${isDraggingOverStock ? 'bg-red-50 border-red-300' : 'bg-white'}
        `}
      >
        <div className="h-16 border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
           <h3 className={`font-bold flex items-center transition-colors ${isDraggingOverStock ? 'text-red-600' : 'text-gray-700'}`}>
             {isDraggingOverStock ? <Trash2 className="w-4 h-4 mr-2" /> : <Briefcase className="w-4 h-4 mr-2" />}
             {isDraggingOverStock ? 'Aus Planung entfernen' : 'Planungsvorrat'}
           </h3>
           <button onClick={() => setIsMobileStockOpen(false)} className="md:hidden text-gray-400 hover:text-gray-900">
             <X className="w-5 h-5" />
           </button>
        </div>
        <div className={`flex border-b border-gray-200 ${isDraggingOverStock ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => setSidebarTab('machines')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${sidebarTab === 'machines' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>Wartungen</button>
          <button onClick={() => setSidebarTab('services')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${sidebarTab === 'services' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>Leistungen</button>
        </div>
        {sidebarTab === 'machines' && !isDraggingOverStock && (
          <div className="p-3 bg-gray-50 border-b border-gray-200 grid grid-cols-2 gap-2">
            <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Von</label><input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="w-full text-xs border border-gray-300 rounded p-1.5" /></div>
            <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bis</label><input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="w-full text-xs border border-gray-300 rounded p-1.5" /></div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 h-full">
           {isDraggingOverStock ? (
             <div className="h-full flex flex-col items-center justify-center text-red-400 border-2 border-dashed border-red-200 rounded-xl"><Undo2 className="w-12 h-12 mb-2" /><p className="text-sm font-medium">Hier loslassen zum Entfernen</p></div>
           ) : (
             sidebarTab === 'machines' ? (
               unscheduledEntities.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm"><CheckCircle2 className="w-8 h-8 mb-2 text-green-400" />Keine fälligen Wartungen.</div>
               ) : (
                 unscheduledEntities.map(entity => {
                   const dueDate = entity.details?.nextServiceDate ? new Date(entity.details.nextServiceDate) : new Date();
                   const isOverdue = dueDate < new Date();
                   return (
                     <div key={entity.id} draggable onDragStart={(e) => handleDragStart(e, entity.id, 'entity', 'stock')} className={`bg-white p-3 rounded-lg border shadow-sm cursor-grab ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <div className={`text-xs px-1.5 py-0.5 rounded font-medium ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{isOverdue ? `Überfällig` : `Fällig: ${formatDate(entity.details?.nextServiceDate || '')}`}</div>
                           <span className="text-xs font-bold text-gray-400 border border-gray-100 px-1 rounded">{entity.details?.serviceSize || 'M'}</span>
                        </div>
                        <h4 className="font-medium text-sm text-gray-900 mb-1">{entity.name}</h4>
                        <div className="flex items-center text-xs text-gray-500 mb-2"><MapPin className="w-3 h-3 mr-1" /><span className="truncate">{data.find(p => p.id === entity.parentId)?.name || '...'}</span></div>
                     </div>
                   );
                 })
               )
             ) : (
               <div className="space-y-2">
                 <p className="text-xs text-gray-400 mb-2 text-center">Bausteine ziehen</p>
                 {workPackages.map(pkg => (
                   <div key={pkg.id} draggable onDragStart={(e) => handleDragStart(e, pkg.id, 'package', 'stock')} className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm cursor-grab flex justify-between items-center">
                      <div className="flex items-center"><Package className="w-4 h-4 text-amber-500 mr-3" /><h4 className="font-medium text-gray-900 text-sm">{pkg.name}</h4></div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">{pkg.duration} h</span>
                   </div>
                 ))}
               </div>
             )
           )}
        </div>
      </div>

      {/* Route Overlay */}
      {showRouteOverlay && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full md:w-96 bg-white shadow-2xl h-full p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Optimierte Route</h2>
              <button onClick={() => setShowRouteOverlay(null)} className="text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <TechAvatar tech={technicians.find(t => t.id === showRouteOverlay.techId)!} />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{technicians.find(t => t.id === showRouteOverlay.techId)?.name}</p>
                  <p className="text-xs text-gray-500">Tour für {formatDate(showRouteOverlay.date)}</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex justify-between text-sm text-blue-800">
                <span>Start: {technicians.find(t => t.id === showRouteOverlay.techId)?.location}</span>
                <span className="font-bold">~ 184 km</span>
              </div>
            </div>

            <div className="relative border-l-2 border-blue-100 ml-3 space-y-8 pb-10">
              {calculateRoute(showRouteOverlay.techId, showRouteOverlay.date).map((stop, i) => {
                const entity = data.find(e => e.id === stop.entityId);
                const customer = data.find(c => c.id === entity?.parentId);
                return (
                  <div key={stop.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                    <p className="text-xs font-bold text-blue-600 mb-1">{stop.startTime}:00 Uhr</p>
                    <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                       <h4 className="font-bold text-gray-900 text-sm mb-1">{customer?.name || stop.customName}</h4>
                       <p className="text-xs text-gray-500 mb-2">{entity?.name}</p>
                       <div className="flex items-center text-xs text-gray-400">
                         <Navigation className="w-3 h-3 mr-1" />
                         <span>~ 45 min Fahrtzeit</span>
                       </div>
                    </div>
                  </div>
                )
              })}
              <div className="relative pl-6">
                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-300 border-4 border-white"></div>
                 <p className="text-xs font-bold text-gray-400">Tour Ende</p>
                 <p className="text-sm text-gray-500">Rückkehr zum Standort</p>
              </div>
            </div>
            
            <button onClick={() => setShowRouteOverlay(null)} className="w-full py-3 mt-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
               Route an Techniker senden
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ShoppingView = ({ data, assignments }: { data: Entity[], assignments: Assignment[] }) => {
  const plannedParts = useMemo(() => {
     const assignedEntityIds = assignments.filter(a => !a.isPackage).map(a => a.entityId);
     const neededParts: { name: string, count: number, article: string, machine: string }[] = [];

     assignedEntityIds.forEach(eid => {
        const machine = data.find(d => d.id === eid);
        if(machine) {
           const parts = getRecursiveParts(eid, data);
           parts.forEach(p => {
              const existing = neededParts.find(np => np.article === p.details?.articleNumber);
              if(existing) {
                existing.count += (p.details?.quantity || 1);
              } else {
                neededParts.push({
                  name: p.name,
                  count: (p.details?.quantity || 1),
                  article: p.details?.articleNumber || 'N/A',
                  machine: machine.name
                });
              }
           });
        }
     });
     return neededParts;
  }, [data, assignments]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="p-6 border-b border-gray-200 flex justify-between items-center">
           <div>
             <h2 className="text-xl font-bold text-gray-900">Materialbedarf & Einkauf</h2>
             <p className="text-gray-500 mt-1">Prognose basierend auf geplanten Wartungen</p>
           </div>
           <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
             <ShoppingCart className="w-4 h-4 mr-2" /> Bestellanforderung senden
           </button>
         </div>
         {plannedParts.length > 0 ? (
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-gray-50 border-b border-gray-200">
                 <tr>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Artikelnummer</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Bezeichnung</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Menge</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {plannedParts.map((part, i) => (
                   <tr key={i} className="hover:bg-gray-50">
                     <td className="px-6 py-4 font-mono text-sm text-gray-600">{part.article}</td>
                     <td className="px-6 py-4 text-sm font-medium text-gray-900">{part.name}</td>
                     <td className="px-6 py-4 text-sm text-gray-900 font-bold text-right">{part.count}</td>
                     <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verfügbar</span></td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         ) : (
           <div className="p-12 text-center text-gray-400">
             <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
             <p>Keine geplanten Wartungen mit Materialbedarf gefunden.</p>
           </div>
         )}
      </div>
    </div>
  );
};

const ReportsView = ({ assignments, technicians }: { assignments: Assignment[], technicians: Technician[] }) => {
  const [reportStart, setReportStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportEnd, setReportEnd] = useState<string>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // Default view: Last month to next month
    setReportStart(d.toISOString().split('T')[0]);
  }, []);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (!a.date) return false;
      return a.date >= reportStart && a.date <= reportEnd;
    });
  }, [assignments, reportStart, reportEnd]);

  const stats = useMemo(() => {
    const totalAssignments = filteredAssignments.length;
    const totalHours = filteredAssignments.reduce((sum, a) => sum + a.duration, 0);
    const techStats = technicians.map(t => {
      const myAssignments = filteredAssignments.filter(a => a.technicianId === t.id);
      const hours = myAssignments.reduce((sum, a) => sum + a.duration, 0);
      return { name: t.name, count: myAssignments.length, hours, util: Math.min(100, Math.round((hours / (t.maxHours * 5)) * 100)) }; 
    });
    return { totalAssignments, totalHours, techStats };
  }, [filteredAssignments, technicians]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
         <span className="text-sm font-bold text-gray-500 uppercase">Zeitraum:</span>
         <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
         <span className="text-gray-400">-</span>
         <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-bold text-gray-400 uppercase mb-2">Geplante Einsätze</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalAssignments}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-bold text-gray-400 uppercase mb-2">Gesamtstunden</div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalHours} h</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-bold text-gray-400 uppercase mb-2">Aktive Techniker</div>
          <div className="text-3xl font-bold text-emerald-600">{technicians.length}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200"><h3 className="font-bold text-gray-900">Techniker Auslastung (im gewählten Zeitraum)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-gray-50 border-b border-gray-200">
               <tr>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Einsätze</th>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Stunden</th>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Auslastung (Index)</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {stats.techStats.map((t, i) => (
                 <tr key={i}>
                   <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                   <td className="px-6 py-4 text-right text-gray-600">{t.count}</td>
                   <td className="px-6 py-4 text-right text-gray-600 font-mono">{t.hours} h</td>
                   <td className="px-6 py-4">
                     <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                       <div className="bg-blue-600 h-2 rounded-full" style={{width: `${Math.min(100, (t.hours / 40) * 100)}%`}}></div>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const AdminView = ({ 
  technicians, 
  setTechnicians,
  serviceConfig,
  setServiceConfig,
  workPackages,
  setWorkPackages,
  logs
}: { 
  technicians: Technician[], 
  setTechnicians: (t: Technician[]) => void,
  serviceConfig: ServiceConfig,
  setServiceConfig: (c: ServiceConfig) => void,
  workPackages: WorkPackage[],
  setWorkPackages: (wp: WorkPackage[]) => void,
  logs: AuditLog[]
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'service' | 'packages' | 'logs'>('users');
  const [newTechName, setNewTechName] = useState('');
  const [newTechLocation, setNewTechLocation] = useState('');
  const [newTechUrl, setNewTechUrl] = useState('');
  const [newTechStart, setNewTechStart] = useState(8);
  const [newTechEnd, setNewTechEnd] = useState(17);

  const handleAddTech = () => {
    if(newTechName) {
      setTechnicians([...technicians, {
        id: Math.random().toString(),
        name: newTechName,
        role: 'Techniker',
        location: newTechLocation || 'Berlin',
        avatarColor: 'bg-gray-500',
        maxHours: 8,
        workDayStart: newTechStart,
        workDayEnd: newTechEnd,
        avatarUrl: newTechUrl
      }]);
      setNewTechName('');
      setNewTechLocation('');
      setNewTechUrl('');
    }
  }

  const handleUpdateTechTime = (id: string, field: 'workDayStart' | 'workDayEnd', val: number) => {
     setTechnicians(technicians.map(t => t.id === id ? {...t, [field]: val} : t));
  }

  const handleAddPackage = () => {
     setWorkPackages([...workPackages, { id: Math.random().toString(), name: 'Neue Leistung', duration: 1 }]);
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-4">
           <h2 className="text-xs font-bold text-gray-400 uppercase mb-4 ml-2">Einstellungen</h2>
           <nav className="space-y-1 flex md:block overflow-x-auto md:overflow-visible">
             <button onClick={() => setActiveTab('users')} className={`whitespace-nowrap w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'users' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}>Benutzer & Techniker</button>
             <button onClick={() => setActiveTab('service')} className={`whitespace-nowrap w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'service' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}>Service-Konfiguration</button>
             <button onClick={() => setActiveTab('packages')} className={`whitespace-nowrap w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'packages' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}>Leistungsbausteine</button>
             <button onClick={() => setActiveTab('logs')} className={`whitespace-nowrap w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'logs' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}>Änderungsprotokolle</button>
           </nav>
        </div>
        <div className="flex-1 p-8 overflow-y-auto">
           {activeTab === 'users' && (
             <div>
               <h3 className="text-lg font-bold text-gray-900 mb-4">Techniker verwalten</h3>
               <div className="space-y-4 mb-8">
                 {technicians.map(t => (
                   <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                     <div className="flex items-center flex-1 mb-2 md:mb-0">
                       <TechAvatar tech={t} />
                       <div className="ml-3 w-32">
                         <div className="font-medium text-gray-900 truncate">{t.name}</div>
                         <div className="text-xs text-gray-500">{t.role} | {t.location}</div>
                       </div>
                       <div className="ml-4 flex items-center space-x-2">
                          <div className="flex flex-col">
                             <label className="text-[9px] text-gray-400 uppercase">Start</label>
                             <input type="number" value={t.workDayStart} onChange={(e) => handleUpdateTechTime(t.id, 'workDayStart', parseInt(e.target.value))} className="w-12 text-xs border border-gray-300 rounded p-1" />
                          </div>
                          <div className="flex flex-col">
                             <label className="text-[9px] text-gray-400 uppercase">Ende</label>
                             <input type="number" value={t.workDayEnd} onChange={(e) => handleUpdateTechTime(t.id, 'workDayEnd', parseInt(e.target.value))} className="w-12 text-xs border border-gray-300 rounded p-1" />
                          </div>
                       </div>
                     </div>
                     <button onClick={() => setTechnicians(technicians.filter(x => x.id !== t.id))} className="text-red-500 hover:bg-red-50 p-2 rounded md:ml-2 self-end md:self-center"><Trash2 className="w-4 h-4"/></button>
                   </div>
                 ))}
               </div>
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <h4 className="text-sm font-bold text-gray-700 mb-3">Neuen Techniker anlegen</h4>
                 <div className="grid grid-cols-2 gap-3 mb-3">
                    <input placeholder="Name" value={newTechName} onChange={(e) => setNewTechName(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    <input placeholder="Standort (z.B. Berlin)" value={newTechLocation} onChange={(e) => setNewTechLocation(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    <input placeholder="Avatar URL (Optional)" value={newTechUrl} onChange={(e) => setNewTechUrl(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm col-span-2" />
                 </div>
                 <div className="flex items-center space-x-3 mb-3">
                    <span className="text-xs font-bold text-gray-500">Arbeitszeit:</span>
                    <input type="number" value={newTechStart} onChange={(e) => setNewTechStart(parseInt(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm" />
                    <span className="text-xs text-gray-400">bis</span>
                    <input type="number" value={newTechEnd} onChange={(e) => setNewTechEnd(parseInt(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm" />
                 </div>
                 <button onClick={handleAddTech} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">Hinzufügen</button>
               </div>
             </div>
           )}

           {activeTab === 'service' && (
             <div>
               <h3 className="text-lg font-bold text-gray-900 mb-4">Wartungszeiten definieren (Std.)</h3>
               <div className="grid grid-cols-3 gap-4">
                 {Object.entries(serviceConfig).map(([key, val]) => (
                   <div key={key} className="p-4 border border-gray-200 rounded-xl">
                     <div className="text-2xl font-bold text-center mb-2 uppercase">{key}</div>
                     <input 
                       type="number" 
                       value={val} 
                       onChange={(e) => setServiceConfig({...serviceConfig, [key]: parseFloat(e.target.value)})}
                       className="w-full text-center border border-gray-300 rounded p-2"
                     />
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'packages' && (
             <div>
               <h3 className="text-lg font-bold text-gray-900 mb-4">Leistungsbausteine</h3>
               <div className="space-y-3">
                 {workPackages.map((pkg, idx) => (
                   <div key={pkg.id} className="flex items-center space-x-3">
                     <input 
                       value={pkg.name} 
                       onChange={(e) => {
                         const nw = [...workPackages];
                         nw[idx].name = e.target.value;
                         setWorkPackages(nw);
                       }} 
                       className="flex-1 border border-gray-300 rounded p-2 text-sm"
                     />
                     <input 
                       type="number"
                       value={pkg.duration} 
                       onChange={(e) => {
                         const nw = [...workPackages];
                         nw[idx].duration = parseFloat(e.target.value);
                         setWorkPackages(nw);
                       }} 
                       className="w-20 border border-gray-300 rounded p-2 text-sm text-center"
                     />
                     <span className="text-sm text-gray-500">Std.</span>
                   </div>
                 ))}
                 <button onClick={handleAddPackage} className="flex items-center text-blue-600 text-sm font-medium mt-2"><Plus className="w-4 h-4 mr-1"/> Leistung hinzufügen</button>
               </div>
             </div>
           )}

           {activeTab === 'logs' && (
             <div>
               <h3 className="text-lg font-bold text-gray-900 mb-4">Systemprotokolle</h3>
               <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Zeit</th>
                        <th className="px-4 py-2">User</th>
                        <th className="px-4 py-2">Aktion</th>
                        <th className="px-4 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-500">{log.timestamp}</td>
                          <td className="px-4 py-2 font-medium">{log.user}</td>
                          <td className="px-4 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">{log.action}</span></td>
                          <td className="px-4 py-2 text-gray-600">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'tasks' | 'assets' | 'planning' | 'shopping' | 'admin' | 'reports' | 'protocols'>('tasks');
  const [data, setData] = useState<Entity[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>({ s: 2, m: 4, l: 8 });
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>(initialPackages);
  const [logs, setLogs] = useState<AuditLog[]>(generateAuditLogs());
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const generatedEntities = generateMockData();
    const allData = [...initialData, ...generatedEntities];
    setData(allData);
    setAssignments(generateMockAssignments(allData, initialTechnicians));
  }, []);

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const updateEntity = (updated: Entity) => {
     setData(data.map(e => e.id === updated.id ? updated : e));
  };

  const handleNavClick = (view: typeof currentView) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 text-slate-900">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex w-64 bg-slate-900 text-white flex-col flex-shrink-0 print:hidden">
        <div className="p-6 flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">MAkte</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setCurrentView('tasks')} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'tasks' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <CheckSquare className="w-5 h-5 mr-3" /> Aufgaben
          </button>
          <button onClick={() => setCurrentView('planning')} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'planning' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Calendar className="w-5 h-5 mr-3" /> Termine
          </button>
          <button onClick={() => setCurrentView('protocols')} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'protocols' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <ClipboardCheck className="w-5 h-5 mr-3" /> Protokolle
          </button>
          <button onClick={() => setCurrentView('assets')} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'assets' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Database className="w-5 h-5 mr-3" /> Assets
          </button>
          <button onClick={() => setCurrentView('shopping')} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'shopping' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <ShoppingCart className="w-5 h-5 mr-3" /> Einkauf
          </button>
          <button onClick={() => setCurrentView('reports')} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentView === 'reports' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BarChart3 className="w-5 h-5 mr-3" /> Reports
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="mb-4">
             <p className="text-xs text-slate-500 uppercase mb-1">Angemeldet als:</p>
             <p className="text-sm font-medium text-slate-300">{currentUser}</p>
           </div>
           <button onClick={() => setCurrentView('admin')} className={`flex items-center w-full px-4 py-2 rounded-lg transition-colors mb-2 ${currentView === 'admin' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
             <Settings className="w-5 h-5 mr-3" /> Admin
           </button>
           <button onClick={() => setCurrentUser(null)} className="flex items-center w-full px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors">
             <LogOut className="w-5 h-5 mr-3" /> Abmelden
           </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col md:hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">MAkte</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-8 h-8" /></button>
          </div>
          <nav className="flex-1 px-6 space-y-4 mt-4">
             {/* Mobile Nav Items */}
             <button onClick={() => handleNavClick('tasks')} className="text-xl font-medium block w-full text-left py-2">Aufgaben</button>
             <button onClick={() => handleNavClick('planning')} className="text-xl font-medium block w-full text-left py-2">Termine</button>
             <button onClick={() => handleNavClick('protocols')} className="text-xl font-medium block w-full text-left py-2">Protokolle</button>
             <button onClick={() => handleNavClick('assets')} className="text-xl font-medium block w-full text-left py-2">Assets</button>
             <button onClick={() => handleNavClick('shopping')} className="text-xl font-medium block w-full text-left py-2">Einkauf</button>
             <button onClick={() => handleNavClick('reports')} className="text-xl font-medium block w-full text-left py-2">Reports</button>
             <button onClick={() => handleNavClick('admin')} className="text-xl font-medium block w-full text-left py-2">Admin</button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0 print:hidden">
          <div className="flex items-center">
             <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mr-4 text-gray-600">
               <Menu className="w-6 h-6" />
             </button>
             <div className="flex items-center text-gray-500 text-sm">
               <span className="font-medium text-gray-900">DLT_ServiceUndAssetManager</span>
             </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="hidden md:flex items-center text-gray-500 hover:text-gray-900"><Truck className="w-4 h-4 mr-2"/> Device</button>
            <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-100 rounded-full"><History className="w-4 h-4" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden relative bg-gray-100">
          {currentView === 'tasks' && <div className="h-full overflow-y-auto"><TasksView data={data} technicians={technicians} assignments={assignments} /></div>}
          {currentView === 'protocols' && <div className="h-full overflow-y-auto"><ProtocolsView /></div>}
          {currentView === 'assets' && <AssetBrowser data={data} onUpdateEntity={updateEntity} />}
          {currentView === 'planning' && <PlanningView data={data} technicians={technicians} assignments={assignments} setAssignments={setAssignments} serviceConfig={serviceConfig} workPackages={workPackages} />}
          {currentView === 'shopping' && <div className="h-full overflow-y-auto"><ShoppingView data={data} assignments={assignments} /></div>}
          {currentView === 'admin' && <div className="h-full overflow-y-auto"><AdminView technicians={technicians} setTechnicians={setTechnicians} serviceConfig={serviceConfig} setServiceConfig={setServiceConfig} workPackages={workPackages} setWorkPackages={setWorkPackages} logs={logs} /></div>}
          {currentView === 'reports' && <div className="h-full overflow-y-auto"><ReportsView assignments={assignments} technicians={technicians} /></div>}
        </main>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
