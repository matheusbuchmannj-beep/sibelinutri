export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'patient';
  photoURL?: string;
}

export interface Patient {
  id: string;
  nutriId: string;
  name: string;
  whatsapp: string;
  email?: string;
  notes?: string;
  planId?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  nutriId: string;
  type: 'presencial' | 'online';
  whatsapp: string;
  date: string;
  time: string;
  duration: number;
  address?: string;
  mapLink?: string;
  meetingLink?: string;
  notes?: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  createdAt: string;
}

export interface Plan {
  id: string;
  nutriId: string;
  name: string;
  price: number;
  sessions: number;
  validityDays: number;
}

export interface WorkingHours {
  [key: string]: { active: boolean; start: string; end: string }[];
}

export interface Local {
  id: string;
  name: string;
  address: string;
  mapsLink: string;
}

export interface Alimento {
  id: string;
  nome: string;
  marca?: string;
  categoria: string;
  calorias: number;
  unidade: string;
  imagem?: string;
  carboidratos: number;
  proteinas: number;
  gorduras: number;
  fibra?: number;
}

export interface Disponibilidade {
  date: string;
  localId: string; // 'online' or actual local ID
  slots: string[];
}

export interface ItemRefeicao {
  alimentoId: string;
  nome: string;
  quantidade: string;
  obs?: string;
  imagem?: string;
  macros?: {
    cal: number;
    prot: number;
    carb: number;
    fat: number;
  };
}

export interface Refeicao {
  id: string;
  nome: string;
  itens: ItemRefeicao[];
}

export interface Dieta {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  titulo: string;
  objetivo: 'emagrecimento' | 'hipertrofia' | 'manutenção';
  caloriasTotais?: number;
  refeicoes: Refeicao[];
  dataCriacao: string;
}

export interface Plano {
  id: string;
  titulo: string;
  descricao: string;
  preco: string;
  duracao: string;
}

export interface Booking {
  id?: string;
  patientName: string;
  whatsapp: string;
  date: string;
  time: string;
  type: 'presencial' | 'online';
  localId?: string;
  planoId?: string;
  status: 'Pendente' | 'Confirmado' | 'Cancelado' | 'Lead WhatsApp';
  createdAt: string;
}

export interface Settings {
  brandName: string;
  crn: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  whatsappNumber: string;
  whatsappMessage: string;
  pixKey: string;
  bgUrl: string;
  personUrl: string;
  elementsUrl: string;
  primaryColor: string;
  address: string;
  // Landing page texts
  aboutTitle: string;
  aboutText: string;
  specialtiesTitle: string;
  plansTitle: string;
  plansSubtitle: string;
  allowedAdminEmails?: string[];
}
