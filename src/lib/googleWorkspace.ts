/**
 * Service to manage data using Firebase Firestore
 * Refactored from Google Workspace to provide cross-device synchronization
 */

import { Settings, Local, Booking, Alimento, Dieta, Plano } from '../types';
import { db, saveDocument, getCollection, subscribeToCollection, subscribeToDocument, OperationType, handleFirestoreError } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// Default values for initial setup
const DEFAULT_SETTINGS: Settings = {
  brandName: 'Sibeli Farias',
  crn: '10.2030/P',
  heroTitle: 'Nutrição que transforma hábitos',
  heroSubtitle: 'Descubra como o equilíbrio alimentar pode elevar sua performance e bem-estar.',
  heroButtonText: 'Agendar consulta',
  whatsappNumber: '5547984778043',
  whatsappMessage: 'Olá! Vi seu site e gostaria de agendar uma consulta para {data} às {hora}.',
  pixKey: '47984778043',
  bgUrl: 'https://images.unsplash.com/photo-1490818387583-1baba5e6382b?q=80&w=2000&auto=format&fit=crop',
  personUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1720&auto=format&fit=crop',
  elementsUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=500&auto=format&fit=crop',
  primaryColor: '#869471',
  address: 'Centro, Tubarão - SC',
  aboutTitle: 'Sobre mim',
  aboutText: 'Sou nutricionista apaixonada por ajudar pessoas a alcançarem seus objetivos através de uma alimentação consciente e prazerosa.',
  specialtiesTitle: 'Minhas Especialidades',
  plansTitle: 'Nossos Planos',
  plansSubtitle: 'Escolha a melhor opção para sua jornada'
};

const DEFAULT_LOCAIS: Local[] = [
  { id: 'online', name: 'Atendimento Online', address: 'Via Google Meet / WhatsApp', mapsLink: '' },
  { id: '2', name: 'Up2You Clinical', address: 'R. Jaraguá, 604 - América, Joinville - SC, 89204-650', mapsLink: 'https://maps.app.goo.gl/XWCy92EWcgtu5cRn7' },
  { id: '3', name: 'Ânima Movimento e Bem Estar', address: 'Rua: Tuiuti, 2295 - Aventureiro, Joinville - SC', mapsLink: 'https://maps.app.goo.gl/rzxfaE9X3kbccFu88' }
];

const DEFAULT_PLANOS: Plano[] = [
  { id: '1', titulo: 'Consulta Avulsa', descricao: 'Avaliação completa e plano inicial.', preco: 'R$ 250', duracao: '60 min' },
  { id: '2', titulo: 'Acompanhamento 3 Meses', descricao: '3 consultas + suporte via WhatsApp.', preco: 'R$ 600', duracao: 'Trimestral' }
];

// --- BUSINESS LOGIC ---

export const getAccessToken = async () => 'handled_by_firebase';

export async function fetchSettings(): Promise<Settings> {
  const docRef = doc(db, 'config', 'settings');
  try {
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { ...DEFAULT_SETTINGS, ...docSnap.data() } as Settings;
    } else {
      // Return defaults and attempt bootstrap (will fail but caught)
      setDoc(docRef, DEFAULT_SETTINGS).catch(e => console.warn('Bootstrap settings failed:', e));
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function fetchLocais(): Promise<Local[]> {
  try {
    const locais = await getCollection<Local>('locais');
    
    // Check if any default local is missing and add it if so
    let updated = false;
    for (const dl of DEFAULT_LOCAIS) {
      if (dl.id === 'online') continue;
      if (!locais.find(l => l.id === dl.id)) {
        await setDoc(doc(db, 'locais', dl.id), dl);
        locais.push(dl);
        updated = true;
      }
    }
    
    if (updated) {
      console.log('Bootstrapped missing default locations');
    }

    return locais.length > 0 ? locais : DEFAULT_LOCAIS;
  } catch (e) {
    console.error('Error fetching locais:', e);
    return DEFAULT_LOCAIS;
  }
}

export async function fetchHorarios(): Promise<Record<string, Record<string, string[]>>> {
  const docs = await getCollection<any>('horarios');
  const availability: Record<string, Record<string, string[]>> = {};
  
  docs.forEach(d => {
    const { date, localId, slots } = d;
    if (date && localId) {
      if (!availability[date]) availability[date] = {};
      availability[date][localId] = slots;
    }
  });
  
  return availability;
}

export async function fetchPlanos(): Promise<Plano[]> {
  try {
    const planos = await getCollection<Plano>('planos');
    if (planos.length === 0) {
      for (const p of DEFAULT_PLANOS) {
        setDoc(doc(db, 'planos', p.id), p).catch(() => {});
      }
      return DEFAULT_PLANOS;
    }
    return planos;
  } catch (e) {
    return DEFAULT_PLANOS;
  }
}

export async function fetchAlimentos(): Promise<Alimento[]> {
  return getCollection<Alimento>('alimentos');
}

export async function fetchDietas(): Promise<Dieta[]> {
  return getCollection<Dieta>('dietas');
}

export async function saveAgendamento(booking: Booking) {
  const id = booking.id || Math.random().toString(36).substr(2, 9);
  
  try {
    console.log('Salvando agendamento...', id);
    // Save the full booking
    await setDoc(doc(db, 'agendamentos', id), { ...booking, id });
    
    // Save the occupied slot
    const slotId = `${booking.date}_${booking.time}`;
    await setDoc(doc(db, 'slots_occupied', slotId), {
      date: booking.date,
      time: booking.time,
      status: booking.status,
      bookingId: id
    });

    console.log('Agendamento salvo com sucesso!');
    return { ok: true };
  } catch (error) {
    console.error('Erro ao salvar no Firestore (continuando para WhatsApp):', error);
    // We don't call handleFirestoreError here to avoid throwing and blocking the UI
    // The admin will still have the WhatsApp message as a record
    return { ok: false };
  }
}

export async function fetchAgendamentos(): Promise<Booking[]> {
  return getCollection<Booking>('agendamentos');
}

export async function updateAgendamento(booking: Booking) {
  if (!booking.id) return { ok: false };
  try {
    const docRef = doc(db, 'agendamentos', booking.id);
    await updateDoc(docRef, booking as any);
    
    // Also update slot status if it exists
    const slotId = `${booking.date}_${booking.time}`;
    const slotRef = doc(db, 'slots_occupied', slotId);
    try {
      const slotSnap = await getDoc(slotRef);
      if (slotSnap.exists() && slotSnap.data().bookingId === booking.id) {
        await updateDoc(slotRef, { status: booking.status });
      }
    } catch (e) {
      console.warn('Slot update failed:', e);
    }

    return { ok: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `agendamentos/${booking.id}`);
    return { ok: false };
  }
}

export async function deleteAgendamento(bookingId: string, date?: string, time?: string) {
  try {
    let bookingDate = date;
    let bookingTime = time;

    // If date/time not provided, try to fetch the booking first to get them
    if (!bookingDate || !bookingTime) {
      const snap = await getDoc(doc(db, 'agendamentos', bookingId));
      if (snap.exists()) {
        const data = snap.data();
        bookingDate = data.date;
        bookingTime = data.time;
      }
    }

    // Delete the booking
    await deleteDoc(doc(db, 'agendamentos', bookingId));
    
    // Delete the slot 
    if (bookingDate && bookingTime) {
      const slotId = `${bookingDate}_${bookingTime}`;
      try {
        const slotRef = doc(db, 'slots_occupied', slotId);
        const slotSnap = await getDoc(slotRef);
        // Only delete if it belongs to this booking
        if (slotSnap.exists() && slotSnap.data().bookingId === bookingId) {
          await deleteDoc(slotRef);
          console.log('Slot released:', slotId);
        }
      } catch (e) {
        console.warn('Slot delete failed:', e);
      }
    }

    return { ok: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `agendamentos/${bookingId}`);
    return { ok: false };
  }
}

export async function fetchOccupiedSlots(): Promise<any[]> {
  return getCollection<any>('slots_occupied');
}

// Replacement for updateSheetData to maintain compatibility
export async function updateSheetData(range: string, values: any[][]) {
  if (range.includes('Config')) {
    const settings: any = {};
    values.forEach(([k, v]) => settings[k] = v);
    return setDoc(doc(db, 'config', 'settings'), settings, { merge: true });
  }
  
  if (range.includes('Locais')) {
    const batch = writeBatch(db);
    for (const v of values) {
      if (v[0]) {
        const lRef = doc(db, 'locais', v[0]);
        batch.set(lRef, { id: v[0], name: v[1], address: v[2], mapsLink: v[3] });
      }
    }
    return batch.commit();
  }

  if (range.includes('Horarios')) {
    const batch = writeBatch(db);
    // Get current keys to identify what needs to be deleted if not in values
    // For simplicity, we'll just set what we have. 
    // To handle deletions, we'd need to know the full set of dates being managed.
    for (const [date, lid, slotsStr] of values) {
      if (date && lid) {
        const hId = `${date}_${lid}`;
        const hRef = doc(db, 'horarios', hId);
        const slots = slotsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        
        if (slots.length > 0) {
          batch.set(hRef, { 
            date, 
            localId: lid, 
            slots: slots
          });
        } else {
          batch.delete(hRef);
        }
      }
    }
    return batch.commit();
  }

  return { ok: true };
}

// Keep other functions as stubs or refactor as needed
export async function clearSheetData(range: string) { return { ok: true }; }
export async function appendSheetData(range: string, values: any[][]) { return { ok: true }; }
export async function confirmAgendamento(rowIndex: number, booking: any) { return { ok: true }; }
export async function saveDieta(dieta: Dieta) {
  const id = dieta.id || Math.random().toString(36).substr(2, 9);
  return setDoc(doc(db, 'dietas', id), { ...dieta, id });
}
